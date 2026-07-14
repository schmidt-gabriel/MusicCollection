# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).


# Authentication (Auth0)

The app authenticates the user with Auth0 (Authorization Code + PKCE via
`@auth0/auth0-react`). The login access token (audience = the Music
Collection API) is used directly as the bearer token for every backend
call. There is no machine-to-machine flow in the browser anymore.

## Environment (.env at the project root)

```
REACT_APP_AUTH0_DOMAIN=<tenant>.us.auth0.com
REACT_APP_AUTH0_CLIENT_ID=<SPA application client id>
REACT_APP_AUDIENCE=music-collection-api   # https:// prefix is added in code
REACT_APP_API_DOMAIN=api.disccolection.publicvm.com
```

## Auth0 dashboard requirements

1. **Application (type SPA)** with the site URL in *Allowed Callback URLs*,
   *Allowed Logout URLs* and *Allowed Web Origins*.
2. **API** ("Music Collection API", identifier `https://music-collection-api`)
   with **Allow Offline Access** enabled (the app uses refresh tokens with
   localstorage cache, so token renewal works without third-party cookies).
   The identifier is a stable, domain-independent string so it never changes
   when the backend host moves.
3. In the API's **Application Access** tab, authorize the SPA application
   (and any other client that consumes the API, e.g. the mobile app).
4. The backend (`backend`) must validate the same audience:
   `AUTH0_AUDIENCE=https://music-collection-api`.

## Spotify/Discogs credentials (post-login Action)

Third-party credentials are stored as **Action secrets** and delivered to
the app as custom claims on the ID token. In **Actions → Library**, create
a *Login / Post Login* action named `metadata claims`, add the secrets
`DISCOGS_TOKEN`, `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`, deploy
the code below, and attach it to the **post-login** trigger:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  // The namespace is only a required URI-shaped label; it is never fetched
  // and can be any value. app.tsx matches each claim by name, ignoring the
  // namespace, so it can change freely.
  const namespace = 'https://music-app.claims/';
  for (const key of ['DISCOGS_TOKEN', 'SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET']) {
    if (event.secrets[key]) {
      api.idToken.setCustomClaim(namespace + key, event.secrets[key]);
    }
  }
};
```

`app.tsx` copies these claims into `sessionStorage` on login (matching by
claim name); the Discogs and Spotify services read them from there.

# Deployment

Pushes to `main` deploy automatically via GitHub Actions
(`.github/workflows/deploy.yaml`): the workflow builds the app and rsyncs
`build/` to `/var/www/music-app` on the VM. Pull requests run type checks
and the build (`ci.yaml`).

Repository secrets required (Settings → Secrets and variables → Actions):

- `ENV_FILE`: full content of the production `.env`
- `DEPLOY_SSH_KEY`: private SSH key with access to the VM
- `DEPLOY_HOST`: VM address
- `DEPLOY_USER`: SSH user (owner of `/var/www/music-app`)

Manual fallback:

```
npm run build \
&& rsync -az --delete -e "ssh -i <SSH_KEY>" build/ <USER>@<MACHINE_IP>:/var/www/music-app/
```
