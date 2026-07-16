import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { type BillingPlan, formatPlanPrice } from "@/lib/billing-plans";
import { cn } from "@/lib/utils";

type BillingPlanCardsProps = {
  plans: BillingPlan[];
  ctaHref?: string;
  compact?: boolean;
};

export function BillingPlanCards({
  plans,
  ctaHref = "/billing",
  compact = false,
}: BillingPlanCardsProps) {
  return (
    <div className={cn("grid gap-4", compact ? "md:grid-cols-3" : "lg:grid-cols-3")}>
      {plans.map((plan) => (
        <Card
          key={plan.key}
          className={cn(
            "relative rounded-xl border-[#E7E5E4] bg-white p-6",
            plan.popular && "border-2 border-[#0D9488] shadow-lg shadow-[#0D9488]/10",
          )}
        >
          {plan.popular && (
            <Badge className="mb-3 border-0 bg-[#0D9488] text-white">Most Popular</Badge>
          )}
          <div className="space-y-2">
            <h3 className="text-xl text-[#1C1917]" style={{ fontFamily: "Playfair Display", fontWeight: 600 }}>
              {plan.name}
            </h3>
            <p className="min-h-10 text-sm text-[#78716C]">{plan.description}</p>
            <p className="text-3xl font-bold text-[#1C1917]">
              {formatPlanPrice(plan)}
              <span className="text-sm font-normal text-[#78716C]"> / {plan.period}</span>
            </p>
          </div>

          <div className="mt-5 space-y-2">
            {plan.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-[#1C1917]">
                <CheckCircle className="h-4 w-4 text-[#10B981]" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <Button
            className={cn(
              "mt-6 w-full",
              plan.popular
                ? "bg-[#0D9488] text-white hover:bg-[#134E4A]"
                : "border border-[#0D9488] bg-white text-[#0D9488] hover:bg-[#F0FDF9]",
            )}
            asChild
          >
            <Link href={ctaHref}>{plan.cta}</Link>
          </Button>
        </Card>
      ))}
    </div>
  );
}

