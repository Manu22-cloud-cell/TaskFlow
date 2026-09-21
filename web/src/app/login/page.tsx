'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientApiError } from '@/lib/client-api';
import { login } from '@/services/client/auth.service';

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
      await login({ email, password });
      router.replace('/projects');
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to sign in.'));
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="app-page flex min-h-screen items-center justify-center p-5">
      <form
        className="panel w-full max-w-md space-y-6 p-7 sm:p-9"
        onSubmit={submit}
      >
        <div>
          <p className="page-kicker">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
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
            className="form-control mt-1.5"
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
            className="form-control mt-1.5"
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
          className="button-primary w-full"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
