"use client";

type PaidPlanBannerProps = {
  message?: string;
};

export function PaidPlanBanner({
  message = "Paid subscription required to sync reviews and use AI tools. Open Billing to continue.",
}: PaidPlanBannerProps) {
  return (
    <div className="rounded-lg border border-[#D97706]/40 bg-[#FEF3C7]/30 px-4 py-3 text-sm text-[#1C1917]">
      {message}
    </div>
  );
}
