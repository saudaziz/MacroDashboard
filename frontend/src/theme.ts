export const COLORS = {
  bg: "#080c14",
  surface: "#0d1420",
  surfaceAlt: "#111827",
  border: "#1e2d45",
  amber: "#f59e0b",
  amberDim: "#92400e",
  red: "#ef4444",
  redDim: "#7f1d1d",
  orange: "#f97316",
  green: "#10b981",
  cyan: "#06b6d4",
  text: "#e2e8f0",
  muted: "#64748b",
  ghost: "#1e293b",
};

export const riskColor = (level: string) => {
  const l = level.toUpperCase();
  if (l.includes("DISTRESSED") || l.includes("CRITICAL")) return COLORS.red;
  if (l.includes("HIGH ALERT") || l.includes("WARNING")) return COLORS.orange;
  if (l.includes("WATCH") || l.includes("ELEVATED")) return COLORS.amber;
  return COLORS.green;
};
