import * as React from "react";

type ChartTheme = {
  primary: string;
  primary80: string;
  primary55: string;
  muted: string;
  muted55: string;
  grid: string;
  amber: string;
  red: string;
  green: string;
  lavender: string;
};

function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = window.getComputedStyle(document.documentElement).getPropertyValue(name);
  const out = (v || "").trim();
  return out || fallback;
}

function readTheme(): ChartTheme {
  // Source of truth: src/index.css (variables --recharts-*)
  return {
    primary: readCssVar("--recharts-primary", "#2563FF"),
    primary80: readCssVar("--recharts-primary-80", "#2563FFCC"),
    primary55: readCssVar("--recharts-primary-55", "#2563FF8C"),
    muted: readCssVar("--recharts-muted", "#94A3B8"),
    muted55: readCssVar("--recharts-muted-55", "#94A3B88C"),
    grid: readCssVar("--recharts-grid", "#E2E8F0"),
    amber: readCssVar("--recharts-amber", "#F59E0B"),
    red: readCssVar("--recharts-red", "#EF4444"),
    green: readCssVar("--recharts-green", "#22C55E"),
    lavender: readCssVar("--recharts-lavender", "#818CF8"),
  };
}

/**
 * Recharts theme tokens (CSS variables).
 * Auto-updates on theme class change (light/dark).
 */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = React.useState<ChartTheme>(() => readTheme());

  React.useEffect(() => {
    const refresh = () => setTheme(readTheme());
    refresh();

    const obs = new MutationObserver(() => refresh());
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    // If tokens are swapped by other means (e.g. hot reload), refresh once.
    const t = window.setTimeout(refresh, 0);
    return () => {
      window.clearTimeout(t);
      obs.disconnect();
    };
  }, []);

  return theme;
}

