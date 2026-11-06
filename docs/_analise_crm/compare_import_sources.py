from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook


CURRENT = Path(r"C:\Users\rodri\Downloads\INADIMPLENCIA FAEC - AGOSTO 2026.xlsx")
DANIELE = Path(r"C:\Users\rodri\Downloads\Inadimplencia Unificada setembro 2026 (2).xlsx")


def norm(value: object) -> str:
    text = "" if value is None else str(value)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^A-Z0-9]+", "", text.upper())


def serial(value: object) -> object:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def read_sheet(path: Path, sheet_name: str):
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet_name]
    header = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
    keys = [norm(value) for value in header]
    rows = []
    for values in ws.iter_rows(min_row=2, values_only=True):
        if not any(value not in (None, "") for value in values):
            continue
        rows.append({key: value for key, value in zip(keys, values) if key})
    return header, rows


def nonblank(rows, key: str) -> int:
    return sum(row.get(key) not in (None, "") for row in rows)


def top_values(rows, key: str, limit: int = 12):
    counts = Counter(str(row.get(key)).strip() for row in rows if row.get(key) not in (None, ""))
    return counts.most_common(limit)


def duplicate_summary(rows, fields):
    keys = [tuple(norm(row.get(field)) for field in fields) for row in rows]
    keys = [key for key in keys if all(key)]
    counts = Counter(keys)
    return {
        "valid_keys": len(keys),
        "distinct_keys": len(counts),
        "duplicate_key_groups": sum(count > 1 for count in counts.values()),
        "rows_in_duplicate_groups": sum(count for count in counts.values() if count > 1),
    }


def main():
    current_header, current_rows = read_sheet(CURRENT, "POR APÓLICE")
    daniele_header, daniele_rows = read_sheet(DANIELE, "Base de Cobrança")

    current_fields = {norm(value) for value in current_header if value is not None}
    daniele_fields = {norm(value) for value in daniele_header if value is not None}

    faec_rows = [row for row in daniele_rows if "FAEC" in norm(row.get("ESTIPULANTE"))]

    current_keys = {
        (norm(row.get("CPF")), norm(row.get("MATRICULA")))
        for row in current_rows
        if norm(row.get("CPF")) and norm(row.get("MATRICULA"))
    }
    daniele_faec_keys = {
        (norm(row.get("CPF")), norm(row.get("MATRICULA")))
        for row in faec_rows
        if norm(row.get("CPF")) and norm(row.get("MATRICULA"))
    }

    result = {
        "current": {
            "headers": current_header,
            "rows": len(current_rows),
            "nonblank": {key: nonblank(current_rows, key) for key in sorted(current_fields)},
            "year_values": top_values(current_rows, "ANO"),
            "competence_values": top_values(current_rows, "COMPETENCIA"),
            "situation_values": top_values(current_rows, "SITUACAO"),
            "collector_values": top_values(current_rows, "COBRADOR"),
            "duplicate_cpf_matricula": duplicate_summary(current_rows, ["CPF", "MATRICULA"]),
            "duplicate_full_business_key": duplicate_summary(
                current_rows, ["CPF", "MATRICULA", "ESTIPULANTE", "ANO", "COMPETENCIA"]
            ),
        },
        "daniele": {
            "headers": daniele_header,
            "rows": len(daniele_rows),
            "extra_fields_vs_current": sorted(daniele_fields - current_fields),
            "faec_rows": len(faec_rows),
            "faec_nonblank_relevant": {
                key: nonblank(faec_rows, key)
                for key in [
                    "DATALIBERACAO",
                    "COMPETENCIA",
                    "APOLICE",
                    "SITUACAO",
                    "SITUACAO2",
                    "FORMAPAGAMENTO",
                    "DATAPAGAMENTO",
                    "VALORRECUPERADO",
                    "DIASDECOBRANCA",
                    "LIMITECOBRANCA",
                    "REPASSE",
                ]
            },
            "faec_situation_values": top_values(faec_rows, "SITUACAO"),
            "faec_situation2_values": top_values(faec_rows, "SITUACAO2"),
            "faec_competence_values": top_values(faec_rows, "COMPETENCIA"),
            "faec_duplicate_cpf_matricula": duplicate_summary(faec_rows, ["CPF", "MATRICULA"]),
        },
        "overlap": {
            "current_distinct_cpf_matricula": len(current_keys),
            "daniele_faec_distinct_cpf_matricula": len(daniele_faec_keys),
            "shared_distinct_cpf_matricula": len(current_keys & daniele_faec_keys),
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2, default=serial))


if __name__ == "__main__":
    main()
