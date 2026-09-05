# Eurogames Web — Specification

**Status:** Reverse-engineered from source code and configuration as of 2026-09-05. Open questions from the first draft have been answered by the project owner and are folded into the requirements below (decision log in §8). Implementation technologies (runtime, language, database, hosting platform) are deliberately not prescribed — see §2.

## 1. Purpose

This is a server-side web application that acts as an API gateway between a browser-based single-page app and a separate backend data service, for tracking a personal board game collection, recorded plays, and win/loss statistics. It also serves the front end's static assets and provides optional password-based site access control.

## 2. Architecture

The system follows a standard **three-tier architecture**. This spec constrains behavior and contracts between tiers, not the technology used to build any tier.

```
┌─────────────────────────────────────────────┐
│ Presentation Tier                            │
│ Browser-based single-page application        │
│ (games / plays / last-played / stats views,  │
│  login page, static assets)                  │
└───────────────────┬───────────────────────────┘
                    │ HTTP(S), JSON, same-origin
┌───────────────────▼───────────────────────────┐
│ Application Tier                             │
│ Stateless API gateway / business-logic layer │
│  • Site-access authentication                │
│  • Request routing                           │
│  • Request/response shaping & validation     │
│  • Static asset serving                      │
└───────────────────┬───────────────────────────┘
                    │ HTTP(S), JSON, bearer-token auth
┌───────────────────▼───────────────────────────┐
│ Data Tier                                    │
│ External backend data service, owned         │
│ and versioned independently of this app.     │
│ Owns all persistence (games, plays, stats).  │
└─────────────────────────────────────────────┘
```

- The application tier holds **no persistent state of its own**. It does not connect to a database directly; all game/play/statistics data is owned and persisted by the data tier, accessed only through its API.
- The application tier is **stateless across requests** — session validity must be derivable from information carried in the request itself (e.g., a signed token), not from server-side session storage, so that any request can be handled by any application-tier instance without shared memory.
- Deployment target: a single production environment. There is currently no requirement for separate staging/pre-production environments; if one is introduced later, secrets and configuration must be scoped per environment rather than shared.
- The specific language, framework, hosting platform, and database technology used to implement each tier are implementation decisions, not requirements, and may change without affecting this spec.

## 3. Functional Requirements

### 3.1 Site Authentication (optional gate)

- Site access control is **optional and configuration-driven**: it is controlled by two secrets — a shared site password and a signing secret. If either is not configured, the site must be fully accessible with no login required.
- `POST /auth/login` — request body `{ password }`. On a correct password, the application tier issues a session credential (e.g., a signed cookie) valid for 30 days. Returns 401 on an incorrect password, and 500 if the auth secrets are only partially configured (one present, one missing) at request time.
- `POST /auth/logout` — clears the session credential unconditionally (no auth check required to log out).
- Session credential requirements:
  - Must encode an expiry and be signed with a keyed cryptographic MAC (e.g., HMAC-SHA256) using the signing secret, so it cannot be forged or extended without the secret.
  - Must be verified on every protected request by recomputing the expected signature and checking both signature validity and expiry.
  - Must be delivered via a mechanism not readable by client-side script and not sent on cross-site requests (e.g., an `HttpOnly`, `SameSite=Strict` cookie), to reduce exposure to XSS and CSRF.
- Public (unauthenticated) paths: the login page, authentication endpoints themselves, and static assets required to render the login page (favicon, stylesheets).
- Enforcement on all other paths, when auth is configured and the request is unauthenticated:
  - API requests must receive `401 { success: false, error: 'Unauthorized' }`.
  - Page/document requests must be redirected to the login page, preserving the originally requested path so the user returns to it after login.
- Authentication model is intentionally single shared secret, not per-user accounts, roles, or multi-tenancy — this is a small trusted-user-group application, not a multi-user system with distinct identities.
- **Security requirement:** any comparison of secrets or signatures (e.g., verifying the session signature) must use a constant-time comparison rather than a short-circuiting equality check, to avoid timing side-channels. *(Resolved from open question — see §8.)*
- Login rate-limiting and CSRF protection beyond `SameSite=Strict` cookies are not required given the intended trusted, low-traffic, personal usage; this should be revisited if the app is ever exposed to a broader or hostile audience.

### 3.2 Data Tier Authentication

- Application-tier calls to the data tier must be authenticated using a bearer token (or equivalent credential) supplied via secret configuration, when one is configured; calls proceed unauthenticated only if no credential is configured.
- The data tier's base address must be configurable rather than hardcoded, so the application tier can point at different data-tier deployments without a code change.
- Each outbound call to the data tier must have a bounded timeout (currently 30 seconds) so a slow or unresponsive data tier cannot hang application-tier requests indefinitely. No automatic retry is required.

