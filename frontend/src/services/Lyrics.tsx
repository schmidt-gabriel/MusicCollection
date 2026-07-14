import { apiFetch } from './Api';

// LRCLIB returns the actual lyrics text (plain and/or synced/LRC).
export interface Lyrics {
    trackName: string;
    artistName: string;
    plainLyrics: string;
    syncedLyrics: string;
}

export async function FetchLyrics(artist: string, title: string, album?: string): Promise<Lyrics | null> {
    try {
        const params = new URLSearchParams({ artist, title });
        if (album) params.set('album', album);
        return await apiFetch<Lyrics | null>(`/lyrics?${params.toString()}`);
    } catch (e) {
        console.error('LRCLIB lyrics failed', e);
        return null;
    }
}

// Strip the [mm:ss.xx] timestamps from synced (LRC) lyrics for plain display.
export function stripSyncedTimestamps(synced: string): string {
    return synced.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
}
