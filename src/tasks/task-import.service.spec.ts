import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TaskImportService } from './task-import.service.js';

describe('TaskImportService', () => {
  const prisma = {
    projectMember: { findMany: jest.fn(), findUnique: jest.fn() },
    task: { aggregate: jest.fn(), create: jest.fn() },
    taskActivity: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  const access = { assertCanManageProject: jest.fn() };
  const realtime = {
    emitTaskEvent: jest.fn(),
    emitDesktopNotification: jest.fn(),
  };
  const requester = {
    sub: 1,
    role: 'MANAGER',
    email: 'manager@test.com',
  } as const;
  let service: TaskImportService;
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.projectMember.findMany.mockResolvedValue([
      { userId: 2, user: { email: 'member@test.com' } },
    ]);
    prisma.projectMember.findUnique.mockResolvedValue({ userId: 2 });
    prisma.task.aggregate.mockResolvedValue({ _max: { position: 3 } });
    prisma.task.create.mockResolvedValue({ id: 10 });
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );
    service = new TaskImportService(
      prisma as any,
      access as any,
      realtime as any,
    );
  });
  it('checks management access before parsing or querying', async () => {
    access.assertCanManageProject.mockRejectedValue(new Error('Forbidden'));
    await expect(service.preview(4, 'Title\nTask', requester)).rejects.toThrow(
      'Forbidden',
    );
    expect(prisma.projectMember.findMany).not.toHaveBeenCalled();
  });
  it('previews member email errors without writing tasks', async () => {
    const result = await service.preview(
      4,
      'Title,Assignee email\nTask,outsider@test.com',
      requester,
    );
    expect(result.valid).toBe(false);
    expect(result.rows[0].errors).toHaveLength(1);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('rejects invalid confirmation without writing any tasks', async () => {
    await expect(
      service.import(4, 'Title,Status\nTask,BAD', requester),
    ).rejects.toMatchObject({
      response: { message: ['Row 2: Invalid status.'] },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('appends tasks in one serializable transaction with activity and a single event', async () => {
    const result = await service.import(
      4,
      'Title,Assignee email\nFirst,MEMBER@test.com\nSecond,',
      requester,
    );
    expect(result.importedCount).toBe(2);
    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' }),
    );
    expect(prisma.task.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ position: 4, assignedToId: 2 }),
      }),
    );
    expect(prisma.task.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ position: 5 }),
      }),
    );
    expect(prisma.taskActivity.create).toHaveBeenCalledTimes(2);
    expect(realtime.emitTaskEvent).toHaveBeenCalledTimes(1);
  });
  it('emits nothing when a transaction fails', async () => {
    prisma.taskActivity.create.mockRejectedValue(new Error('Database failure'));
    await expect(service.import(4, 'Title\nTask', requester)).rejects.toThrow(
      'Database failure',
    );
    expect(realtime.emitTaskEvent).not.toHaveBeenCalled();
  });
  it('rechecks assignee membership during confirmation', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(null);
    await expect(
      service.import(
        4,
        'Title,Assignee email\nTask,member@test.com',
        requester,
      ),
    ).rejects.toThrow('no longer');
    expect(prisma.task.create).not.toHaveBeenCalled();
  });
});
