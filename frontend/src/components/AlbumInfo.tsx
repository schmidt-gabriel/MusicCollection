import { AlbumData as Album } from '../models/Album'
import { Image, ListGroup, Row, Col, Container, Button, Badge, Card } from 'react-bootstrap'
import DateTimeFormat from '../services/Utils';
import * as FaIcons from 'react-icons/fa'

function numberToLetter(number: number) {
    let result = '';
    do {
        const letter = String.fromCharCode(65 + (number % 26));
        result = letter + result;
        number = Math.floor(number / 26) - 1;
    } while (number >= 0)
    return result;
}

const SelectArtist = ({ albumInfo, handleShowModal, setModalType, handleShowModalDelete, handleShowModalFixDiscogs }: {
    albumInfo: Album | undefined, handleShowModal: () => void,
    setModalType: (type: string) => void,
    handleShowModalDelete: () => void,
    handleShowModalFixDiscogs: () => void
}) => {
    if (albumInfo === undefined || albumInfo.title === '') {
        return (
            <Container className="panel" style={
                {
                    padding: '1rem',
                    height: '100%',
                }
            }>
            </Container>
        );
    }
    return (
        <Container fluid className="panel" style={
            {
                padding: '1.25rem',
                height: '100%',
                overflowY: 'auto',
            }
        }>
            <h4 className="fw-bold mb-3">Informações do Album</h4>
            <Row>
                <Col>
                    <Image src={albumInfo.discogs.cover_image}
                        alt='Capa do Album' thumbnail />
                </Col>
                <Col>
                    <ListGroup variant="flush">
                        <ListGroup.Item>Ano: {albumInfo.releaseYear}</ListGroup.Item>
                        <ListGroup.Item>Artista: {albumInfo.artist}</ListGroup.Item>
                        <ListGroup.Item>Título: {albumInfo.title}</ListGroup.Item>
                        <ListGroup.Item>Mídia: {albumInfo.media}</ListGroup.Item>
                        <ListGroup.Item>Compra: {
                            DateTimeFormat(albumInfo.purchase)
                        }</ListGroup.Item>
                        <ListGroup.Item>Origem: {albumInfo.origin}</ListGroup.Item>
                        <ListGroup.Item>Ano de Edição: {isNaN(albumInfo.editionYear) || albumInfo.editionYear === 0 ? '' : albumInfo.editionYear}</ListGroup.Item>
                        <ListGroup.Item>IFPI Mastering: {albumInfo.ifpiMastering}</ListGroup.Item>
                        <ListGroup.Item>IFPI Mould: {albumInfo.ifpiMould}</ListGroup.Item>
                        <ListGroup.Item>Barcode: {albumInfo.barcode}</ListGroup.Item>
                        {albumInfo.discs?.[0]?.matriz ? '' : <ListGroup.Item>Matriz: {albumInfo.matriz}</ListGroup.Item>}
                        <ListGroup.Item>Lote: {albumInfo.lote}</ListGroup.Item>
                        <ListGroup.Item>Observação: {albumInfo.obs}</ListGroup.Item>
                        <ListGroup.Item>Discogs Fixado {albumInfo.discogs.len === 1 ? <FaIcons.FaCheckSquare></FaIcons.FaCheckSquare> : <FaIcons.FaTimes></FaIcons.FaTimes>} {albumInfo.discogs.len !== 1 ? albumInfo.discogs.len : ""}</ListGroup.Item>
                        <ListGroup.Item>Spotify {albumInfo.spotify.external_urls.spotify !== "" ? <FaIcons.FaCheckSquare></FaIcons.FaCheckSquare> : <FaIcons.FaTimes></FaIcons.FaTimes>}</ListGroup.Item>
                    </ListGroup>
                </Col>
            </Row>
            <br />
            <Row>
                <Col>
                    {albumInfo.discs ? albumInfo.discs.map((disc, _) => (
                        <Card key={disc.discNumber} style={{ width: 'auto', marginBottom: '1rem' }}>
                            <Card.Header>Disco {disc.discNumber}</Card.Header>
                            <ListGroup variant="flush">
                                {albumInfo?.media.startsWith('VINIL') ? <ListGroup.Item> Peso: {disc.weight} g</ListGroup.Item> : ''}
                                {albumInfo?.media.startsWith('VINIL') ? (
                                    disc.matriz.map((matriz, index) => (
                                        <ListGroup.Item key={matriz}>Matriz {numberToLetter(index)}: {matriz}</ListGroup.Item>
                                    ))
                                ) : <ListGroup.Item>Matriz: {disc.matriz[0]}</ListGroup.Item>}
                            </ListGroup>
                        </Card>
                    )) : ''}
                </Col>
            </Row>
            <br />
            <div className="d-flex gap-2 flex-wrap">
                    <Button variant="success" onClick={
                        () => {
                            window.open(albumInfo.spotify.external_urls.spotify, '_blank')
                        }

                    }
                        disabled={albumInfo.spotify.external_urls.spotify === ''}
                    >Spotify</Button>
                    <Button variant="dark" onClick={
                        () => {
                            if (albumInfo.discogs.uri.startsWith('https://www.discogs.com/')) {
                                window.open(albumInfo.discogs.uri, '_blank')
                            } else {
                                window.open('https://www.discogs.com/release/' + albumInfo.discogs.id, '_blank')
                            }
                        }

                    }
                        disabled={albumInfo.discogs.uri === ''}
                    >Discogs</Button>
                    <Button variant="primary" onClick={
                        () => {
                            handleShowModal();
                            setModalType('Editar Album')
                        }
                    }>
                        Editar
                    </Button>
                    <Button variant="danger" onClick={
                        () => {
                            handleShowModalDelete();
                        }
                    }>
                        Deletar
                    </Button>
                    <Button variant="warning"
                        onClick={
                            () => {
                                handleShowModalFixDiscogs();
                            }
                        }
                    >
                        Corrigir Discogs
                    </Button>
            </div>
            <br />
            <Row>
                <Col>
                    <h5 className="fw-bold">Lista de Músicas</h5>
                    <ListGroup as="ol" numbered className="panel" style={
                        {
                            padding: '1rem',
                            height: '30vh',
                            overflowY: 'auto',
                        }

                    }>
                        {albumInfo.discogs.tracks ? albumInfo.discogs.tracks.map((item, idx) => (
                            <ListGroup.Item
                                as="li"
                                className="d-flex justify-content-between align-items-start"
                                key={item.title + item.position + idx.toString()}
                            >
                                <div className="ms-2 me-auto">
                                    <div className="fw-bold">{item.title}</div>
                                </div>
                                <Badge bg="primary" pill>
                                    {item.duration}
                                </Badge>
                            </ListGroup.Item>
                        )) : ''}
                    </ListGroup>
                </Col>
            </Row>

            <Row>
                <Col>
                    <div className="text-muted small mt-2">
                        ID: <code>{albumInfo.id || '(novo)'}</code>
                    </div>
                </Col>
            </Row>

        </Container>
    );
}

export default SelectArtist;
