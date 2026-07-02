'use client'

import { useActionState } from 'react'
import { signIn, type LoginState } from './actions'

const initialState: LoginState = { error: null }

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState)

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@agency.com"
          className="w-full rounded-lg border border-border-blue bg-light-blue px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full rounded-lg border border-border-blue bg-light-blue px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/10"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-dark active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}
