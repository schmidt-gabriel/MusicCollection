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
- `go run .` needs `MONGODB_URI`, `MONGODB_DATABASE`, `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` set (each is `log.Fatal` if missing). `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `DISCOGS_TOKEN` are optional (only the `/spotify` and `/discogs` proxies need them; they return a clear error if unset). There are no Go tests.

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
- `API_DOMAIN` (backend host). The mobile client still reads `DISCOGS_TOKEN` (and Spotify creds) from claims — see the security note below.
- Both clients match a claim **by its name, ignoring the namespace** (frontend: `src/app.tsx`; mobile: `AuthService._claimOrEnv` in `lib/src/utils/auth.dart`), so the Action namespace can be any URI (currently `https://music-app.claims/`). Do not reintroduce a hardcoded namespace.
- `.env` values (`API_DOMAIN`, `DISCOGS_TOKEN` on mobile) are only an optional local fallback; the claim wins.

**Third-party secrets are server-side (web).** The Spotify, Discogs and Genius
credentials must not reach the browser. The Go backend holds
`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `DISCOGS_TOKEN`,
`GENIUS_ACCESS_TOKEN` as env vars and exposes authenticated proxies
(`/spotify/search`, `/discogs/search`, `/discogs/release`, `/discogs/tracks`,
`/genius/search`; see `backend/src/proxy.go`). The web client calls only those
(`frontend/src/services/Spotify.tsx`, `Discogs.tsx`, `Lyrics.tsx`) and no longer
stores or receives these secrets. Genius has no client_credentials grant and its
API returns only the song page URL (never lyrics text), so it is the fallback
"open on Genius" link. Actual lyrics text comes from the `/lyrics` proxy, which
hits LRCLIB (keyless, community-sourced, returns plain + synced/LRC); the `Letra`
button per track shows it in a modal (`frontend/src/services/Lyrics.tsx`). **The mobile app still calls Discogs
directly with the claim token** (`mobile/lib/src/utils/discogs.dart`), so the
Auth0 Action claims for these secrets **must stay until mobile is migrated to
the same proxies**; only then remove them from the Action.

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
`/all`, `/totals`, `/new/album`, `/update/album`, `/delete/album`, the generic
`/find`, `/findAndSort`, `/aggregation`, plus the third-party proxies
`/spotify/search`, `/discogs/search`, `/discogs/release`, `/discogs/tracks`,
`/genius/search`, `/lyrics` (all GET; see `proxy.go`). On success `/new/album` returns the new 24-hex id and
`/update/album` returns a modified count; the frontend uses that shape to tell
insert from update.

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

Server runbook (DNS, TLS, nginx, systemd) is in the README "Production server"
section. Key facts: DNS is on DNS Exit (`publicvm.com` is a DNS Exit zone); two
domains with different spelling (`disccollection.shop` two `l`,
`disccolection.publicvm.com` one `l`); TLS via `sudo certbot --nginx -d ...`; the
API env (incl. the Mongo/Auth0/Discogs/Spotify secrets) lives only in
`/etc/systemd/system/music_api.service` on the VM, never in the repo.
