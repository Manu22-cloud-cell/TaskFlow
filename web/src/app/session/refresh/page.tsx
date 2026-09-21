import { RefreshSession } from '@/features/auth/components/refresh-session';

export default async function RefreshSessionPage({
  searchParams,
}: PageProps<'/session/refresh'>) {
  const { returnTo } = await searchParams;

  return (
    <RefreshSession
      returnTo={typeof returnTo === 'string' ? returnTo : undefined}
    />
  );
}
