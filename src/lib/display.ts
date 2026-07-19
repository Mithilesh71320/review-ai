export function getInitials(name: string | null | undefined) {
  const clean = name?.trim();

  if (!clean) {
    return "U";
  }

  const parts = clean.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export function buildReturnTo(pathname: string, search = "") {
  const target = `${pathname}${search}`;
  return `/billing?returnTo=${encodeURIComponent(target || "/dashboard")}`;
}
