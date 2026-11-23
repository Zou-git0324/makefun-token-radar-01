// heat.ts — radar-4 launch-heat score.
//
// A per-row launch-heat score, 0-100, pure and deterministic, computed from
// the snapshot's own figures plus the board's own distribution. Heat is a
// parallel signal: it never decides rank order (rank stays by implied value),
// it only flags which rows are running hot right now.
//
// Formula: heat = round(100 * (0.40*value + 0.35*growth + 0.25*youth))
//
// The three components, each 0..1:
//
// - value (weight 0.40): the row's implied value on a log10 scale across the
//   board: (log10(implied) - log10(boardMin)) / (log10(boardMax) - log10(boardMin)),
//   clamped 0..1. Value is the size of the prize — a bigger implied value
//   means a bigger token launch if it happens. Log scale because implied
//   values span roughly $0.6M to $527M, so a linear scale would crush
//   everything except the top few rows into near-zero.
// - growth (weight 0.35): the row's 7d change, clamped to -50..+100, then
//   normalized as (clamped + 50) / 150. Growth is compounding now — a
//   protocol whose TVL is climbing fast this week is nearer a launch
//   window than one that is flat or shrinking.
// - youth (weight 0.25): younger = hotter: 1 - min(age_days, 1460) / 1460.
//   Unknown age (null) scores a neutral 0.5. Youth matters because a young
//   protocol's token is nearer its launch window than a four-year-old one's;
//   the 1460-day (4-year) cap stops very old protocols from going negative.

export interface HeatRow {
  implied_value_usd: number;
  change_7d: number | null;
  age_days: number | null;
}

export interface HeatStats {
  minImplied: number;
  maxImplied: number;
}

export interface HeatResult {
  heat: number;
  parts: {
    value: number;
    growth: number;
    youth: number;
  };
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

export function heatFor(row: HeatRow, stats: HeatStats): HeatResult {
  // value: log10 position of this row's implied value within the board range.
  let value = 0;
  if (
    Number.isFinite(row.implied_value_usd) &&
    row.implied_value_usd > 0 &&
    Number.isFinite(stats.minImplied) &&
    stats.minImplied > 0 &&
    Number.isFinite(stats.maxImplied) &&
    stats.maxImplied > stats.minImplied
  ) {
    const lo = Math.log10(stats.minImplied);
    const hi = Math.log10(stats.maxImplied);
    value = clamp01((Math.log10(row.implied_value_usd) - lo) / (hi - lo));
  }

  // growth: 7d change clamped to -50..+100, then normalized to 0..1.
  let growth = (0 + 50) / 150; // neutral 0.3333 when change is unknown
  if (row.change_7d !== null && row.change_7d !== undefined && Number.isFinite(row.change_7d)) {
    const clamped = Math.min(100, Math.max(-50, row.change_7d));
    growth = (clamped + 50) / 150;
  }

  // youth: younger is hotter; unknown age is neutral 0.5.
  let youth = 0.5;
  if (row.age_days !== null && row.age_days !== undefined && Number.isFinite(row.age_days)) {
    youth = 1 - Math.min(row.age_days, 1460) / 1460;
  }

  const parts = {
    value: round4(value),
    growth: round4(growth),
    youth: round4(youth),
  };
  const heat = Math.round(100 * (0.4 * parts.value + 0.35 * parts.growth + 0.25 * parts.youth));
  return { heat: Math.min(100, Math.max(0, heat)), parts };
}
