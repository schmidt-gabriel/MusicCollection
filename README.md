# Music Collection

Monorepo for the Music Collection project: a personal catalog of albums with
Discogs and Spotify metadata.

## Projects

| Folder | What it is | Stack |
| --- | --- | --- |
| [`frontend`](frontend) | Web UI | React + Vite + TypeScript |
| [`backend`](backend) | Backend API | Go + MongoDB |
| [`mobile`](mobile) | Mobile app | Flutter |

Authentication is handled by Auth0 (Authorization Code + PKCE). The API host and
third‑party tokens are delivered as custom claims on the ID token, so they can be
changed in Auth0 without rebuilding. See each project's own README for details.

## Local development with Docker

The stack (`docker-compose.yml`) runs MongoDB, the API and the web UI.

1. Copy the env template and fill it in:

   ```bash
   cp .env.example .env
   ```

2. Choose how to run it:

   **Quick UI only** (fixture data, no API, no Auth0). Nothing to configure:

   ```bash
   REACT_APP_MOCK=1 docker compose up web
   ```

   Open http://localhost:5173.

   **Full stack** (Mongo + API + UI with real auth). Set `AUTH0_DOMAIN`,
   `AUTH0_AUDIENCE`, `REACT_APP_AUTH0_DOMAIN`, `REACT_APP_AUTH0_CLIENT_ID` and
   `REACT_APP_AUDIENCE` in `.env`, then:

   ```bash
   docker compose up
   ```

   - UI: http://localhost:5173
   - API: http://localhost:3000 (health check at `/health`)
   - Mongo: `mongodb://localhost:27017` (database `music`, collection `CD`)

   For login to work locally, add `http://localhost:5173` to the Auth0 SPA
   application's **Allowed Callback URLs**, **Allowed Logout URLs** and
   **Allowed Web Origins**. Mongo starts empty; add albums through the UI.

If a port is already taken, override it in `.env` (`WEB_PORT`, `API_PORT`,
`MONGO_PORT`). Stop with `docker compose down` (add `-v` to also wipe the Mongo
volume).

## Working on one project

Frontend:

```bash
cd frontend
npm ci
npm run dev              # Vite dev server on http://localhost:3000
npm run build            # tsc --noEmit + Vite build (the CI check)
REACT_APP_MOCK=1 npm run dev   # fixtures only, no Auth0 or API
```

Backend (needs a MongoDB and the Auth0 env vars, easiest via `docker compose`):

```bash
cd backend/src
go build ./...
go run .                 # requires MONGODB_URI, MONGODB_DATABASE, AUTH0_DOMAIN, AUTH0_AUDIENCE
```

Mobile:

```bash
cd mobile
flutter pub get
flutter run              # on a booted simulator/device
flutter analyze
flutter test             # single test: flutter test test/api_test.dart
```

## Authentication and configuration

Auth0 with Authorization Code + PKCE (no client secret in any app). The backend
host and the Discogs/Spotify tokens are delivered as **custom claims on the ID
token**, set by a post-login Auth0 Action from Action Secrets, so they can be
changed in Auth0 without rebuilding a client. The apps match each claim by name
and ignore the namespace, so the Action namespace can be any URI.

The API audience (`https://music-collection-api`) is a separate, stable
identifier the backend validates and the clients request at login. It is not the
host and it is not a claim; keep it constant even when the backend host changes.

## CI/CD

GitHub Actions workflows are path‑filtered so each one only runs when its folder
changes:

| Workflow | Trigger | Does |
| --- | --- | --- |
| `ci.yaml` | PR touching `frontend/**` | `tsc --noEmit` + Vite build |
| `deploy-ui.yaml` | push to `main` touching `frontend/**` | build + scp the UI to the VM |
| `deploy-api.yaml` | push to `main` touching `backend/**` | build the Go binary and swap it on the VM |
| `api.yml` | git tag | publish Linux `amd64`/`arm64` binaries to a Release |

The deploy workflows expect these repository secrets: `DEPLOY_SSH_KEY`,
`DEPLOY_HOST`, `DEPLOY_USER`, and `ENV_FILE` (the UI's production `.env`).

## Production server (Oracle VM)

The frontend build is served by nginx from `/var/www/music-app`; the Go API runs
as a systemd service and nginx reverse‑proxies it. This section is an operational
runbook, not something the app reads.

### DNS

DNS for the domains is managed at **DNS Exit** (dnsexit.com). `publicvm.com` is a
DNS Exit free dynamic‑DNS zone, so `disccolection.publicvm.com` and its
subdomains are records there. Point each host (root, `app.`, `api.`) at the VM's
public IP.

Two domains are in use, and they are spelled differently, watch the double `l`:

| Domain | Notes |
| --- | --- |
| `disccollection.shop` (`www.`, `app.`, `api.`) | primary, two `l` |
| `disccolection.publicvm.com` (`app.`, `api.`) | DNS Exit, one `l` |

### TLS certificates (Certbot)

Certificates are issued with Certbot's nginx plugin. To issue or renew the
publicvm.com bundle:

```bash
sudo certbot --nginx -d disccolection.publicvm.com -d app.disccolection.publicvm.com -d api.disccolection.publicvm.com
```

Certbot writes the certs under `/etc/letsencrypt/live/<domain>/` and edits the
nginx server blocks in place. The nginx config lives at
`/etc/nginx/sites-available/music-app` and has one `server` block per host plus a
port‑80 block that redirects every host to HTTPS. The root/`app.` hosts serve the
SPA (`root /var/www/music-app; try_files $uri $uri/ /index.html;`); the `api.`
host does `proxy_pass http://0.0.0.0:3000;`.

### API service (systemd)

The API runs from `/home/ubuntu/music-go-api` as the `music_api` service. Config
is passed as environment variables in the unit file (the app `log.Fatal`s if the
required ones are missing). After editing the unit, reload and restart:

```bash
sudo nano /etc/systemd/system/music_api.service
sudo systemctl daemon-reload
sudo systemctl restart music_api.service
```

Unit file shape (real secret values live only on the server, never commit them):

```ini
[Unit]
Description=Music API service.

[Service]
Type=simple
ExecStart=/home/ubuntu/music-go-api
Environment="MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/"
Environment="MONGODB_DATABASE=MEDIA"
Environment="AUTH0_DOMAIN=<tenant>.us.auth0.com"
Environment="AUTH0_AUDIENCE=https://music-collection-api"
Environment="AUTH0_CLIENT_ID=<auth0-client-id>"
Environment="AUTH0_CLIENT_SECRET=<auth0-client-secret>"
Environment="DISCOGS_TOKEN=<discogs-token>"
Environment="SPOTIFY_CLIENT_ID=<spotify-client-id>"
Environment="SPOTIFY_CLIENT_SECRET=<spotify-client-secret>"

[Install]
WantedBy=multi-user.target
```

`DISCOGS_TOKEN`, `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` back the
`/spotify` and `/discogs` proxies, so the web client never receives them.
Lyrics come from the `/lyrics` proxy (LRCLIB, no key required). The mobile app
still reads Discogs/Spotify from Auth0 claims, so keep those Action claims until
mobile is migrated to the proxies.
