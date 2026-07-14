import { apiFetch } from './Api';

// The Spotify client credentials live on the backend now; this just calls the
// authenticated proxy (see backend proxy.go) which returns the first matching
// album, or null. Never throws so saving an album is never blocked by Spotify.
async function FetchSpotify(artist: string, album: string): Promise<any> {
    try {
        const params = new URLSearchParams({ artist, album });
        return await apiFetch<any>(`/spotify/search?${params.toString()}`);
    } catch (e) {
        console.error('Spotify search failed', e);
        return null;
    }
}

export default FetchSpotify;
