import { useCallback, useEffect, useState } from 'react'
import { Row, Col, Container, ListGroup, Spinner, Form } from 'react-bootstrap'
import { FaCompactDisc } from 'react-icons/fa'

import { AlbumData } from '../models/Album'
import { FetchRecentAlbums, DateAddedFromId } from '../services/Albums'
import AlbumInfo from '../components/AlbumInfo'
import AlbumModals from '../components/AlbumModals'
import { useAlbumActions } from '../hooks/useAlbumActions'
import { showToast } from '../components/Toasts'

const LIMITS = [20, 50, 100, 200];

function formatAdded(id: string): string {
    const date = DateAddedFromId(id);
    return date ? date.toLocaleDateString('pt-BR') : '';
}

const Recent: React.FunctionComponent = () => {
    const [limit, setLimit] = useState(50);

    const actions = useAlbumActions({ reload: () => load() });
    const { albuns, setAlbuns, setAlbumInfo, albumInfo } = actions;
    const [loading, setLoading] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        FetchRecentAlbums(limit)
            .then(setAlbuns)
            .catch(() => showToast("Não foi possível carregar os discos", "danger"))
            .finally(() => setLoading(false));
    }, [limit, setAlbuns]);

    useEffect(() => { load(); }, [load]);

    const list = albuns ?? [];

    return (
        <>
            <div className="page-header">
                <h2>Recém adicionados</h2>
                <small>últimos álbuns incluídos na coleção</small>
            </div>
            <Container fluid className="panel d-flex flex-column" style={{ padding: '1.25rem', height: '88vh' }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                    <Form.Label htmlFor="recent-limit" className="mb-0">Mostrar</Form.Label>
                    <Form.Select
                        id="recent-limit"
                        size="sm"
                        style={{ width: 'auto' }}
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                    >
                        {LIMITS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </Form.Select>
                </div>
                <Row className="flex-grow-1" style={{ minHeight: 0 }}>
                    <Col xs="auto" className="h-100" style={{ maxWidth: '50%' }}>
                        <Container className="panel" style={{ padding: '1rem', height: '100%', minWidth: '16rem', overflowY: 'auto' }}>
                            {loading ? <Spinner animation="border" /> :
                                list.length === 0 ? (
                                    <div className="empty-state">
                                        <FaCompactDisc size={40} />
                                        <small>Nenhum álbum encontrado</small>
                                    </div>
                                ) : (
                                    <ListGroup variant="flush">
                                        {list.map((item: AlbumData) => (
                                            <ListGroup.Item
                                                key={item.id}
                                                action
                                                active={albumInfo?.id === item.id}
                                                className="album-list-item d-flex align-items-center gap-3"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setAlbumInfo(item)}
                                            >
                                                <img
                                                    src={item.discogs?.cover_image}
                                                    alt={item.title}
                                                    style={{ width: '3.5rem', height: '3.5rem', objectFit: 'cover', borderRadius: '0.5rem', flexShrink: 0 }}
                                                />
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="fw-semibold text-truncate">{item.title}</div>
                                                    <div className="text-muted text-truncate">{item.artist}</div>
                                                    {formatAdded(item.id) && (
                                                        <small className="text-muted">Adicionado em {formatAdded(item.id)}</small>
                                                    )}
                                                </div>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                )}
                        </Container>
                    </Col>
                    <Col className="h-100" style={{ minWidth: 0 }}>
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

export default Recent
