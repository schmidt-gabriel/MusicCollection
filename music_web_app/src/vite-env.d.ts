/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly REACT_APP_AUTH0_DOMAIN: string;
    readonly REACT_APP_AUTH0_CLIENT_ID: string;
    readonly REACT_APP_AUDIENCE: string;
    readonly REACT_APP_API_DOMAIN: string;
    /** Dev only: serve fixture data and skip Auth0 (see services/mock.ts). */
    readonly REACT_APP_MOCK?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
