import { describe, expect, it } from '@jest/globals';
import { parseCsv, parseTaskCsv } from './task-csv.js';

describe('Task CSV parsing', () => {
  it('reads BOM, escaped quotes, commas, multiline fields and CRLF', () => {
    expect(
      parseCsv(
        '\uFEFFTitle,Description\r\n"Café, review","Say ""hello""\nnext line"\r\n',
      ),
    ).toEqual([
      ['Title', 'Description'],
      ['Café, review', 'Say "hello"\nnext line'],
    ]);
  });
  it.each(['Title\n"unclosed', 'Title\n"closed"junk', 'Title\nun"quoted'])(
    'rejects malformed quoting %s',
    (csv) => {
      expect(() => parseTaskCsv(csv)).toThrow();
    },
  );
  it.each(['Name\nTask', 'Title,Title\nx,y', 'Title,Unknown\nx,y', 'Title\n'])(
    'rejects invalid headers or empty imports',
    (csv) => {
      expect(() => parseTaskCsv(csv)).toThrow();
    },
  );
  it('defaults optional fields and ignores Task IDs', () => {
    expect(parseTaskCsv('Task ID,Title\n99,New task')[0]).toEqual(
      expect.objectContaining({
        title: 'New task',
        status: 'TODO',
        priority: 'MEDIUM',
        errors: [],
      }),
    );
  });
  it('reports invalid title, enum, calendar date and column counts', () => {
    const rows = parseTaskCsv(
      'Title,Status,Priority,Due date\n,NOPE,URGENT,2026-02-30\nTask,TODO',
    );
    expect(rows[0].errors).toHaveLength(4);
    expect(rows[1].errors).toContain('Column count does not match the header.');
  });
  it('enforces byte and row limits', () => {
    expect(() => parseTaskCsv('Title\n' + 'é'.repeat(30_000))).toThrow('50 KB');
    expect(() => parseTaskCsv('Title\n' + 'Task\n'.repeat(101))).toThrow('100');
  });
});
