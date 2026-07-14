import { AlbumData } from '../models/Album';
import { apiFetch } from './Api';
import { GetDiscogs, GetById } from './Discogs';
import FetchSpotify from '../services/Spotify';

function sortByReleaseYear(data: AlbumData[]): AlbumData[] {
    data.sort((a, b) => a.releaseYear - b.releaseYear);
    return data;
}

async function FetchAlbums(artist: string): Promise<AlbumData[]> {
    const data = await apiFetch<AlbumData[] | null>('/album/artist', { body: { artist } });
    return sortByReleaseYear(Array.isArray(data) ? data : []);
}

async function FetchAlbumByTitle(title: string): Promise<AlbumData[]> {
    // Case-insensitive substring search via the generic find endpoint;
    // /title would be an exact, case-sensitive match on TITLE.
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const data = await apiFetch<AlbumData[] | null>('/findAndSort', {
        body: {
            query: { TITLE: { $regex: escaped, $options: 'i' } },
            sort: { ARTIST: 1 },
        },
    });
    return Array.isArray(data) ? data : [];
}

async function HandleAlbum(album: AlbumData) {
    const path = album.id === undefined || album.id === "" ? '/new/album' : '/update/album';

    if (album.spotify === null) {
        album.spotify = await FetchSpotify(album.artist, album.title);
    }

    return await apiFetch<Record<string, string>>(path, { body: album });
}

async function RemoveAlbum(id: string) {
    await apiFetch<Record<string, string>>('/delete/album', { body: { id } });
}

async function UpdateDiscogs(discogsId: string, album: AlbumData) {
    if (discogsId === "0") {
        return await HandleAlbum(album);
    }

    const discogs = await GetById(discogsId);
    if (discogs.id === undefined) {
        return;
    }
    album.discogs = discogs;
    return await HandleAlbum(album);
}

function sortYearData(data: Record<string, string>[], metric: string): Record<string, string>[] {
    const key = metric === "purchase" ? "purchase" : "artist";
    data.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
    return data;
}

function sortByArtist(data: Record<string, string | number>[]): Record<string, string | number>[] {
    if (!Array.isArray(data)) {
        console.error('sortByArtist: data is not an array:', data);
        return [];
    }
    data.sort((a, b) => (a.artist < b.artist ? -1 : a.artist > b.artist ? 1 : 0));
    return data;
}

async function FetchAlbumsByYearMetric(year: number, metric: string): Promise<Record<string, string>[]> {
    const data = await apiFetch<Record<string, string>[] | null>('/album/year', { body: { year, metric } });
    return sortYearData(Array.isArray(data) ? data : [], metric);
}

async function Aggregate(query: object): Promise<Record<string, number | string>[]> {
    const data = await apiFetch<Record<string, number | string>[] | null>('/aggregation', { body: query });
    return Array.isArray(data) ? data : [];
}

async function Find(query: object): Promise<Record<string, number | string>[]> {
    const data = await apiFetch<Record<string, number | string>[] | null>('/find', { body: query });
    if (!data || !Array.isArray(data)) {
        return [];
    }
    return sortByArtist(data);
}

async function FindAndSort(query: object): Promise<Record<string, number | string>[]> {
    const data = await apiFetch<Record<string, number | string>[] | null>('/findAndSort', { body: query });
    if (!data || !Array.isArray(data)) {
        return [];
    }
    return sortByArtist(data);
}

async function ExportCollection(): Promise<AlbumData[]> {
    const data = await apiFetch<AlbumData[] | null>('/all');
    const albums = Array.isArray(data) ? data : [];
    sortByReleaseYear(albums);
    albums.sort((a, b) => (a.artist < b.artist ? -1 : a.artist > b.artist ? 1 : 0));
    return albums;
}

export {
    FetchAlbums,
    HandleAlbum,
    RemoveAlbum,
    UpdateDiscogs,
    FetchAlbumsByYearMetric,
    FetchAlbumByTitle,
    Aggregate,
    Find,
    GetDiscogs,
    FindAndSort,
    ExportCollection
}