### 3.3 Games

| Method | Path | Body | Behavior |
|---|---|---|---|
| GET | `/v1/games` | — | Returns the game collection, reshaped into `{ games: [...], total: N }`. Currently bounded to 500 games per request (see §5 — accepted as a data-tier constraint, not a defect). |
| GET | `/v1/games/:id` | — | Returns one game's details. |
| POST | `/v1/games` | `{ bggId: number }` | Adds a game by external catalog ID (BoardGameGeek). Must validate `bggId` is present and numeric before calling the data tier; 400 otherwise. Returns 201 on success. |
| PATCH | `/v1/games/:id/notes` | `{ notes: string }` | Updates free-text notes. Must validate `notes` is present; 400 otherwise. |
| PATCH | `/v1/games/:id/data` | `{ data: object }` | Updates catalog metadata. Must validate `data` is present and is an object; 400 otherwise. |
| PUT | `/v1/games/:id/sync` | — | Re-syncs a game's catalog metadata from the external source via the data tier. |
| GET | `/v1/games/:id/history` | — | Returns the play history for one game. |

### 3.4 Plays

| Method | Path | Body | Behavior |
|---|---|---|---|
| GET | `/v1/plays` | — | Returns play records, optionally filtered by query-string parameters, reshaped into `{ plays: [...], total: N }`. |
| POST | `/v1/plays` | Play record (without id/timestamps) | **Must validate the request body** before forwarding to the data tier — required fields (`gameId`, `date`, `players`) present and correctly typed (e.g., `players` is a non-empty array of strings) — returning 400 on invalid input, consistent with the validation already required on `/v1/games`. Returns 201 on success. *(Resolved from open question — see §8.)* |
| GET | `/v1/plays/:id` | — | Returns one play record. |
| PUT | `/v1/plays/:id` | Partial play record | Must apply the same field-level validation as POST to any fields present in the update. |
| DELETE | `/v1/plays/:id` | — | Deletes a play record. |

- A play record consists of: an identifier, the game played, a date, a list of players, an optional winner, optional notes, and creation/update timestamps.
- Cooperative or joint wins are represented as a compound winner value (e.g., `"Andrew & Trish"`) — this is a data convention shared between the application tier and presentation tier, not a distinct data type.

### 3.5 Statistics — all read-only, no request bodies

- `GET /v1/stats/winners` — per-game win breakdown.
- `GET /v1/stats/totals` — overall per-player totals.
- `GET /v1/stats/last-played` — last-played date per game.
- `GET /v1/stats/recent?limit=N` — recent plays, optional numeric limit.
- `GET /v1/stats/players/:player` — statistics for one named player.
- `GET /v1/stats/games` — per-game aggregate statistics (play count, win distribution, average players, last played).

### 3.6 Utilities

- `GET /v1/export` — exports the full games + plays dataset as JSON. No pagination; response size grows with collection/history size. Acceptable at current personal-project scale.
- `POST /v1/query` — body `{ sql: string }`. Executes a read-only query against the data tier's own query endpoint. The application tier must enforce, as a defense-in-depth safety net:
  - The statement is non-empty and a single statement (no stacked statements via `;`).
  - The statement begins with `SELECT`.
  - No write/DDL/administrative keywords (insert, update, delete, drop, alter, create, replace, truncate, attach, detach, pragma, vacuum, reindex, grant, revoke) appear anywhere in the statement, including inside subqueries.
  - Beyond this safety net, the scope of what a query is allowed to read is governed by the data tier's own access-control and query contract — the application tier is not required to impose additional table/column restrictions of its own. *(Resolved from open question — see §8.)*

### 3.7 Presentation Tier (Frontend)

- A single-page application with four views: Games, Plays, Last Played, and Statistics, plus a login page.
- Served as static assets by the application tier.
- Requirement: **every** request, including static asset requests, must pass through the application tier's authentication check before assets are served, so the login gate cannot be bypassed by requesting a static file directly.

## 4. Non-Functional Requirements / Constraints

