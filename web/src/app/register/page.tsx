'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientApiError } from '@/lib/client-api';
import { register as registerUser } from '@/services/client/auth.service';

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
      await registerUser({ name, email, password });
      router.replace('/login');
    } catch (error) {
      setError(getClientApiError(error, 'Unable to create your account.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-page flex min-h-screen items-center justify-center p-5">
      <form
        className="panel w-full max-w-md space-y-5 p-7 sm:p-9"
        onSubmit={register}
      >
        <div>
          <p className="page-kicker">Get started</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
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
            className="form-control mt-1.5"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Email
          <input
            autoComplete="email"
            className="form-control mt-1.5"
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
            className="form-control mt-1.5"
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
            className="form-control mt-1.5"
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
          className="button-primary w-full"
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
