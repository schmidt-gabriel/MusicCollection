interface Discogs {
    country: string,
    id: number,
    type: string,
    master_id: number,
    master_url: string,
    uri: string,
    catno: string,
    title: string,
    thumb: string,
    cover_image: string,
    format: string[],
    resource_url: string,
    year: string,
    format_quantity: number,
    urls: [
        {
            id: number,
            uri: string
        }
    ],
    len: number,
    tracks: [
        {
            position: string,
            type_: string,
            title: string,
            duration: string
        }
    ]
}

export default Discogs;