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
