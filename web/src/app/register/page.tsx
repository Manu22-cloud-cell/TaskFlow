'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { clientApi, getClientApiError } from '@/lib/client-api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await clientApi.post('/auth/register', { name, email, password });
      router.replace('/login');
    } catch (error) {
      setError(getClientApiError(error, 'Unable to create your account.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form
        className="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow-sm"
        onSubmit={register}
      >
        <div>
          <p className="text-sm font-medium text-indigo-600">TaskFlow</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            New accounts start as members. An admin can assign additional roles.
          </p>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input
            autoComplete="name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Password
          <input
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Confirm password
          <input
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>
        {error && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white disabled:bg-indigo-300"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            className="font-medium text-indigo-600 hover:text-indigo-800"
            href="/login"
          >
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
