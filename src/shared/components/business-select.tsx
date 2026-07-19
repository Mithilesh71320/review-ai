"use client";

import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManagedBusinessSummary } from "@/shared/types/settings";
import { cn } from "@/lib/utils";

type BusinessSelectProps = {
  businesses: ManagedBusinessSummary[] | undefined;
  value: string | null;
  onChange: (businessId: string | null) => void;
  className?: string;
  triggerClassName?: string;
  /** When true, uses the rounded teal dashboard style. */
  variant?: "default" | "pill";
};

export function BusinessSelect({
  businesses,
  value,
  onChange,
  className,
  triggerClassName,
  variant = "default",
}: BusinessSelectProps) {
  return (
    <Select
      value={value ?? "none"}
      onValueChange={(next) => onChange(next === "none" ? null : next)}
    >
      <SelectTrigger
        className={cn(
          variant === "pill"
            ? "h-10 w-56 rounded-full border-[#0D9488] text-[#0D9488]"
            : "w-[240px] bg-background/90",
          triggerClassName,
        )}
      >
        <SelectValue placeholder="Select business" />
        {variant === "pill" ? <ChevronDown className="ml-2 h-4 w-4" /> : null}
      </SelectTrigger>
      <SelectContent className={className}>
        {businesses?.length ? (
          businesses.map((business) => (
            <SelectItem key={business.id} value={business.id}>
              {business.name}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="none">No businesses added</SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
