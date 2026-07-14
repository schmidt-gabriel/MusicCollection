import { Container, Row, Col, Card } from 'react-bootstrap'
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
            <Row>
                {albuns.map((item, _) => (
                    <Col key={item.id} style={{ padding: '1rem' }}>
                        <Card className="album-card" style={
                            {
                                width: '20rem',
                                borderRadius: '1rem',
                            }
                        }
                            key={item.id}
                            onClick={
                                () => {
                                    setAlbumInfo(item)
                                }
                            }>
                            <Card.Img variant="top" src={item.discogs.cover_image} style={{ width: '18rem', height: '18rem', paddingLeft: '1rem', paddingTop: '1rem' }} />
                            <Card.Body>
                                <Card.Title>{item.title}</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">{item.artist}</Card.Subtitle>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
}

export default ModalDelete;