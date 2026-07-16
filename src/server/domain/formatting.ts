/** Pure string / display helpers used by monitoring services. */

export function prettyEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatStorefrontAddress(
  address:
    | {
        addressLines?: string[];
        locality?: string;
        administrativeArea?: string;
        postalCode?: string;
      }
    | undefined,
) {
  if (!address) {
    return null;
  }

  const parts = [
    ...(address.addressLines ?? []),
    address.locality,
    address.administrativeArea,
    address.postalCode,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}
