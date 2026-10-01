import { BadRequestException } from '@nestjs/common';
import { isISO8601 } from 'class-validator';
import { TaskPriority, TaskStatus } from '../generated/prisma/enums.js';

// Small, strict CSV reader supporting quoted fields, escaped quotes and CRLF.
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  let closed = false;

  const finishField = () => {
    row.push(value);
    value = '';
    closed = false;
  };
  const finishRow = () => {
    finishField();
    if (row.some((cell) => cell.trim())) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else value += char;
    } else if (char === ',') finishField();
    else if (char === '\r' || char === '\n') {
      finishRow();
      if (char === '\r' && text[i + 1] === '\n') i++;
    } else if (char === '"' && value === '' && !closed) quoted = true;
    else {
      if (closed || char === '"')
        throw new BadRequestException('Malformed CSV quoting.');
      value += char;
    }
  }
  if (quoted)
    throw new BadRequestException('CSV contains an unclosed quoted field.');
  finishRow();
  return rows;
}

export function parseTaskCsv(csv: string) {
  if (Buffer.byteLength(csv, 'utf8') > 50_000)
    throw new BadRequestException('CSV must be at most 50 KB.');
  const [headers, ...records] = parseCsv(csv);
  const allowed = [
    'task id',
    'title',
    'description',
    'status',
    'priority',
    'assignee email',
    'due date',
  ];
  const names = headers?.map((header) => header.trim().toLowerCase()) ?? [];
  if (
    !names.includes('title') ||
    new Set(names).size !== names.length ||
    names.some((name) => !allowed.includes(name))
  ) {
    throw new BadRequestException(
      'CSV requires a Title header. Supported headers: Task ID, Title, Description, Status, Priority, Assignee email, Due date. Duplicate or unknown headers are not allowed.',
    );
  }
  if (!records.length || records.length > 100)
    throw new BadRequestException('Import between 1 and 100 tasks at a time.');

  return records.map((cells, index) => {
    const errors: string[] = [];
    const get = (key: string) => cells[names.indexOf(key)] ?? '';
    const title = get('title').trim();
    const description = get('description');
    const status = get('status').trim() || TaskStatus.TODO;
    const priority = get('priority').trim() || TaskPriority.MEDIUM;
    const assigneeEmail = get('assignee email').trim();
    const dueDate = get('due date').trim();
    if (cells.length !== names.length)
      errors.push('Column count does not match the header.');
    if (!title) errors.push('Title is required.');
    if (!Object.values(TaskStatus).includes(status as TaskStatus))
      errors.push('Invalid status.');
    if (!Object.values(TaskPriority).includes(priority as TaskPriority))
      errors.push('Invalid priority.');
    if (
      dueDate &&
      (!isISO8601(dueDate, { strict: true }) ||
        !Number.isFinite(Date.parse(dueDate)))
    )
      errors.push(
        'Due date must be a valid ISO date (YYYY-MM-DD or timestamp).',
      );
    return {
      row: index + 2,
      title,
      description,
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      assigneeEmail,
      dueDate,
      errors,
    };
  });
}
