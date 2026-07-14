import { useEffect, useState } from 'react';
import { apiFetch } from './Api';
import Artist from '../models/Artist'

async function fetchArtists(): Promise<string[]> {
    const data = await apiFetch<string[] | null>('/artists');
    return Array.isArray(data) ? data : [];
}

function Artists(): Artist[] {
    const [artists, setArtists] = useState<string[]>([]);
    useEffect(() => {
        fetchArtists()
            .then(setArtists)
            .catch((e) => console.error("Failed to load artists", e));
    }, []);

    return artists.map((item) => {
        return (
            { id: item, name: item }
        )
    })
}

export default Artists;
