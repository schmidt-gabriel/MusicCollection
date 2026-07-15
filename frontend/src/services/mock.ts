// Dev-only fixtures served when REACT_APP_MOCK is set, so the UI can be
// developed without Auth0 or the real backend. Never enabled in production.

const cover = 'https://i.discogs.com/ij9n9ycXYQbEKPePiYgBY0_723TFyZR1jZq8pT1evW4/rs:fit/g:sm/q:90/h:591/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTMyMTM4/MDQtMTMyMDc1Nzk1/OC5qcGVn.jpeg';

function album(id: string, artist: string, title: string, year: number, media = 'CD') {
    return {
        id,
        releaseYear: year,
        artist,
        title,
        media,
        purchase: '2024-05-10',
        origin: 'BR',
        editionYear: year,
        ifpiMastering: '', ifpiMould: '', barcode: '', matriz: '', lote: '', obs: '',
        discogs: { id: 1, cover_image: cover, uri: '/release/1', len: 1 },
        spotify: { id: 's1', external_urls: { spotify: 'https://open.spotify.com' }, artists: [{ external_urls: { spotify: 'https://open.spotify.com' } }] },
        discs: [{ discNumber: '1', weight: '', matriz: ['NA'] }],
    };
}

const albums = [
    album('1', 'BLACK SABBATH', 'PARANOID', 1970, 'VINIL'),
    album('2', 'BLACK SABBATH', 'MASTER OF REALITY', 1971),
    album('3', 'IRON MAIDEN', 'POWERSLAVE', 1984),
    album('4', 'RUSH', 'MOVING PICTURES', 1981),
    album('5', 'RUSH', '2112', 1976, 'VINIL'),
];

export async function mockFetch<T>(path: string, body?: unknown): Promise<T> {
    await new Promise((r) => setTimeout(r, 250));
    if (path === '/aggregation' && Array.isArray(body) && body[0]?.$project) {
        return albums.map((a) => ({ _id: a.id, TITLE: a.title, ARTIST: a.artist })) as T;
    }
    // Spotify/Discogs backend proxies (query string follows the path).
    if (path.startsWith('/spotify/search')) {
        return { external_urls: { spotify: 'https://open.spotify.com' }, artists: [{ external_urls: { spotify: 'https://open.spotify.com' } }] } as T;
    }
    if (path.startsWith('/discogs/search')) {
        return { results: [] } as T;
    }
    if (path.startsWith('/discogs/tracks')) {
        return { tracklist: [] } as T;
    }
    if (path.startsWith('/discogs/release')) {
        return {} as T;
    }
    if (path.startsWith('/lyrics')) {
        return { trackName: 'Mock', artistName: 'Mock', plainLyrics: 'Linha um\nLinha dois\nLinha tres', syncedLyrics: '' } as T;
    }
    switch (path) {
        case '/artists':
            return ['1349', '2112', 'BLACK SABBATH', 'IRON MAIDEN', 'RUSH'] as T;
        case '/album/artist':
            return albums.slice(0, 2) as T;
        case '/findAndSort':
            return albums.slice(0, 3) as T;
        case '/find':
            return [] as T;
        case '/all':
            return albums as T;
        case '/totals':
            return { media: { CD: 2074, 'VINIL': 267 }, buy: { '2024': 85, '2025': 157, '2026': 82 }, year: { '1970': 12, '1984': 30 } } as T;
        case '/aggregation':
            return [
                { _id: 'IRON MAIDEN', total: 30 },
                { _id: 'RUSH', total: 25 },
                { _id: 'BLACK SABBATH', total: 22 },
            ] as T;
        default:
            return { Message: 'ok' } as T;
    }
}
