import { SignIn } from "@clerk/nextjs";
import { Show } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <>
      <Show when="signed-out" fallback={null}>
        <SignIn routing="path" path="/sign-in" />
      </Show>

      <Show when="signed-in" fallback={null}>
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Already signed in</h1>
            <p className="text-slate-600 mb-6">You are already signed in. Head to your dashboard.</p>
            <Link href="/dashboard" className="inline-block bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </Show>
    </>
  );
}
