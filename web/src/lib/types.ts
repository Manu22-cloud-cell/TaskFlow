export type UserRole = 'ADMIN' | 'MANAGER' | 'MEMBER';
export type User = { id: number; name: string; email: string; role: UserRole };
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
