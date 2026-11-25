# makefun-token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/zou-git0324/makefun-token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/zou-git0324/makefun-token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar ranking 226 pre-token protocols by implied value, with a sortable dashboard, per-protocol farm plans and real screenshots. The radar-3 model scores each protocol from TVL, category, 7-day growth, maturity and chain breadth, never from its name — and its category multipliers are calibrated from the market: each category's hand-set haircut is moved by up to a quarter by the median market-cap/TVL of that category's live tokens in the same snapshot (live tokens trade at a median 0.246× TVL, close to the model's 0.20 base). The board covers all 40 watchlist protocols plus 186 more below the floor, ranked from steakhouse-financial at $526.7M implied down to $623,728, and every row carries a 7-step farm plan with costs and time. The dashboard adds a per-category summary, the calibration evidence behind every multiplier, and a CSV download of whatever the filters show.

Radar-4 adds a launch-heat score (0–100) to every row: 40% log implied value, 35% this week's growth, 25% youth — a parallel signal that never changes the rank, only flags what is running hot. The dashboard has a sortable Heat column, a "Hot only" filter, and a "Hottest launches" strip; only one row clears 70 (Shift DeFi, 75). It also counts, by category, the 63 rankable protocols above the $50M floor that the board does not rank.

Radar-5 adds a second parallel signal, category-relative momentum: each row's 7-day TVL change minus the median 7-day change of its own category, in percentage points (clamped −50…+50). A +30% week means something different in a booming category than in a flat one, so momentum flags which rows are outrunning their own kind — 134 of 226 rows beat their category median this week. The dashboard has a sortable Momentum column, a "Momentum, high to low" sort, and a "Momentum leaders" strip (Shift DeFi, August Digital, NUVA, Theo Network thBill and Manifest Trade all sit at the +50 clamp); the category panel shows each category's median 7-day change beside its median implied value. The rank order is untouched: steakhouse-financial still leads at $526.7M implied.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, writes the ranked board to `$MAKEFUN_OUTPUT_DIR/board.json`, the dashboard data to `$MAKEFUN_OUTPUT_DIR/data.js`, copies `dashboard/` and `screenshots/` into the output, and writes `$MAKEFUN_OUTPUT_DIR/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=qxtjtv0g&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
