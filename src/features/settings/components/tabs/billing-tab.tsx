"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BillingPlanCards } from "@/components/billing-plan-cards";
import { getBillingPlans } from "@/lib/billing-plans";
import type { SettingsResponse } from "@/shared/types/settings";

type BillingTabProps = {
  state: SettingsResponse;
  billingHref: string;
};

export function BillingTab({ state, billingHref }: BillingTabProps) {
  const billingPlans = getBillingPlans();

  return (
    <div className="space-y-6">
      <Card className="rounded-xl bg-gradient-to-br from-[#0D9488] to-[#134E4A] p-6 text-white">
        <h3 className="text-2xl" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>Billing</h3>
        <p className="text-lg opacity-90">Plans powered by Clerk Billing</p>
        <p className="mt-2 text-sm opacity-90">Paid plans only. Turn trial off in Clerk Dashboard for real payment-only checkout.</p>
        <Button className="mt-4 bg-white text-[#0D9488] hover:bg-[#F0FDF9]" asChild>
          <Link href={billingHref}>Open Billing</Link>
        </Button>
      </Card>
      <BillingPlanCards plans={billingPlans} ctaHref={billingHref} compact />
    </div>
  );
}