- **Statelessness:** The application tier must not rely on in-process or sticky-session state. Session validity must be fully derivable from the request's signed credential.
- **Type safety:** Application-tier code should be written with strict static type checking where the chosen language supports it, to catch integration errors (mismatched shapes between tiers) before deployment. This is a recommended engineering practice, not a mandated specific language or compiler.
- **Minimal dependencies:** Prefer a small, well-understood set of libraries (e.g., a lightweight routing library) over a full framework, and avoid an ORM/database client in the application tier, since it owns no database.
- **CORS policy:** Cross-origin requests must be restricted to the presentation tier's actual deployed origin(s) rather than allowed from any origin (`*`). A wildcard origin is not acceptable as a long-term security posture; it may only be used transiently in local development. Allowed methods should be limited to those actually used (`GET, POST, PUT, PATCH, DELETE, OPTIONS`) and allowed headers to `Content-Type, Authorization`. *(Resolved from open question — see §8.)*
- **Timeouts:** All calls to the data tier must have a bounded timeout (currently 30 seconds); no retry logic is required.
- **Observability:** Errors must be logged with enough context (operation name, and ideally a correlation/request identifier) to diagnose failures after the fact. Structured logging is preferred over ad hoc text but not mandated at this scale.
- **Secrets management:** Credentials (data-tier API credential, site password, signing secret) must never be committed to source control. They must be supplied via a secure secret-storage mechanism appropriate to the hosting platform in production, and via a local, gitignored configuration file in development.
- **API versioning:** All data endpoints are prefixed `/v1/`. No breaking change should be made to a `/v1/` endpoint's contract without introducing a new version prefix; additive, backward-compatible changes may be made in place.
- **Testing approach:** Automated test coverage (unit/integration tests) is **not required** for this application at this time; manual verification and user acceptance testing by the project owner are sufficient. This may be revisited if the application grows in complexity or contributor count. *(Resolved from open question — see §8.)*
- **Environments:** A single production environment is in scope. Configuration should not hardcode assumptions that would block adding further environments later, but building out multi-environment support is not currently required. *(Resolved from open question — see §8.)*

## 5. Known Limitations / Accepted Constraints

- **Games list is capped at 500 games per request.** This is treated as an **accepted, data-tier-imposed constraint** for the foreseeable future, not a defect — the collection is not expected to exceed this soon, and true end-to-end pagination is not currently required. Should the collection approach this limit, pagination should be revisited. *(Resolved from open question — see §8.)*
- **No pagination on plays listing, export, or statistics endpoints.** These grow with play history. Acceptable at current personal-project scale; worth revisiting if history grows large enough to affect response times or payload size.
- **Query endpoint scope is governed by the data tier**, not further restricted by the application tier beyond the read-only safety net in §3.6. *(Resolved from open question — see §8.)*

## 6. Out of Scope

- Multi-user accounts, per-user permissions, or audit trails (single shared password; no user identity beyond player name strings).
- Real-time updates / push notifications (pure request-response).
- Data persistence within the application tier (fully delegated to the data tier).
- Internationalization/localization.
- Automated CI/CD pipeline.
- Automated test suites (see §4, Testing approach).
- Multiple deployment environments (see §4, Environments).

## 7. Cross-Tier Contract Notes

These are the behavioral guarantees each tier can rely on from its neighbor, independent of implementation:

- **Presentation → Application:** JSON request/response bodies over HTTPS; authentication via a browser-managed session credential; errors returned as `{ success: false, error: string }` with an appropriate HTTP status, or `{ error: string }` for simpler failures.
- **Application → Data tier:** JSON request/response bodies over HTTPS; authentication via a bearer credential when configured; the application tier must treat the data tier as the source of truth and must not cache or duplicate its data beyond the lifetime of a single request/response cycle.
- **Response shape consistency:** All application-tier API responses should follow one consistent success/error envelope; where the data tier's response shape differs from the presentation tier's expected shape, the application tier is responsible for the transformation (as already done for the games and plays list endpoints).

## 8. Decision Log

Decisions made by the project owner on 2026-09-05, resolving the open questions from the first draft of this spec:

1. **Environments:** Only one (production) environment exists or is required at this time.
2. **CORS:** Wildcard CORS is not acceptable; restrict allowed origins to the deployed presentation-tier origin(s) as a matter of good security practice.
3. **Plays validation:** `/v1/plays` request bodies must receive the same field-level validation treatment as `/v1/games` endpoints.
4. **Query endpoint scope:** Left as-is; the allowed scope of read queries is governed by the data tier's own contract, not further restricted by the application tier.
5. **Games list cap (500):** Accepted as a reasonable limit for now; it is a data-tier constraint, not something the application tier needs to work around with pagination at this time.
6. **Automated testing:** Not required for the application tier at this time; user acceptance testing is sufficient.
7. **Signature comparison:** Must use a constant-time comparison, as a matter of good security practice.
