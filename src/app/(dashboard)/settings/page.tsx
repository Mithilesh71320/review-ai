"use client";

import { Suspense } from "react";
import { SettingsView } from "@/features/settings";

/** Route entry — keep thin. Feature logic lives in `src/features/settings`. */
export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-10 w-48 animate-pulse rounded-lg bg-[#E7E5E4]/60" />
          <div className="h-96 animate-pulse rounded-2xl bg-[#E7E5E4]/40" />
        </div>
      }
    >
      <SettingsView />
    </Suspense>
  );
}
