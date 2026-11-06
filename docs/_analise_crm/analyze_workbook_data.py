from collections import Counter, defaultdict
from datetime import datetime
from openpyxl import load_workbook

PATH = r"C:\Users\rodri\Downloads\Inadimplencia Unificada setembro 2026 (2).xlsx"

wb = load_workbook(PATH, read_only=True, data_only=True)
ws = wb["Base de Cobrança"]
headers = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
index = {str(value).strip(): pos for pos, value in enumerate(headers) if value is not None}

rows = []
for row in ws.iter_rows(min_row=2, values_only=True):
    if not any(value not in (None, "") for value in row[:24]):
        continue
    rows.append(row)

def value(row, column):
    pos = index.get(column)
    return row[pos] if pos is not None and pos < len(row) else None

def clean_text(raw):
    return str(raw).strip() if raw not in (None, "") else "(vazio)"

def numeric(raw):
    return float(raw) if isinstance(raw, (int, float)) else 0.0

print("HEADERS", headers[:24])
print("ROWS", len(rows))

for column in [
    "Cobrador", "SITUAÇÃO", "Meio Contato", "Forma de pagamento",
    "Situação2", "REPASSE ", "Estipulante",
]:
    counts = Counter(clean_text(value(row, column)) for row in rows)
    print(f"UNIQUE {column} {len(counts)}")
    for label, count in counts.most_common(30):
        print(f"  {label}: {count}")

for column in [
    "Competência", "Telefone", "Cobrador", "Data Contato", "Meio Contato",
    "Qtd Contatos", "Forma de pagamento", "Situação2", "Data Pagamento",
    "Valor Recuperado", "Limite para cobrança", "OBSERVAÇÃO COBRANÇA (COBRADORA)",
    "REPASSE ", "OBSERVAÇÃO OPERACIONAL (FATURISTA)",
]:
    missing = sum(1 for row in rows if value(row, column) in (None, ""))
    print(f"MISSING {column}: {missing}/{len(rows)} ({missing/len(rows):.1%})")

competences = [clean_text(value(row, "Competência")) for row in rows]
multi_comp = sum(1 for item in competences if any(token in item.upper() for token in [" E ", ",", " A "]))
odd_comp = sum(1 for item in competences if item != "(vazio)" and "/" not in item)
print("COMPETENCE multi", multi_comp, "without_slash", odd_comp)

phone_values = [clean_text(value(row, "Telefone")) for row in rows]
phone_missing = sum(1 for item in phone_values if item == "(vazio)")
phone_multiple_or_notes = sum(1 for item in phone_values if item != "(vazio)" and any(token in item.lower() for token in ["/", "assertiva", "filha", "whats", "banco"]))
print("PHONE missing", phone_missing, "multiple_or_notes", phone_multiple_or_notes)

total_premium = sum(numeric(value(row, "Prêmio")) for row in rows)
total_recovered = sum(numeric(value(row, "Valor Recuperado")) for row in rows)
paid_rows = [row for row in rows if clean_text(value(row, "Situação2")).casefold() == "pago"]
print("TOTAL premium", round(total_premium, 2))
print("TOTAL recovered", round(total_recovered, 2))
print("TOTAL paid_rows", len(paid_rows))

recovered_without_payment_date = sum(
    1 for row in rows
    if numeric(value(row, "Valor Recuperado")) != 0 and value(row, "Data Pagamento") in (None, "")
)
recovered_not_paid_status = sum(
    1 for row in rows
    if numeric(value(row, "Valor Recuperado")) != 0 and clean_text(value(row, "Situação2")).casefold() != "pago"
)
print("QUALITY recovered_without_payment_date", recovered_without_payment_date)
print("QUALITY recovered_not_paid_status", recovered_not_paid_status)

by_operator = defaultdict(lambda: [0, 0.0, 0.0, 0, 0])
for row in rows:
    operator = clean_text(value(row, "Cobrador"))
    rec = by_operator[operator]
    rec[0] += 1
    rec[1] += numeric(value(row, "Prêmio"))
    rec[2] += numeric(value(row, "Valor Recuperado"))
    rec[3] += int(numeric(value(row, "Qtd Contatos")))
    rec[4] += clean_text(value(row, "Situação2")).casefold() == "pago"
for operator, rec in sorted(by_operator.items()):
    print("OPERATOR", operator, "rows", rec[0], "premium", round(rec[1], 2), "recovered", round(rec[2], 2), "contacts", rec[3], "paid", rec[4])

# Repeated records are not automatically errors, but help distinguish customer, policy and competence grain.
for key_columns in [
    ("CPF",),
    ("CPF", "Apólice"),
    ("CPF", "Apólice", "Competência"),
]:
    counter = Counter(
        tuple(clean_text(value(row, column)) for column in key_columns)
        for row in rows
        if clean_text(value(row, key_columns[0])) != "(vazio)"
    )
    repeated_keys = sum(1 for count in counter.values() if count > 1)
    repeated_rows = sum(count for count in counter.values() if count > 1)
    print("REPEATED", "+".join(key_columns), "keys", repeated_keys, "rows", repeated_rows)

