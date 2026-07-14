import { Modal, Row, Col, Table, Spinner } from 'react-bootstrap'
import { FaRecordVinyl, FaCompactDisc, FaEdit, FaTrash } from 'react-icons/fa'
import ModalEdit from '../components/ModalEdit';
import ModalDelete from '../components/ModalDelete';
import { useState } from 'react';
import {AlbumData} from '../models/Album'
import { FetchAlbumByTitle, RemoveAlbum } from '../services/Albums';

const ModalAlbum = ({ modalValue, showModal, modalYear, handleCloseModal }: {
    modalValue: Record<string, string>[] | undefined,
    showModal: boolean,
    modalYear: string,
    handleCloseModal: () => void,

}) => {
    const [showModalEdit, setShowModalEdit] = useState<boolean>(false);

    const [showModalDelete, setShowModalDelete] = useState<boolean>(false);
    const handleCloseModalDelete = () => setShowModalDelete(false);

    const [albumInfo, setAlbumInfo] = useState<AlbumData>();

    if (modalValue === undefined) {
        return (
            <></>
        );
    }

    function handleCloseEditModal() {
        setShowModalEdit(false);
    }

    function handleShowDeleteModal(album: Record<string, string>) {
        FetchAlbumByTitle(album.title).then((data) => {
            setAlbumInfo(data[0]);
        })
        setShowModalDelete(true);
    }

    function handleShowEditModal(album: Record<string, string>) {
        FetchAlbumByTitle(album.title).then((data) => {
            setAlbumInfo(data[0]);
            setShowModalEdit(true);
        })
    }

    function removeAlbum(albumInfo: AlbumData) {
        RemoveAlbum(albumInfo.id).then((_) => {
            setAlbumInfo(undefined);
            setShowModalDelete(false);
            modalValue = modalValue?.filter((album) => album.title !== albumInfo.title);
        });
    }



    return (
        <>
            <Modal show={showModal} onHide={handleCloseModal} size="xl" >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <Row>
                            <Col>
                                <h1>Albums de {modalYear}</h1>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <h2>Total: {modalValue ? modalValue.length : 0}</h2>
                            </Col>
                        </Row>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Table>
                        <thead>
                            <tr>
                                <th></th>
                                <th>Artista</th>
                                <th>Album</th>
                                <th>Media</th>
                                <th>Data de Compra</th>
                                <th></th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                modalValue ?
                                    modalValue.map((album, _) => {
                                        return <tr key={album.title + album.purchase}>
                                            {
                                                album.media.startsWith('VINIL') ? <td><FaRecordVinyl color='black' /></td> : <td><FaCompactDisc color='grey' /></td>
                                            }
                                            <td>{album.artist}</td>
                                            <td>{album.release ? album.release + " - " + album.title : album.title}</td>
                                            <td>{album.media}</td>
                                            <td>{album.purchase ? album.purchase.split("-")[2] + "/" + album.purchase.split("-")[1] + "/" + album.purchase.split("-")[0] : ""}</td>
                                            <td><FaEdit
                                                onClick={
                                                    () => handleShowEditModal(album)
                                                }
                                                style={
                                                    {
                                                        cursor: 'pointer'
                                                    }
                                                }
                                            >Editar</FaEdit>
                                            </td>
                                            <td><FaTrash
                                                onClick={
                                                    () => { handleShowDeleteModal(album) }
                                                }
                                                style={
                                                    {
                                                        cursor: 'pointer'
                                                    }
                                                }
                                            >Deletar</FaTrash>
                                            </td>
                                        </tr>
                                    }) : <tr><td><Spinner animation="border" /></td></tr>
                            }
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    Vinil: <FaRecordVinyl color='black' /> CD: <FaCompactDisc color='grey' />
                </Modal.Footer>
            </Modal>
            <ModalEdit
                albumInfo={albumInfo as AlbumData}
                showModal={showModalEdit}
                handleCloseModal={handleCloseEditModal}
                modalType='Editar Album'
            />
            <ModalDelete
                albumInfo={albumInfo as AlbumData}
                showModalDelete={showModalDelete}
                handleCloseModalDelete={handleCloseModalDelete}
                removeAlbum={removeAlbum}
            />
        </>
    );
}

export default ModalAlbum;