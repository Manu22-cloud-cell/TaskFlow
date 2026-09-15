import { NextRequest, NextResponse } from 'next/server';

import { ACCESS_TOKEN_COOKIE } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: RouteContext<'/api/tasks/[taskId]/comments/[commentId]'>,
) {
  const { taskId, commentId } = await context.params;

  return forwardCommentRequest(
    request,
    taskId,
    commentId,
    'PATCH',
    await request.json(),
  );
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<'/api/tasks/[taskId]/comments/[commentId]'>,
) {
  const { taskId, commentId } = await context.params;

  return forwardCommentRequest(request, taskId, commentId, 'DELETE');
}

async function forwardCommentRequest(
  request: NextRequest,
  taskId: string,
  commentId: string,
  method: 'PATCH' | 'DELETE',
  body?: unknown,
) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return NextResponse.json(
      { message: 'Access token is required' },
      { status: 401 },
    );
  }

  const response = await fetch(
    `${process.env.TASKFLOW_API_URL}/tasks/${taskId}/comments/${commentId}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = await response.json();

  return NextResponse.json(data, { status: response.status });
}
