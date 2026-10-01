import { describe, expect, it } from '@jest/globals';
import { csvCell, csvRow } from './csv.js';

describe('CSV serialization', () => {
  it('preserves commas, quotes, newlines, Unicode and empty cells', () => {
    expect(csvRow(['Design, "review"\nCafé', null, undefined, 12])).toBe(
      '"Design, ""review""\nCafé","","","12"',
    );
  });

  it.each([
    '=1+1',
    '+SUM(A1)',
    '-1+1',
    '@SUM(A1)',
    '  =1+1',
    '\ttext',
    '\rtext',
    '\ntext',
  ])('neutralizes spreadsheet formula/control prefix %j', (value) =>
    expect(csvCell(value)).toBe(`"'${value}"`),
  );
});
