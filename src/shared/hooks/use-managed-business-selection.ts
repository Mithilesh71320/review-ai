"use client";

import { useMemo, useState } from "react";
import type { ManagedBusinessSummary } from "@/shared/types/settings";

/**
 * Shared multi-business selector used by Dashboard, Reviews, and Alerts.
 * Defaults to the first managed business when none is chosen explicitly.
 */
export function useManagedBusinessSelection(
  businesses: ManagedBusinessSummary[] | undefined,
) {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const effectiveBusinessId = selectedBusinessId ?? businesses?.[0]?.id ?? null;

  const selectedBusiness = useMemo(() => {
    if (!businesses?.length) return undefined;
    return (
      businesses.find((business) => business.id === effectiveBusinessId) ?? businesses[0]
    );
  }, [businesses, effectiveBusinessId]);

  return {
    selectedBusinessId,
    setSelectedBusinessId,
    effectiveBusinessId,
    selectedBusiness,
  };
}
