import { Container, ListGroup } from 'react-bootstrap'
import {AlbumData} from '../models/Album'

const ModalDelete = ({ albuns, setAlbumInfo }: {
    albuns: AlbumData[],
    setAlbumInfo: Function
}) => {
    if (!Array.isArray(albuns)) {
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
        <Container className="panel" style={
            {
                padding: '1rem',
                height: '100%',
                overflowY: 'auto',
            }
        }>
            <ListGroup variant="flush">
                {albuns.map((item, _) => (
                    <ListGroup.Item
                        key={item.id}
                        action
                        className="album-list-item d-flex align-items-center gap-3"
                        style={{ borderRadius: '0.75rem', cursor: 'pointer' }}
                        onClick={
                            () => {
                                setAlbumInfo(item)
                            }
                        }>
                        <img
                            src={item.discogs.cover_image}
                            alt={item.title}
                            style={{ width: '3.5rem', height: '3.5rem', objectFit: 'cover', borderRadius: '0.5rem', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                            <div className="fw-semibold text-truncate">{item.title}</div>
                            <div className="text-muted text-truncate">{item.artist}</div>
                        </div>
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </Container>
    );
}

export default ModalDelete;