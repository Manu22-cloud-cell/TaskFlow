'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { clientApi, getClientApiError } from '@/lib/client-api';

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
      await clientApi.post('/auth/login', { email, password });
      router.replace('/projects');
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to sign in.'));
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
          <p className="mt-2 text-sm text-slate-600">
            New to TaskFlow?{' '}
            <Link
              className="font-medium text-indigo-600 hover:text-indigo-800"
              href="/register"
            >
              Create an account
            </Link>
          </p>
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
