// The API token is the user's own access token from the Auth0 SPA login
// (audience = the Music Collection API). App.tsx registers a getter so the
// services can refresh it after a 401 without going through React context.

let getToken: (() => Promise<string>) | null = null;

export function registerTokenGetter(getter: () => Promise<string>) {
    getToken = getter;
}

async function FetchToken(): Promise<boolean> {
    if (!getToken) {
        return false;
    }
    try {
        const token = await getToken();
        sessionStorage.setItem("token", token);
        return true;
    } catch (e) {
        console.error("Failed to fetch API token", e);
        return false;
    }
}

export default FetchToken;
