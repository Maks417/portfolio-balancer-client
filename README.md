# Portfolio Balancer Client

[![CodeQL](https://github.com/Maks417/portfolio-balancer-client/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Maks417/portfolio-balancer-client/actions/workflows/codeql-analysis.yml)
[![Deploy static content to Pages](https://github.com/Maks417/portfolio-balancer-client/actions/workflows/static.yml/badge.svg?branch=main)](https://github.com/Maks417/portfolio-balancer-client/actions/workflows/static.yml)

Web client for the Portfolio Balancer service. Enter your current stock and bond positions, set a target allocation, and specify a new contribution — the app calculates how much to add to each asset class to rebalance the portfolio. A full rebalance mode shows buy and sell recommendations without requiring a new contribution.

**Live demo:** [https://maks417.github.io/portfolio-balancer-client](https://maks417.github.io/portfolio-balancer-client)

The UI is in Russian.

## Features

- Target allocation via slider or ratio input (e.g. `70/30`, `100`, `0`)
- Contribution mode and full rebalance mode
- Multiple positions per asset class with RUB, USD, and EUR support
- Live FX rates from the API for preview and results
- Shareable scenario URLs and automatic local draft persistence
- Server-side per-position breakdown with transparent FX metadata
- Client-side validation with distinct API error handling (validation, FX outage, timeout)

## Tech stack

- [React](https://react.dev/) 19
- [Vite](https://vite.dev/) 8
- [React Router](https://reactrouter.com/) 7
- [Reactstrap](https://reactstrap.github.io/) / Bootstrap 5
- [Axios](https://axios-http.com/) for API requests
- [Vitest](https://vitest.dev/) for unit tests
- Sass

## Prerequisites

- Node.js 20+
- A running Portfolio Balancer API (see [Environment variables](#environment-variables))

## Getting started

```bash
git clone https://github.com/Maks417/portfolio-balancer-client.git
cd portfolio-balancer-client
npm ci
cp .env.example .env
# Edit .env and set VITE_API_BASE_URL
npm start
```

The dev server starts at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Start the Vite dev server |
| `npm run build` | Build for production into `build/` |
| `npm run serve` | Preview the production build locally |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |

## Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the Portfolio Balancer API (e.g. `http://localhost:5000/api` for local development) |

The app calls:

- `GET {VITE_API_BASE_URL}/portfolio/rates` — FX metadata for preview
- `POST {VITE_API_BASE_URL}/portfolio/calculate` — allocation calculation

`VITE_API_BASE_URL` is required for production builds.

## Deployment

Production builds are deployed automatically to GitHub Pages on pushes to `main` via the [Deploy static content to Pages](.github/workflows/static.yml) workflow.

Configure the `VITE_API_BASE_URL` repository secret in GitHub so the build and test steps can reach the production API.

## Project structure

```
src/
├── api/
│   └── portfolioApi.js       # API client and error mapping
├── components/
│   ├── BalanceForm.jsx       # Main calculator form
│   ├── Home.jsx
│   ├── Layout.jsx
│   └── NotFound.jsx
├── utils/
│   ├── portfolioFormUtils.js # Validation, FX preview, formatting
│   └── scenarioStorage.js      # URL scenarios and local draft
├── sass/
├── App.jsx
└── index.jsx
contracts/                      # Golden API fixtures for tests
```

## Platform scope

Accounts, databases, and broker integrations are intentionally out of scope for now. See [PLATFORM.md](PLATFORM.md) for the decision gate.

## License

Private — see repository settings for details.
