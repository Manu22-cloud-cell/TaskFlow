export type RealtimeEventPayload = {
  actorId?: number;
  userId?: number;
  projectName?: string;
};

export function getRealtimeNotificationMessage(
  event: string,
  payload: RealtimeEventPayload,
  currentUserId: number,
) {
  const messages: Record<string, string> = {
    'task.created': 'A new task was created.',
    'task.updated': 'A task was updated.',
    'task.moved': 'A task was moved.',
    'task.deleted': 'A task was deleted.',
    'comment.created': 'A new comment was added.',
    'comment.updated': 'A comment was updated.',
    'comment.deleted': 'A comment was deleted.',
    'project.updated': 'Project settings were updated.',
    'project.deleted': 'This project was deleted.',
  };

  if (event === 'project.member.added') {
    return payload.userId === currentUserId
      ? `You were added to ${payload.projectName ?? 'a project'}.`
      : `A member was added to ${payload.projectName ?? 'the project'}.`;
  }

  if (event === 'project.member.updated') {
    return payload.userId === currentUserId
      ? `Your role in ${payload.projectName ?? 'a project'} was updated.`
      : `A member role was updated in ${payload.projectName ?? 'the project'}.`;
  }

  if (event === 'project.member.removed') {
    return payload.userId === currentUserId
      ? `You no longer have access to ${payload.projectName ?? 'this project'}.`
      : `A member was removed from ${payload.projectName ?? 'the project'}.`;
  }

  return messages[event] ?? 'Project data was updated.';
}
