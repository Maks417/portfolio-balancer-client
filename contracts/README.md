# API contracts

Golden fixtures under this folder describe the Portfolio Balancer HTTP wire shape used by the client.

## `POST /portfolio/calculate`

### Request (`calculate-request.golden.json`)

| Field | Type | Notes |
| --- | --- | --- |
| `ratio` | string | `100`, `0`, `a/b`, or `a/b/c` (stocks/bonds/cash) summing to 100 |
| `stockValues` | `{ value, currency }[]` | Wire name; UI uses `stocksValues` |
| `bondValues` | `{ value, currency }[]` | Wire name; UI uses `bondsValues` |
| `cashValues` | `{ value, currency }[]` | Optional cash positions |
| `contributionAmount` | `{ value, currency }` | Contribution or `0` in rebalance mode |
| `mode` | `contribution` \| `rebalance` | |
| `driftThreshold` | number | Optional; included when &gt; 0 |
| `minTradeAmount` | number | Optional; included when &gt; 0 |

Currencies: `rub`, `usd`, `eur`.

### Response (`calculate-response.golden.json`)

| Field | Type | Notes |
| --- | --- | --- |
| `stocksDiff` / `bondsDiff` / `cashDiff` | number \| null | Signed amounts in result currency |
| `currency` | string | Result display currency |
| `mode` | string | Echo of request mode |
| `stocksBreakdown` / `bondsBreakdown` / `cashBreakdown` | `{ amount, currency, isSell }[]` | Per-position suggestions |
| `contributionOnlyNote` / `toleranceNote` | string \| null | Server notes |
| `fx` | object \| null | Rate metadata for disclaimer |

Client mapping lives in `buildCalculatePayload` / `mapServerBreakdown` in `src/utils/portfolioFormUtils.js`.
