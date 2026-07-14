import {AlbumData} from '../models/Album';
import DiscogsData from '../models/Discogs';


let tokenDiscogs = "" as string;

async function GetTokenDiscogs() {
    if (tokenDiscogs !== "") {
        return tokenDiscogs;
    }
    // Set from the ID token custom claims on login (see app.tsx).
    tokenDiscogs = sessionStorage.getItem("DISCOGS_TOKEN") ?? "";
    return tokenDiscogs;
}

function objToQueryString(obj: { [key: string]: any }) {
    const keyValuePairs = [];
    for (const key in obj) {
        keyValuePairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
    }
    return keyValuePairs.join('&');
}

async function fetchDiscogs(queryParameters: Object): Promise<Response> {
    const requestOptions = {
        method: 'GET',
    };

    const queryString = objToQueryString(queryParameters);

    return await fetch(`https://api.discogs.com/database/search?${queryString}`, requestOptions);;
}

async function getTracks(data: DiscogsData): Promise<any> {
    const tracks = await fetch(`https://api.discogs.com/${data.type}s/${data.id}`);
    const result = await tracks.json();
    return result["tracklist"];
}

async function GetDiscogs(album: AlbumData): Promise<DiscogsData[]> {
    let queryParameters: Record<string, string> = {
        "token": await GetTokenDiscogs(),
        "artist": album.artist,
        "release_title": album.title,
        "barcode": album.barcode
    };

    Object.keys(queryParameters).forEach(key => {
        if (queryParameters[key] === undefined) {
            delete queryParameters[key];
        }
    });

    const response = await fetchDiscogs(queryParameters);

    if (response.status === 200) {
        let data = await response.json();
        data = data["results"];

        if (data.isEmpty) {
            const queryParametersFiltered = {
                "token": await GetTokenDiscogs(),
                "artist": album.artist,
                "release_title": album.title,
            };
            const responseFiltered = await fetchDiscogs(queryParametersFiltered);
            let dataFiltered = await responseFiltered.json();
            dataFiltered = dataFiltered["results"];

            if (dataFiltered.isEmpty) {
                return [] as DiscogsData[];
            }
            data = dataFiltered;
        }
        if (data === undefined) {
            return [] as DiscogsData[];
        }

        let discogsData = data as DiscogsData[];

        if (discogsData === undefined || discogsData.length === 0) {
            return [] as DiscogsData[];
        }

        const tracks = await getTracks(discogsData[0]);
        let urlsList: [{ id: number, uri: string }] = [] as any;
        for (const item of data) {
            urlsList.push({
                id: item["id"] as number,
                uri: item["uri"] as string
            });
        }

        discogsData.forEach((item) => {
            item.len = 1;
            item.tracks = tracks;
            item.urls = urlsList;
        });

        return discogsData;
    } else {
        return [] as DiscogsData[];
    }
}

async function GetById(discogsId: string) {
    const queryParameters = {
        method: 'GET'
    };
    const REGEX = /\d+/g;
    const discogsIdFiltered = discogsId.match(REGEX);
    if (discogsIdFiltered === null) {
        return {} as DiscogsData;
    }

    try {
        const response = await fetch(`https://api.discogs.com/releases/${discogsIdFiltered[0]}?token=${await GetTokenDiscogs()}`, queryParameters);
        const data = await response.json();

        if (data.hasOwnProperty('message')) {
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
