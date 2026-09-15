'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { message?: string | string[] };
      if (!response.ok) {
        setError(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : (data.message ?? 'Unable to sign in'),
        );
        return;
      }
      router.replace('/projects');
      router.refresh();
    } catch {
      setError('Unable to connect to TaskFlow. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form
        className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-sm"
        onSubmit={submit}
      >
        <div>
          <p className="text-sm font-medium text-indigo-600">TaskFlow</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Sign in to your workspace
          </h1>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p
            className="rounded-md bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <button
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white disabled:bg-indigo-300"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
