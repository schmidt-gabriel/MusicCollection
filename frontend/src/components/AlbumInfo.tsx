import { ReactNode, useState } from 'react'
import { AlbumData as Album } from '../models/Album'
import { Image, ListGroup, Row, Col, Container, Button, Badge, Card, Modal } from 'react-bootstrap'
import DateTimeFormat from '../services/Utils';
import * as FaIcons from 'react-icons/fa'
import { FetchLyrics } from '../services/Lyrics';
import LyricsModal from './LyricsModal';

function numberToLetter(number: number) {
    let result = '';
    do {
        const letter = String.fromCharCode(65 + (number % 26));
        result = letter + result;
        number = Math.floor(number / 26) - 1;
    } while (number >= 0)
    return result;
}

const InfoItem = ({ label, children, wide }: { label: string, children: ReactNode, wide?: boolean }) => (
    <div className={wide ? 'info-item wide' : 'info-item'}>
        <span className="info-label">{label}</span>
        <span className="info-value">{children === '' || children === undefined || children === null ? '—' : children}</span>
    </div>
)

const YesNo = ({ ok }: { ok: boolean }) => (
    ok
        ? <span className="text-success d-inline-flex align-items-center gap-1"><FaIcons.FaCheckCircle /> Sim</span>
        : <span className="text-muted d-inline-flex align-items-center gap-1"><FaIcons.FaTimesCircle /> Não</span>
)

