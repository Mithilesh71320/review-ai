'use client';

import { SignOutButton } from '@clerk/nextjs';
import { Show } from '@clerk/nextjs';
import Link from 'next/link';

export default function SignOutPage() {
  return (
    <>
      <Show when="signed-in" fallback={null}>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Sign out?</h1>
            <p className="text-slate-600 mb-8">Are you sure you want to sign out from your account?</p>
            <div className="flex gap-4 justify-center">
              <SignOutButton redirectUrl="/">
                <button className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">
                  Sign out
                </button>
              </SignOutButton>
              <Link href="/dashboard" className="inline-block bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </Show>

      <Show when="signed-out" fallback={null}>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Already signed out</h1>
            <p className="text-slate-600 mb-6">You are not currently signed in.</p>
            <Link href="/sign-in" className="inline-block bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800">
              Sign back in
            </Link>
          </div>
        </div>
      </Show>
    </>
  );
}
