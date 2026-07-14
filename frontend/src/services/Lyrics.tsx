import { apiFetch } from './Api';

// The Genius API only returns the song's page URL (not the lyrics text), so the
// app opens that page on genius.com. The Genius token stays on the backend (see
// proxy.go); this just calls the authenticated /genius/search proxy.
export interface LyricsHit {
    url: string;
    title: string;
    fullTitle: string;
    thumb: string;
}

export async function SearchLyrics(query: string): Promise<LyricsHit | null> {
    try {
        return await apiFetch<LyricsHit | null>(`/genius/search?q=${encodeURIComponent(query)}`);
    } catch (e) {
        console.error('Genius search failed', e);
        return null;
    }
}
