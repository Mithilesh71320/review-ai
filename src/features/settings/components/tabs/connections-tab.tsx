"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SettingsResponse } from "@/shared/types/settings";

type ConnectionsTabProps = {
  state: SettingsResponse;
};

export function ConnectionsTab({ state }: ConnectionsTabProps) {
  return (
    <div className="space-y-4">
      {state.sources.map((source) => (
        <Card key={source.key} className="rounded-xl border-[#E7E5E4] bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#4285F4]/10">
                <div className="h-6 w-6 rounded bg-[#4285F4]" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{source.source}</h3>
                <p className="text-sm text-[#78716C]">
                  {source.connected ? <span className="text-[#10B981]">Connected - Syncing</span> : "Not connected"}
                </p>
              </div>
            </div>
            <Button
              variant={source.connected ? "outline" : "default"}
              className={!source.connected ? "bg-[#0D9488] text-white hover:bg-[#134E4A]" : ""}
            >
              {source.connected ? "Disconnect" : "Coming Soon"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}