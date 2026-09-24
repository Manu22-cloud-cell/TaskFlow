export type UserRole = 'ADMIN' | 'MANAGER' | 'MEMBER';
export type User = { id: number; name: string; email: string; role: UserRole };
export type UserSummary = Pick<User, 'id' | 'name' | 'email'>;
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type Project = {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
  owner: Pick<User, 'id' | 'name' | 'email'>;
};

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  projectId: number;
  assignedToId: number | null;
  position: number;
  assignee: Pick<User, 'id' | 'name' | 'email'> | null;
};

export type PaginatedTasks = {
  data: Task[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedProjects = {
  data: Project[];
  meta: PaginationMeta;
};

export type PaginatedUsers = {
  data: User[];
  meta: PaginationMeta;
};

export type CursorPageMeta = {
  limit: number;
  nextCursor: number | null;
  hasNextPage: boolean;
};

export type CursorPage<T> = {
  data: T[];
  meta: CursorPageMeta;
};

export type ProjectMember = {
  id: number;
  role: 'MANAGER' | 'MEMBER';
  user: Pick<User, 'id' | 'name' | 'email'>;
};

export type Comment = {
  id: number;
  content: string;
  taskId: number;
  authorId: number;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'name' | 'email'>;
};

export type TaskActivityType =
  | 'TASK_CREATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'DUE_DATE_CHANGED'
  | 'COMMENT_ADDED';

export type TaskActivity = {
  id: number;
  taskId: number;
  actorId: number;
  type: TaskActivityType;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: Pick<User, 'id' | 'name' | 'email'>;
};

export type PaginatedComments = CursorPage<Comment>;
export type PaginatedTaskActivity = CursorPage<TaskActivity>;
