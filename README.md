# Portfolio Balancer Client

[![CodeQL](https://github.com/Maks417/portfolio-balancer-client/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/Maks417/portfolio-balancer-client/actions/workflows/codeql-analysis.yml)
[![Deploy static content to Pages](https://github.com/Maks417/portfolio-balancer-client/actions/workflows/static.yml/badge.svg?branch=main)](https://github.com/Maks417/portfolio-balancer-client/actions/workflows/static.yml)

Web client for the Portfolio Balancer service. Enter your current stock and bond positions, set a target allocation, and specify a new contribution — the app calculates how much to add to each asset class to rebalance the portfolio.

**Live demo:** [https://maks417.github.io/portfolio-balancer-client](https://maks417.github.io/portfolio-balancer-client)

The UI is in Russian.

## Features

- Target allocation via slider or ratio input (e.g. `70/30`, `100`, `0`)
- Multiple positions per asset class with RUB, USD, and EUR support
- Server-side currency conversion when positions use mixed currencies
- Client-side validation with API error handling

## Tech stack

- [React](https://react.dev/) 19
- [Vite](https://vite.dev/) 8
- [React Router](https://reactrouter.com/) 7
- [Reactstrap](https://reactstrap.github.io/) / Bootstrap 5
- [Axios](https://axios-http.com/) for API requests
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
| `npm test` | Run tests with Vitest |
| `npm run deploy` | Build and publish to GitHub Pages via `gh-pages` (manual fallback) |

## Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the Portfolio Balancer API (e.g. `http://localhost:5000/api` for local development) |

The app calls `POST {VITE_API_BASE_URL}/portfolio/calculate` with portfolio data and expects allocation recommendations in the response.

## Deployment

Production builds are deployed automatically to GitHub Pages on pushes to `main` via the [Deploy static content to Pages](.github/workflows/static.yml) workflow.

Configure the `VITE_API_BASE_URL` repository secret in GitHub so the build step can reach the production API.

Manual deployment is also available:

```bash
npm run deploy
```

## Project structure

```
src/
├── components/
│   ├── BalanceForm.jsx   # Main calculator form
│   ├── Home.jsx          # Home page
│   ├── Layout.jsx        # App shell
│   └── NotFound.jsx      # 404 page
├── utils/
│   └── portfolioFormUtils.js  # Validation and formatting helpers
├── sass/                 # Styles
├── App.jsx
└── index.jsx
```

## License

Private — see repository settings for details.
