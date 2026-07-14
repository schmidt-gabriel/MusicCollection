import { Modal, Button, Card, Row, Col, Container } from 'react-bootstrap'
import DiscogsData from '../models/Discogs';

const ModaldiscogsChoose = ({ showModalDiscogsChoose, discogsData, handleCloseModalDiscogsChoose, setDiscogsChoose }: {
    showModalDiscogsChoose: boolean,
    discogsData: DiscogsData[],
    handleCloseModalDiscogsChoose: () => void,
    setDiscogsChoose: (value: DiscogsData) => void

}) => {

    return (
        <Modal show={showModalDiscogsChoose} onHide={handleCloseModalDiscogsChoose} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>Escolha a Edição Discogs</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Container>
                    <Row>
                        {discogsData.map((item, index) => (
                            <Col key={item.id} xs={2} style={
                                {
                                    padding: '1rem',
                                    height: '100%',
                                    borderRadius: '1rem',
                                    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                                    margin: '1rem',
                                }

                            }>
                                <Card style={{ width: '10rem' }}>
                                    <Card.Img variant="top" src={item.thumb} style={
                                        {
                                            height: '10rem',
                                            width: '10rem',
                                            objectFit: 'cover'
                                        }
                                    
                                    }/>
                                    <Card.Body>
                                        <Card.Title>{item.title}</Card.Title>
                                        <Button variant="info" onClick={() => {
                                            window.open('https://www.discogs.com' + item.uri, '_blank')
                                        }}>Discogs</Button>
                                        <hr />
                                        <Button variant="primary" onClick={() => setDiscogsChoose(item)}>Escolher</Button>
                                    </Card.Body>
                                    <Card.Footer>
                                        <br />
                                        <ul>
                                            <li key={item.format[0]} className="text-muted">{item.format[0]}</li>
                                            <li key={item.country} className="text-muted">{item.country}</li>
                                        </ul>

                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </Modal.Body>
        </Modal>
    );
}

export default ModaldiscogsChoose;