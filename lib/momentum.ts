// momentum.ts — radar-5 category-relative momentum.
//
// Round 6's heat rewards an absolute 7-day TVL change. A +30% week means
// something different in a category that is booming than in one that is
// flat. Momentum asks whether a protocol is outrunning its own category
// this week: the row's 7d change minus the median 7d change of its
// category, in percentage points. It is a parallel signal like heat: it
// never decides rank order (rank stays by implied value), it only flags
// which rows are beating their own kind.
//
// The category median comes from the snapshot's own numbers: every
// protocol in the category with a non-null 7d change, live tokens
// included. A category with fewer than 3 such protocols gets no median —
// thin evidence is no evidence — and its rows score a neutral 0.5, the
// same discipline calibration.ts uses for live-token pricing.
//
// Per row:
//   momentum_pp = clamp(change_7d - category median, -50, +50)
//   momentum    = (momentum_pp + 50) / 100, 0..1, rounded to 4 decimals
// A row with no 7d change of its own, or in a category with no median,
// scores momentum 0.5 and momentum_pp 0: exactly at the middle, not hot,
// not cold. The category median rides along as cat_median_7d (null when
// the category has none), so the dashboard can show the comparison.

export interface MomentumInput {
  change_7d: number | null;
  category: string | null;
}

export interface CategoryMomentum {
  category: string;
  count: number;
  median_7d: number | null;
}

export interface MomentumResult {
  momentum: number;
  momentum_pp: number;
  cat_median_7d: number | null;
}

export const MIN_FOR_MEDIAN = 3;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/**
 * One median per category, from every protocol in the snapshot that
 * reports a 7d change. Deterministic: medians of sorted numbers.
 */
export function buildCategoryMomentum(protocols: MomentumInput[]): Map<string, CategoryMomentum> {
  const byCategory = new Map<string, number[]>();
  for (const p of protocols) {
    if (p.change_7d === null || p.change_7d === undefined || !Number.isFinite(p.change_7d)) continue;
    const key = p.category ?? 'Uncategorised';
    const list = byCategory.get(key) ?? [];
    list.push(p.change_7d);
    byCategory.set(key, list);
  }
  const out = new Map<string, CategoryMomentum>();
  for (const [category, list] of byCategory) {
    const med = list.length >= MIN_FOR_MEDIAN ? median(list) : null;
    out.set(category, { category, count: list.length, median_7d: med === null ? null : round4(med) });
  }
  return out;
}

export function momentumFor(row: MomentumInput, medians: Map<string, CategoryMomentum>): MomentumResult {
  const key = row.category ?? 'Uncategorised';
  const entry = medians.get(key);
  const catMedian = entry === undefined ? null : entry.median_7d;
  if (catMedian === null || row.change_7d === null || row.change_7d === undefined || !Number.isFinite(row.change_7d)) {
    return { momentum: 0.5, momentum_pp: 0, cat_median_7d: catMedian };
  }
  const pp = Math.min(50, Math.max(-50, row.change_7d - catMedian));
  return { momentum: round4((pp + 50) / 100), momentum_pp: round2(pp), cat_median_7d: catMedian };
}
