import Token from './Token';

const protocol = import.meta.env.REACT_APP_API_DOMAIN?.includes('localhost') ? 'http' : 'https';
const baseUrl = `${protocol}://${import.meta.env.REACT_APP_API_DOMAIN}`;

async function authHeaders(): Promise<Record<string, string>> {
    let token = sessionStorage.getItem("token");
    if (!token) {
        if (!(await Token())) {
            throw new Error("Não foi possível obter o token de acesso");
        }
        token = sessionStorage.getItem("token");
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token,
    };
}

interface ApiOptions {
    method?: string;
    body?: unknown;
}

/**
 * Authenticated fetch against the API. Retries once with a fresh token on
 * 401 and throws on any other non-2xx status instead of hanging callers.
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
    if (import.meta.env.REACT_APP_MOCK) {
        const { mockFetch } = await import('./mock');
        return mockFetch<T>(path, options.body);
    }
    const request = async () => fetch(`${baseUrl}${path}`, {
        method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
        headers: await authHeaders(),
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    let response = await request();
    if (response.status === 401) {
        if (!(await Token())) {
            throw new Error("Sessão expirada. Recarregue a página.");
        }
        response = await request();
    }
    if (!response.ok) {
        throw new Error(`Falha na API (${path}): HTTP ${response.status}`);
    }
    return await response.json() as T;
}
