"use client";

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { SettingsResponse } from "@/shared/types/settings";

type NotificationsTabProps = {
  state: SettingsResponse;
  updateState: (updater: (current: SettingsResponse) => SettingsResponse) => void;
};

const notificationOptions = [
  ["emailNotifications", "New review notifications", "Get notified when you receive a new review"],
  ["pushNotifications", "Negative review alerts", "Immediate notification for 1-2 star reviews"],
  ["smsNotifications", "Rating drop alerts", "Alert when your rating decreases"],
  ["weeklyDigest", "Weekly summary", "Receive a weekly digest of your review activity"],
] as const;

export function NotificationsTab({ state, updateState }: NotificationsTabProps) {
  return (
    <Card className="rounded-xl border-[#E7E5E4] bg-white p-6">
      <div className="space-y-4">
        {notificationOptions.map(([key, label, description]) => (
          <div key={key} className="flex items-center justify-between border-b border-[#E7E5E4] py-3 last:border-0">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-[#78716C]">{description}</p>
            </div>
            <Switch
              checked={state.notifications[key as keyof SettingsResponse["notifications"]]}
              onCheckedChange={(checked) =>
                updateState((current) => ({ ...current, notifications: { ...current.notifications, [key]: checked } }))
              }
            />
          </div>
        ))}
      </div>
    </Card>
  );
}