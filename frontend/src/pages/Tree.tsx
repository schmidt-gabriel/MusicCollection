import { Container, Row, Col, Button, Accordion, Spinner } from 'react-bootstrap'
import Artists from '../services/Artists'
import { AlbumData } from '../models/Album';
import AlbumInfo from '../components/AlbumInfo';
import AlbumModals from '../components/AlbumModals';
import { useAlbumActions } from '../hooks/useAlbumActions';

const TreeList: React.FunctionComponent = () => {
    const actions = useAlbumActions();
    const albuns = actions.albuns ?? [];

    // Group artists by their initial letter; anything that does not
    // start with a letter (digits, symbols) goes under '#'.
    const artists = Artists();
    const groups: Record<string, typeof artists> = {};
    for (const artist of artists) {
        const first = artist.name.charAt(0).normalize('NFD').charAt(0).toUpperCase();
        const letter = /[A-Z]/.test(first) ? first : '#';
        if (!groups[letter]) {
            groups[letter] = [];
        }
        groups[letter].push(artist);
    }
    const letters = Object.keys(groups).sort();

    return (
        <>
            <div className="page-header">
                <h2>Árvore</h2>
                <small>navegue por artista</small>
            </div>
            <Container fluid className="panel d-flex flex-column"
                style={
                    {
                        padding: '1rem',
                        height: '88vh',
                    }
                }>
                <Row className="flex-grow-1" style={{ minHeight: 0 }}>
                    <Col xs={5}
                        style={
                            {
                                padding: '1rem',
                                height: '100%',
                                overflowY: 'auto',
                            }
                        }>
                        <Accordion>
                            {
                                letters.map((letter) => (
                                    <Accordion.Item eventKey={letter} key={letter}>
                                        <Accordion.Header>
                                            <span className="fw-bold">{letter}</span>
                                            <span className="ms-2 text-muted">({groups[letter].length})</span>
                                        </Accordion.Header>
                                        <Accordion.Body>
                                            <Accordion>
                                                {
                                                    groups[letter].map((artist, index) => {
                                                        return (
                                                            <Accordion.Item eventKey={index.toString()} key={artist.name} onClick={
                                                                () => {
                                                                    actions.loadAlbums(artist.name)
                                                                }
                                                            }>
                                                                <Accordion.Header>{artist.name}</Accordion.Header>
                                                                <Accordion.Body>
                                                                    {
                                                                        actions.loading || albuns.length === 0 ? <Spinner animation="border" /> :
                                                                            albuns.map((album, index) => {
                                                                                return (
                                                                                    <Button key={index} variant="link" className="tree-album-btn"
                                                                                        onClick={
                                                                                            () => {
                                                                                                actions.setAlbumInfo(album)
                                                                                            }
                                                                                        }>
                                                                                        {album.releaseYear} - {album.title}</Button>
                                                                                )
                                                                            })
                                                                    }
                                                                </Accordion.Body>
                                                            </Accordion.Item>
                                                        )
                                                    })
                                                }
                                            </Accordion>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                ))
                            }
                        </Accordion>
                    </Col>
                    <Col xs={6}
                        style={
                            {
                                padding: '1rem',
                                height: '100%',
                                overflowY: 'auto',
                            }
                        }>
                        <AlbumInfo
                            albumInfo={actions.albumInfo as AlbumData}
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

export default TreeList
