import { StrictMode } from 'react';
import { Auth0Provider } from '@auth0/auth0-react';
import { createRoot } from "react-dom/client";

import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/index.css';

import App from './app';

const rootElement = document.getElementById("root");
const root = createRoot(rootElement as HTMLElement);

root.render(
  <Auth0Provider
    domain={import.meta.env.REACT_APP_AUTH0_DOMAIN as string}
    clientId={import.meta.env.REACT_APP_AUTH0_CLIENT_ID as string}
    useRefreshTokens={true}
    cacheLocation="localstorage"
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: `https://${import.meta.env.REACT_APP_AUDIENCE}`,
      scope: 'openid profile email offline_access'
    }}
  >
    <StrictMode>
      <App />
    </StrictMode >

  </Auth0Provider>,
);