import { apiFetch } from './Api';

// Lyrics text (plain and/or synced/LRC) plus an instrumental flag, cached in
// Mongo and backed by LRCLIB.
export interface Lyrics {
    plainLyrics: string;
    syncedLyrics: string;
    instrumental: boolean;
}

// force=true bypasses the Mongo cache and re-queries LRCLIB (the "try again").
export async function FetchLyrics(artist: string, title: string, album?: string, force = false): Promise<Lyrics | null> {
    try {
        const params = new URLSearchParams({ artist, title });
        if (album) params.set('album', album);
        if (force) params.set('refresh', '1');
        return await apiFetch<Lyrics | null>(`/lyrics?${params.toString()}`);
    } catch (e) {
        console.error('LRCLIB lyrics failed', e);
        return null;
    }
}

// Mark a track as instrumental so it stops showing as "not found".
export async function MarkInstrumental(artist: string, title: string, album?: string): Promise<void> {
    await apiFetch('/lyrics/instrumental', { body: { artist, title, album: album ?? '' } });
}

// Strip the [mm:ss.xx] timestamps from synced (LRC) lyrics for plain display.
export function stripSyncedTimestamps(synced: string): string {
    return synced.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();
}
