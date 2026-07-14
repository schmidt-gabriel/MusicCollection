import {AlbumData as Album} from '../models/Album'
import { Modal, Button } from 'react-bootstrap'

const ModalDelete = ({ albumInfo, showModalDelete, handleCloseModalDelete, removeAlbum }: {
    albumInfo: Album,
    showModalDelete: boolean,
    handleCloseModalDelete: () => void,
    removeAlbum: (album: Album) => void

}) => {

    return (
        <Modal show={showModalDelete} onHide={handleCloseModalDelete}>
            <Modal.Header closeButton>
                <Modal.Title>Deletar Album</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>
                    Tem certeza que deseja deletar o album:
                </p>
                <p>
                    Titulo:
                </p>
                <h4>
                    {albumInfo?.title}
                </h4>
                <hr />
                <p>
                    Artista:
                </p>
                <h4>
                    {albumInfo?.artist}
                </h4>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="danger" onClick={
                    () => {
                        removeAlbum(albumInfo)
                    }
                }>Deletar</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ModalDelete;