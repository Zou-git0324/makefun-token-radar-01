// Token Radar, model "radar-3" calibration.
//
// radar-2 set every category multiplier by hand. radar-3 keeps that table as
// the starting point but lets the market move it: for each category, the
// median market-cap/TVL of that category's live-token protocols in the SAME
// snapshot is the market's own price for a token on that kind of business.
// A category whose live tokens trade rich per TVL dollar gets a higher
// multiplier than one whose live tokens trade cheap.
//
// Why the median, and why the dampers:
// - The median across a category's live protocols is one wild token away from
//   deciding anything; a single-token category says nothing at all.
// - The market factor is the square root of the category's ratio to the
//   global median, clamped to 0.80..1.25: market evidence moves a haircut,
//   never by more than a quarter either way.
// - A category with fewer than 3 live comparables keeps its hand-set value
//   (factor 1.00): thin evidence is no evidence.
// - The calibrated multiplier itself is clamped to 0.70..1.35, so no category
//   can leave the range the hand table already spanned by much.
// - Centralised exchanges are left out of the calibration entirely: their
//   market cap is exchange equity, not a protocol token on TVL.
//
// The base multiple gets a check from the same numbers, not a change: across
// the snapshot's live-token protocols the global median market-cap/TVL is
// 0.246, against the model's base of 0.20. The market prices a token at
// about a quarter of TVL, close to what radar-2 already assumed.
//
// Unknown age gets the same treatment. radar-2 defaulted a protocol with no
// listed date to a fixed 365 days. radar-3 defaults it to the snapshot's own
// median age across rankable pre-token protocols (464 days here): the
// snapshot's own middle, not a number picked in advance. Protocols with a
// listed date are untouched; the default only fills the gap.

import type { Snapshot, SnapshotProtocol } from './model.ts';

/** One category's calibration, for the board and the dashboard to show. */
export interface CategoryCalibration {
  category: string;
  live_count: number;
  median_mcap_tvl: number | null;
  market_factor: number;
  hand_multiplier: number;
  calibrated_multiplier: number;
}

export interface Calibration {
  global_median_mcap_tvl: number;
  live_count: number;
  unknown_age_days: number;
  categories: CategoryCalibration[];
}

export const MIN_LIVE_FOR_CALIBRATION = 3;
export const MARKET_FACTOR_FLOOR = 0.8;
export const MARKET_FACTOR_CAP = 1.25;
export const CALIBRATED_FLOOR = 0.7;
export const CALIBRATED_CAP = 1.35;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** A live-token protocol whose market cap can price its category. */
export function isLivePriced(p: SnapshotProtocol): boolean {
  return p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX';
}

/** A protocol the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankableForCalibration(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null && p.category !== 'CEX';
}

/**
 * The market calibration for one snapshot: one row per category that appears
 * on the board, each carrying the market evidence behind its multiplier.
 * Deterministic: medians of sorted numbers, no clock, no randomness.
 */
export function buildCalibration(
  snapshot: Snapshot,
  handMultiplier: (category: string | null) => number,
  rankable: SnapshotProtocol[],
  asOf: string,
): Calibration {
  const live = snapshot.protocols.filter(isLivePriced);
  const ratios = live.map((p) => p.mcap_usd! / p.tvl_usd);
  const globalMedian = median(ratios) ?? 0.2;

  const byCategory = new Map<string, number[]>();
  for (const p of live) {
    const key = p.category ?? 'Uncategorised';
    const list = byCategory.get(key) ?? [];
    list.push(p.mcap_usd! / p.tvl_usd);
    byCategory.set(key, list);
  }

  const boardCategories = [...new Set(rankable.map((p) => p.category ?? 'Uncategorised'))].sort();
  const categories: CategoryCalibration[] = boardCategories.map((category) => {
    const hand = handMultiplier(category === 'Uncategorised' ? null : category);
    const list = byCategory.get(category) ?? [];
    const catMedian = median(list);
    if (catMedian === null || list.length < MIN_LIVE_FOR_CALIBRATION || globalMedian <= 0) {
      return { category, live_count: list.length, median_mcap_tvl: catMedian === null ? null : round4(catMedian), market_factor: 1, hand_multiplier: hand, calibrated_multiplier: hand };
    }
    const factor = round4(clamp(Math.sqrt(catMedian / globalMedian), MARKET_FACTOR_FLOOR, MARKET_FACTOR_CAP));
    const calibrated = round4(clamp(hand * factor, CALIBRATED_FLOOR, CALIBRATED_CAP));
    return { category, live_count: list.length, median_mcap_tvl: round4(catMedian), market_factor: factor, hand_multiplier: hand, calibrated_multiplier: calibrated };
  });

  // The unknown-age default: the snapshot's own median age across rankable
  // pre-token protocols with a listed date, falling back to 365 days.
  const dayMs = 86_400_000;
  const asOfMs = Date.parse(`${asOf}T00:00:00Z`);
  const ages: number[] = [];
  for (const p of rankable) {
    if (p.listed_at === null) continue;
    const listedMs = Date.parse(`${p.listed_at}T00:00:00Z`);
    if (Number.isFinite(asOfMs) && Number.isFinite(listedMs)) {
      ages.push(Math.max(0, Math.floor((asOfMs - listedMs) / dayMs)));
    }
  }
  const medianAge = median(ages);
  const unknownAge = medianAge === null ? 365 : Math.round(medianAge);

  return { global_median_mcap_tvl: round4(globalMedian), live_count: live.length, unknown_age_days: unknownAge, categories };
}

/** The calibrated multiplier for one category, from a built calibration. */
export function calibratedMultiplier(calibration: Calibration, category: string | null): number {
  const key = category ?? 'Uncategorised';
  const row = calibration.categories.find((c) => c.category === key);
  return row === undefined ? 1 : row.calibrated_multiplier;
}
