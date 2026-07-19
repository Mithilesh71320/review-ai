/**
 * Dashboard visual system — industry-agnostic, blue-forward.
 * No green hues: positive / success states use blue shades as well.
 *
 * Slate neutrals → hierarchy
 * Blue scale     → brand, positive signals, charts, actions
 * Amber / red    → neutral / negative only
 */
export const dash = {
  // Neutrals
  ink: "#0F172A",
  inkSoft: "#1E293B",
  text: "#0F172A",
  textMuted: "#475569",
  textSoft: "#94A3B8",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  surfaceHover: "#F1F5F9",

  // Brand / primary blue scale
  primary: "#2563EB",
  primaryDeep: "#1D4ED8",
  primarySoft: "#EFF6FF",
  primaryMist: "#F8FAFF",
  primaryLight: "#3B82F6",
  primaryMuted: "#60A5FA",

  // Semantic — positive is blue (no green)
  positive: "#2563EB",
  positiveSoft: "#EFF6FF",
  neutral: "#D97706",
  neutralSoft: "#FFFBEB",
  negative: "#DC2626",
  negativeSoft: "#FEF2F2",

  // Rating stars (amber only)
  star: "#F59E0B",
  starMuted: "#E2E8F0",
} as const;

export const sentimentColors = {
  Positive: dash.primary,
  Neutral: dash.neutral,
  Negative: dash.negative,
} as const;
