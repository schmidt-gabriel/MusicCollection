import { AlbumData } from '../models/Album';
import DiscogsData from '../models/Discogs';
import { apiFetch } from './Api';

// All Discogs calls go through the authenticated backend proxy (see proxy.go),
// which injects the DISCOGS_TOKEN server-side. The token never reaches the
// browser and never appears in a URL the client builds.

function queryString(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            qs.set(key, value);
        }
    });
    return qs.toString();
}

async function searchDiscogs(params: Record<string, string | undefined>): Promise<any> {
    return await apiFetch<any>(`/discogs/search?${queryString(params)}`);
}

async function getTracks(data: DiscogsData): Promise<any> {
    const result = await apiFetch<any>(`/discogs/tracks?${queryString({ type: data.type, id: String(data.id) })}`);
    return result["tracklist"];
}

async function GetDiscogs(album: AlbumData): Promise<DiscogsData[]> {
    try {
        let data = await searchDiscogs({
            artist: album.artist,
            release_title: album.title,
            barcode: album.barcode,
        });
        data = data["results"];

        if (data === undefined || data.length === 0) {
            const dataFiltered = (await searchDiscogs({
                artist: album.artist,
                release_title: album.title,
            }))["results"];

            if (dataFiltered === undefined || dataFiltered.length === 0) {
                return [] as DiscogsData[];
            }
            data = dataFiltered;
        }

        let discogsData = data as DiscogsData[];
        if (discogsData === undefined || discogsData.length === 0) {
            return [] as DiscogsData[];
        }

        const tracks = await getTracks(discogsData[0]);
        const urlsList: { id: number, uri: string }[] = data.map((item: any) => ({
            id: item["id"] as number,
            uri: item["uri"] as string,
        }));

        discogsData.forEach((item) => {
            item.len = 1;
            item.tracks = tracks;
            item.urls = urlsList as [{ id: number, uri: string }];
        });

        return discogsData;
    } catch (error) {
        console.error(error);
        return [] as DiscogsData[];
    }
}

async function GetById(discogsId: string) {
    const REGEX = /\d+/g;
    const discogsIdFiltered = discogsId.match(REGEX);
    if (discogsIdFiltered === null) {
        return {} as DiscogsData;
    }

    try {
        const data = await apiFetch<any>(`/discogs/release?${queryString({ id: discogsIdFiltered[0] })}`);

        if (Object.prototype.hasOwnProperty.call(data, 'message')) {
            throw new Error(data.message);
        }

        let discogsData = {
            country: data["country"] ?? "",
            id: data["id"] ?? 0,
            type: "release",
            master_id: data["master_id"] ?? 0,
            master_url: data["master_url"] ?? "",
            uri: data["uri"] ?? "",
            catno: data["catno"] ?? "",
            title: data["title"] ?? "",
            thumb: data["thumb"] ?? "",
            cover_image: data["images"][0]["uri"] ?? "",
            resource_url: data["resource_url"] ?? "",
            format_quantity: data["format_quantity"] ?? 0,
            urls: [
                {
                    id: data["id"],
                    uri: `/release${data["uri"].substring(data["uri"].lastIndexOf("/"))}`
                }
            ],
            len: 1,
            tracks: [
                {
                    position: "",
                    type_: "",
                    title: "",
                    duration: ""
                }
            ]
        } as DiscogsData;

        discogsData.tracks = await getTracks(discogsData);

        return discogsData;
    } catch (error) {
        console.error(error);
        return {} as DiscogsData;
    }
}

export {
    GetDiscogs,
    GetById
}
