// Quote every cell so commas, quotes and multiline text remain in one field.
// Prefix spreadsheet formulas with an apostrophe so user text stays literal.
export function csvCell(value: string | number | null | undefined): string {
  let text = String(value ?? '');

  if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvCell).join(',');
}
