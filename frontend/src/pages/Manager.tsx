import React, { useEffect, useState } from 'react'
import { Row, Col, Container, Button, Spinner } from 'react-bootstrap';
import { ReactSearchAutocomplete } from 'react-search-autocomplete';

import { AlbumData, Discs } from '../models/Album'
import Artist from '../models/Artist'

import Artists from '../services/Artists'
import { Aggregate, FetchAlbumByTitle } from '../services/Albums';

import SelectArtist from '../components/SelectArtists';
import AlbumInfo from '../components/AlbumInfo';
import Discograpy from '../components/Discography';
import AlbumModals from '../components/AlbumModals';
import { useAlbumActions } from '../hooks/useAlbumActions';
import { showToast } from '../components/Toasts';
import { FaSpotify } from 'react-icons/fa';

const Home: React.FunctionComponent = () => {
    const actions = useAlbumActions();
    const [artist, setArtist] = useState<Artist>();
    const [titleCatalog, setTitleCatalog] = useState<{ id: string; title: string; artist: string }[]>([]);

    const { albuns, albumInfo } = actions;

    // Light id/title/artist catalog loaded once so the title autocomplete
    // searches locally (the component does not refresh async results).
    useEffect(() => {
        Aggregate([{ $project: { TITLE: 1, ARTIST: 1 } }])
            .then((docs) => setTitleCatalog(
                (docs as Record<string, unknown>[])
                    .map((doc) => ({
                        id: String(doc._id ?? ''),
                        title: String(doc.TITLE ?? ''),
                        artist: String(doc.ARTIST ?? ''),
                    }))
                    .filter((entry) => entry.id !== '' && entry.title !== '')
            ))
            .catch((e) => console.error("Failed to load title catalog", e));
    }, []);

    const handleSelectArtist = (item: { id: string; name: string; }) => {
        actions.clearContent();
        setArtist({ id: item.name, name: item.name });
        actions.loadAlbums(item.name);
    }

    const handleSelectTitle = (item: { id: string; name: string; }) => {
        const entry = titleCatalog.find((candidate) => candidate.id === item.id);
        if (!entry) return;
        setArtist(undefined);
        FetchAlbumByTitle(entry.title)
            .then((matches) => {
                const selected = matches.find((album) => album.id === entry.id) ?? matches[0];
                if (selected) {
                    actions.setAlbuns([selected]);
                    actions.setAlbumInfo(selected);
                }
            })
            .catch(() => showToast("Não foi possível buscar por título", "danger"));
    }

    const spotifyArtist = albuns && albuns.length > 0 ? albuns[0].spotify?.artists : undefined;

    return (
        <>
            <div className="page-header">
                <h2>Gerenciador de Albuns</h2>
                <small>Busque por Artista ou Título</small>
            </div>
            <Container fluid className="panel d-flex flex-column" style={
                {
                    padding: '1.25rem',
                    height: '88vh',
                }

            }>
                <div className="d-flex align-items-center gap-2 flex-wrap" style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{ flex: '1 1 260px', minWidth: '260px', maxWidth: '360px' }}>
                        <SelectArtist
                            items={Artists()}
                            handleSelectArtist={handleSelectArtist}
                            clearContent={actions.clearContent}
                        />
                    </div>
                    <div>
                        <Button variant="graphite"
                            style={
                                {
                                    height: '50px',
                                    borderRadius: '1rem',
                                    paddingInline: '1.5rem',
                                }
                            }
                            onClick={
                                () => {
                                    actions.setAlbumInfo(
                                        {
                                            id: '',
                                            title: '',
                                            media: 'CD',
                                            artist: artist?.name as string,
                                            discogs: {
                                                cover_image: '',
                                                uri: ''
                                            },
                                            spotify: {
                                                external_urls: {
                                                    spotify: ''
                                                }
                                            },
                                            discs: [
                                                {
                                                    discNumber: '1',
                                                    weight: '',
                                                    matriz: ['NA']
                                                }
                                            ] as Discs[],
                                        } as AlbumData
                                    );
                                    setTimeout(() => {
                                        actions.setModalType('Adicionar Album')
                                        actions.handleShowModal();
                                    }, 100);
                                }
                            }>Adicionar</Button>
                    </div>
                    <div style={{ flex: '1 1 240px', minWidth: '240px', maxWidth: '360px' }}>
                        <ReactSearchAutocomplete
                            items={titleCatalog.map((entry) => ({ id: entry.id, name: `${entry.title} · ${entry.artist}` }))}
                            onSelect={handleSelectTitle}
                            placeholder='Buscar por Título'
                            styling={
                                {
                                    height: '50px',
                                    borderRadius: '1rem',
                                    boxShadow: '0 1px 6px 0 rgba(32,33,36,0.28)',
                                    zIndex: 999
                                }
                            }
                        />
                    </div>
                    <div>
                        {spotifyArtist ?
                            <FaSpotify size={50} color={'green'}
                                onClick={
                                    () => {
                                        window.open(spotifyArtist[0]["external_urls"]["spotify"], '_blank')
                                    }
                                }
                                style={{ cursor: 'pointer' }}
                            /> : <></>
                        }
                    </div>
                </div>
                <br />
                <Row className="flex-grow-1" style={{ minHeight: 0 }}>
                    <Col className="h-100">
                        {actions.loading
                            ? <Spinner animation="border" />
                            : <Discograpy
                                albuns={albuns as AlbumData[]}
                                setAlbumInfo={actions.setAlbumInfo}
                            />
                        }
                    </Col>
                    <Col className="h-100">
                        <AlbumInfo
                            albumInfo={albumInfo as AlbumData}
                            handleShowModalDelete={actions.handleShowModalDelete}
                            handleShowModalFixDiscogs={actions.handleShowModalFixDiscogs}
                            handleShowModal={actions.handleShowModal}
                            setModalType={actions.setModalType}
                        />
                    </Col>
                </Row>
            </Container>
            <AlbumModals actions={actions} />
        </>
    )
}

export default Home
