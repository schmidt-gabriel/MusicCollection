# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo layout

Three clients/services of one product (a personal album catalog), sharing a
single Go API, one MongoDB and one Auth0 tenant:

- `frontend/` React + Vite + TypeScript web UI
- `backend/` Go + MongoDB REST API
- `mobile/` Flutter app

Each folder keeps its own `.gitignore` and `README.md`. GitHub Actions live only
at the repo root (`.github/workflows/`) and are path-filtered per folder.

## Commands

Frontend (`cd frontend`):
- `npm ci` then `npm run dev` (Vite dev server, port 3000)
- `npm run build` runs `tsc --noEmit` then the Vite build. This is the CI check; run it before pushing UI changes.
- `REACT_APP_MOCK=1 npm run dev` runs the UI on fixtures (`src/services/mock.ts`), skipping Auth0 and the API.

Backend (`cd backend/src`):
- `go build ./...` to compile, `go vet ./...` to check.
- `go run .` needs `MONGODB_URI`, `MONGODB_DATABASE`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` set (each is `log.Fatal` if missing). There are no Go tests.

Mobile (`cd mobile`):
- `flutter pub get`, then `flutter run` (launch on a booted simulator/device; debug builds only start from Flutter tooling).
- `flutter analyze` and `flutter test`. Single test: `flutter test test/api_test.dart`.

Full local stack (repo root): `docker compose up` (mongo + api + web). UI-only,
no auth/API: `REACT_APP_MOCK=1 docker compose up web`. See README for `.env`.

## Auth and runtime config (the important cross-cutting design)

Auth0 with Authorization Code + PKCE. No client secret ships in any app.

Runtime config is delivered as **custom claims on the Auth0 ID token**, set by a
post-login Action from Action Secrets, so it can change in Auth0 without
rebuilding a client:
- `API_DOMAIN` (backend host), `DISCOGS_TOKEN`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`.
- Both clients match a claim **by its name, ignoring the namespace** (frontend: `src/app.tsx`; mobile: `AuthService._claimOrEnv` in `lib/src/utils/auth.dart`), so the Action namespace can be any URI (currently `https://music-app.claims/`). Do not reintroduce a hardcoded namespace.
- `.env` values (`API_DOMAIN`, `DISCOGS_TOKEN` on mobile) are only an optional local fallback; the claim wins.

The **API audience** (`https://music-collection-api`) is different from all of
the above: it is a stable, domain-independent identifier the backend validates
(`AUTH0_AUDIENCE`) and the clients request at login. It cannot be a claim (it is
needed before a token exists) and an Auth0 API Identifier is immutable, so treat
it as a fixed constant, not something to "point at the current host".

Mobile callback schemes: both platforms use the custom scheme
`com.gabriel.musicapp` (iOS derives it from the bundle id with `useHTTPS` off;
Android sets it in `android/app/build.gradle.kts` to avoid App Links). The
callback path segment differs: iOS `ios/com.gabriel.musicapp`, Android
`android/com.gabriel.music_app` (note the underscore in the Android applicationId).

## Data model conventions (subtle, has caused bugs)

MongoDB, database from `MONGODB_DATABASE`, collection is hardcoded `"CD"`
(`backend/src/database/mongo.go`). BSON field names are UPPERCASE
(`ARTIST`, `TITLE`, `RELEASE_YEAR`, ...); the JSON API is camelCase.

- The whole collection stores `ARTIST`/`TITLE`/`MEDIA`/`ORIGIN` **uppercase**, and every read query uppercases its search term. Writes go through `normalizeAlbum` (`main.go`) which uppercases those fields. Any new write path must do the same or the record will not be found by the listings.
- Insert dedup is by **title AND artist** (two artists can share a title).
- `/find`, `/findAndSort` and `/aggregation` accept raw Mongo queries/pipelines in the request body; the frontend uses them for flexible search (e.g. case-insensitive title regex, catalog projections). Prefer these over adding narrow endpoints.

The API returns a JSON object (not an array) when a lookup finds nothing, so the
frontend services normalize with `Array.isArray(data) ? data : []`. Keep that
guard when adding list calls.

## API

Go + gorilla/mux on port 3000. `jwt.EnsureValidToken()` (Auth0) guards every
data route; `/health` is open. Data routes include `/artists`, `/album/artist`,
`/all`, `/totals`, `/new/album`, `/update/album`, `/delete/album`, plus the
generic `/find`, `/findAndSort`, `/aggregation`. On success `/new/album` returns
the new 24-hex id and `/update/album` returns a modified count; the frontend
uses that shape to tell insert from update.

## Frontend

React + Vite + TS. `vite.config.ts` sets `envPrefix: ['VITE_', 'REACT_APP_']`
(CRA-era var names kept) and `build.outDir: 'build'`. The user's own access
token is the API token (`registerTokenGetter` in `src/services/Token.tsx`); on a
stale session `app.tsx` re-authenticates once via `loginWithRedirect`. Bootstrap
CSS must be imported before app CSS in `src/index.tsx` for overrides to win.

## CI/CD and deploy

Path-filtered workflows: `ci.yaml` and `ci-mobile.yaml` on PRs, `deploy-ui.yaml`
and `deploy-api.yaml` on push to `main`, `api.yml` builds release binaries on git
tags. Deploys `scp`/`ssh` to an Oracle VM: the frontend build to
`/var/www/music-app` (nginx SPA with `try_files ... /index.html`), the backend
binary to `/home/ubuntu/music-go-api` (stop, swap, start the `music_api` systemd
service). Required repo secrets: `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`,
`ENV_FILE` (the UI production `.env`).

## Git

This is a personal project: commit with the personal identity
(`gabriel.hdos@icloud.com`, GPG key `72456017B2993EA0`) and sign commits (`-S`).
