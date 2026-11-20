# makefun-token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/zou-git0324/makefun-token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/zou-git0324/makefun-token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar ranking 226 pre-token protocols by implied value, with a sortable dashboard, per-protocol farm plans and real screenshots. The radar-2 model scores each protocol from TVL, category, 7-day growth, maturity and chain breadth, never from its name. The board covers all 40 watchlist protocols plus 186 more below the floor, ranked from steakhouse-financial at $526.7M implied down to $698,850, and every row carries a 7-step farm plan with costs and time.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

`main.ts` (Node 22, standard library only) reads the sealed snapshot, writes the ranked board to `$MAKEFUN_OUTPUT_DIR/board.json`, the dashboard data to `$MAKEFUN_OUTPUT_DIR/data.js`, copies `dashboard/` and `screenshots/` into the output, and writes `$MAKEFUN_OUTPUT_DIR/dossier.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=qxtjtv0g&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
