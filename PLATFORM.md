# Platform roadmap (deferred)

This project intentionally remains **stateless** and **infrastructure-light**. The current stack is a static React client plus a minimal .NET API with no database, message broker, or account system.

## What ships today

- Contribution allocation and full rebalance calculations
- Live FX rates from CBR with stale-cache fallback
- Shareable scenario URLs and local draft persistence (browser only)
- Contract fixtures and automated tests on both client and server

## Deferred until validated demand

The following capabilities are **not planned for the current phase** because they require persistent infrastructure and operational overhead:

| Capability | Why deferred |
| --- | --- |
| User accounts and authentication | Needs identity provider, sessions, and security reviews |
| Saved portfolios in a database | Needs DB provisioning, migrations, backups, and privacy compliance |
| Calculation history | Depends on accounts and persistent storage |
| Broker integrations | External API contracts, credentials, and regulatory considerations |
| Tax lots and jurisdiction-specific tax logic | High complexity and legal risk |

## Decision gate

Add persistence only when at least one of these is true:

1. Repeat users request saved portfolios or history
2. Shareable URLs are insufficient for collaboration workflows
3. Product scope expands beyond a calculator into ongoing portfolio management

Until then, prefer browser-local state (`localStorage`, URL scenarios) and the existing stateless API.

## Near-term evolution without new infra

- OpenAPI artifact in CI for typed clients
- Additional FX providers behind `IRateProvider`
- More asset classes modeled as a weighted list (still stateless)
- English localization if audience data supports it