const SelectArtist = ({ albumInfo, handleShowModal, setModalType, handleShowModalDelete, handleShowModalFixDiscogs }: {
    albumInfo: Album | undefined, handleShowModal: () => void,
    setModalType: (type: string) => void,
    handleShowModalDelete: () => void,
    handleShowModalFixDiscogs: () => void
}) => {
    const [showCover, setShowCover] = useState(false);
    const [lyricsOpen, setLyricsOpen] = useState(false);
    const [lyricsLoading, setLyricsLoading] = useState(false);
    const [lyricsTitle, setLyricsTitle] = useState('');
    const [lyricsPlain, setLyricsPlain] = useState('');
    const [lyricsSynced, setLyricsSynced] = useState('');

    if (albumInfo === undefined || albumInfo.title === '') {
        return (
            <Container className="panel" style={{ padding: '1rem', height: '100%' }}>
                <div className="empty-state">
                    <FaIcons.FaCompactDisc size={56} />
                    <div>
                        <div className="fw-semibold">Nenhum álbum selecionado</div>
                        <small>Selecione um álbum na lista para ver os detalhes</small>
                    </div>
                </div>
            </Container>
        );
    }

    const editionYear = isNaN(albumInfo.editionYear) || albumInfo.editionYear === 0 ? '' : albumInfo.editionYear;
    const discogsPinned = albumInfo.discogs.len === 1;
    const hasSpotify = albumInfo.spotify.external_urls.spotify !== '';

    // Fetch the lyrics from LRCLIB and show them in the modal (karaoke when the
    // track has synced/LRC lyrics, plain text otherwise).
    const openLyrics = async (trackTitle: string) => {
        setLyricsTitle(`${albumInfo.artist} - ${trackTitle}`);
        setLyricsPlain('');
        setLyricsSynced('');
        setLyricsLoading(true);
        setLyricsOpen(true);
        const res = await FetchLyrics(albumInfo.artist, trackTitle, albumInfo.title);
        setLyricsLoading(false);
        setLyricsPlain(res?.plainLyrics ?? '');
        setLyricsSynced(res?.syncedLyrics ?? '');
    };

    return (
        <Container fluid className="panel" style={{ padding: '1.5rem', height: '100%', overflowY: 'auto' }}>
            {/* Hero: cover + title/artist + quick badges */}
            <div className="album-hero">
                <Image
                    className="album-hero-cover"
                    src={albumInfo.discogs.cover_image}
                    alt="Capa do Album"
                    role="button"
                    title="Clique para ampliar"
                    onClick={() => albumInfo.discogs.cover_image && setShowCover(true)}
                />
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <h3 className="album-hero-title">{albumInfo.title}</h3>
                    <div className="album-hero-artist">{albumInfo.artist}</div>
                    <div className="d-flex gap-2 flex-wrap mt-3">
                        <Button size="sm" variant="success"
                            onClick={() => window.open(albumInfo.spotify.external_urls.spotify, '_blank')}
                            disabled={!hasSpotify}>
                            <FaIcons.FaSpotify className="me-1" /> Spotify
                        </Button>
                        <Button size="sm" variant="dark"
                            onClick={() => {
                                if (albumInfo.discogs.uri.startsWith('https://www.discogs.com/')) {
                                    window.open(albumInfo.discogs.uri, '_blank')
                                } else {
                                    window.open('https://www.discogs.com/release/' + albumInfo.discogs.id, '_blank')
                                }
                            }}
                            disabled={albumInfo.discogs.uri === ''}>
                            <FaIcons.FaRecordVinyl className="me-1" /> Discogs
                        </Button>
                        <Button size="sm" variant="primary"
                            onClick={() => { handleShowModal(); setModalType('Editar Album') }}>
                            <FaIcons.FaEdit className="me-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline-warning"
                            onClick={() => handleShowModalFixDiscogs()}>
                            <FaIcons.FaTools className="me-1" /> Corrigir Discogs
                        </Button>
                        <Button size="sm" variant="outline-danger"
                            onClick={() => handleShowModalDelete()}>
                            <FaIcons.FaTrash className="me-1" /> Deletar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Technical details */}
            <div className="section-title">Detalhes</div>
            <div className="info-grid">
                <InfoItem label="Mídia">{albumInfo.media}</InfoItem>
                <InfoItem label="Ano">{albumInfo.releaseYear || ''}</InfoItem>
                <InfoItem label="Origem">{albumInfo.origin}</InfoItem>
                <InfoItem label="Ano de Edição">{editionYear}</InfoItem>
                <InfoItem label="Compra">{DateTimeFormat(albumInfo.purchase)}</InfoItem>
                <InfoItem label="Barcode">{albumInfo.barcode}</InfoItem>
                <InfoItem label="IFPI Mastering">{albumInfo.ifpiMastering}</InfoItem>
                <InfoItem label="IFPI Mould">{albumInfo.ifpiMould}</InfoItem>
                {albumInfo.discs?.[0]?.matriz ? null : <InfoItem label="Matriz">{albumInfo.matriz}</InfoItem>}
                <InfoItem label="Lote">{albumInfo.lote}</InfoItem>
                <InfoItem label="Discogs Fixado"><YesNo ok={discogsPinned} />{!discogsPinned && albumInfo.discogs.len ? ` (${albumInfo.discogs.len})` : ''}</InfoItem>
                <InfoItem label="Spotify"><YesNo ok={hasSpotify} /></InfoItem>
                {/* Observação can be long: keep it last and let it span the full width. */}
                <InfoItem label="Observação" wide>{albumInfo.obs}</InfoItem>
            </div>

            {/* Discs */}
            {albumInfo.discs && albumInfo.discs.length > 0 && (
                <>
                    <div className="section-title">Discos</div>
                    <Row className="g-3">
                        {albumInfo.discs.map((disc) => (
                            <Col xs={12} md={6} key={disc.discNumber}>
                                <Card>
                                    <Card.Header>Disco {disc.discNumber}</Card.Header>
                                    <ListGroup variant="flush">
                                        {albumInfo?.media.startsWith('VINIL') ? <ListGroup.Item>Peso: {disc.weight} g</ListGroup.Item> : ''}
                                        {albumInfo?.media.startsWith('VINIL') ? (
                                            disc.matriz.map((matriz, index) => (
                                                <ListGroup.Item key={matriz}>Matriz {numberToLetter(index)}: {matriz}</ListGroup.Item>
                                            ))
                                        ) : <ListGroup.Item>Matriz: {disc.matriz[0]}</ListGroup.Item>}
                                    </ListGroup>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </>
            )}

            {/* Track list */}
            <div className="section-title">Lista de Músicas</div>
            <ListGroup as="ol" numbered style={{ maxHeight: '30vh', overflowY: 'auto' }}>
                {albumInfo.discogs.tracks && albumInfo.discogs.tracks.length > 0
                    ? albumInfo.discogs.tracks.map((item, idx) => (
                        <ListGroup.Item
                            as="li"
                            className="d-flex justify-content-between align-items-center gap-2"
                            key={item.title + item.position + idx.toString()}
                        >
                            <div className="ms-2 me-auto">
                                <div className="fw-semibold">{item.title}</div>
                            </div>
                            {item.duration && <Badge bg="primary" pill>{item.duration}</Badge>}
                            {item.title && (
                                <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    className="d-inline-flex align-items-center gap-1"
                                    title="Ver a letra"
                                    onClick={() => openLyrics(item.title)}
                                >
                                    <FaIcons.FaMicrophoneAlt /> Letra
                                </Button>
                            )}
                        </ListGroup.Item>
                    ))
                    : <ListGroup.Item className="text-muted">Sem faixas cadastradas</ListGroup.Item>}
            </ListGroup>

            <div className="mt-3" style={{ fontSize: '0.68rem', opacity: 0.4 }}>
                ID: <code style={{ fontSize: 'inherit', color: 'inherit' }}>{albumInfo.id || '(novo)'}</code>
            </div>

            <Modal show={showCover} onHide={() => setShowCover(false)} centered dialogClassName="cover-modal">
                <Modal.Body
                    className="p-0 d-flex justify-content-center"
                    style={{ cursor: 'zoom-out' }}
                    onClick={() => setShowCover(false)}
                >
                    <Image
                        src={albumInfo.discogs.cover_image}
                        alt={albumInfo.title}
                        style={{ maxHeight: '85vh', maxWidth: '90vw', width: 'auto', borderRadius: '12px' }}
                    />
                </Modal.Body>
            </Modal>

            <LyricsModal
                show={lyricsOpen}
                onHide={() => setLyricsOpen(false)}
                title={lyricsTitle}
                loading={lyricsLoading}
                plainLyrics={lyricsPlain}
                syncedLyrics={lyricsSynced}
            />
        </Container>
    );
}

export default SelectArtist;
