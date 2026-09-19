import { AppShell } from '@/features/auth/components/app-shell';

export default function TasksLayout({ children }: LayoutProps<'/tasks'>) {
  return <AppShell>{children}</AppShell>;
}
