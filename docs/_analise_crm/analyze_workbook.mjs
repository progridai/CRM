import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:/Users/rodri/Downloads/Inadimplencia Unificada setembro 2026 (2).xlsx";
const outputDir = "C:/BRAVIDA/CRM/docs/_analise_crm/workbook_render";

await fs.mkdir(outputDir, { recursive: true });
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const sheets = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 20000,
});
console.log("### SHEETS");
console.log(sheets.ndjson);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table,definedName,drawing",
  maxChars: 30000,
  tableMaxRows: 8,
  tableMaxCols: 12,
  tableMaxCellChars: 120,
});
console.log("### OVERVIEW");
console.log(overview.ndjson);

for (const sheet of workbook.worksheets.items) {
  const used = sheet.getUsedRange();
  const address = used?.address ?? "A1";
  console.log(`### SHEET ${sheet.name} USED ${address}`);
  const region = await workbook.inspect({
    kind: "region,formula",
    sheetId: sheet.name,
    range: address,
    maxChars: 18000,
    tableMaxRows: 30,
    tableMaxCols: 30,
    tableMaxCellChars: 160,
    options: { maxResults: 200 },
  });
  console.log(region.ndjson);

  try {
    const preview = await workbook.render({
      sheetName: sheet.name,
      autoCrop: "all",
      scale: 1,
      format: "png",
    });
    const safeName = sheet.name.replace(/[\\/:*?"<>|]/g, "_");
    await fs.writeFile(
      `${outputDir}/${safeName}.png`,
      new Uint8Array(await preview.arrayBuffer()),
    );
  } catch (error) {
    console.error(`RENDER_ERROR ${sheet.name}: ${error?.message ?? error}`);
  }
}
