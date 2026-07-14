import { Modal, Button, Form } from 'react-bootstrap'
import { useEffect, useState } from 'react';
import { AlbumData, Discs } from '../models/Album';
import Artists from '../services/Artists'
import { showToast } from './Toasts';
import { HandleAlbum, GetDiscogs } from '../services/Albums';
import ModaldiscogsChoose from './ModalDiscogsChoose';
import DiscogsData from '../models/Discogs';

function numberToLetter(number: number) {
    let result = '';
    do {
      const letter = String.fromCharCode(65 + (number % 26));
      result = letter + result;
      number = Math.floor(number / 26) - 1;
    } while (number >= 0)
    return result;
  }

const ModalEdit = ({ showModal, modalType, albumInfo, handleCloseModal, refreshArtists }: {
    showModal: boolean,
    modalType: string,
    albumInfo: AlbumData,
    handleCloseModal: () => void,
    refreshArtists?: (album: AlbumData) => void
}) => {
    const [setFieldsNA, setSetFieldsNA] = useState(false);
    const [newArtist, setNewArtist] = useState(false);
    const [validated, setValidated] = useState(false);
    const [discogsData, setDiscogsData] = useState([] as DiscogsData[]);
    const [album, setAlbum] = useState<AlbumData>(albumInfo);

    const [showModalDiscogsChoose, setShowModalDiscogsChoose] = useState(false);
    const handleShowModalDiscogsChoose = () => setShowModalDiscogsChoose(true);
    const handleCloseModalDiscogsChoose = () => setShowModalDiscogsChoose(false);

    useEffect(() => {
        setAlbum(albumInfo);
    }, [albumInfo]);

    function handleInputChange(title: string, event: any) {
        setAlbum({
            ...album,
            [title]: event
        });
    }

    const setDiscogsChoose = (value: DiscogsData) => {
        album.discogs = value;
        handleCloseModalDiscogsChoose();
        handleSave(album);
    }

    const handleSave = (album: AlbumData) => {
        HandleAlbum(album).then((res) => {
            handleCloseModal();
            // The backend returns the new 24-hex id on insert and a modified
            // count on update. Anything else ("Album already exists", a decode
            // error, etc.) means it did not save, so surface it instead of
            // silently reporting success.
            const message = String((res as Record<string, unknown>)?.Message ?? '');
            const saved = /^[a-f0-9]{24}$/i.test(message) || /^\d+$/.test(message);
            if (!saved) {
                showToast(`Não foi possível salvar: ${message || 'erro desconhecido'}`, 'danger');
                return;
            }
            if (refreshArtists !== undefined) {
                refreshArtists(album);
            }
        });
        setAlbum(albumInfo);
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        const form = event.currentTarget;
        event.preventDefault();
        if (form.checkValidity() === false) {
            showToast('Preencha todos os campos', 'warning');
            event.stopPropagation();
            return;
        }

        if (album.artist === undefined) {
            showToast('Selecione um artista', 'warning');
            event.stopPropagation();
            return;
        }

        if (album.title === undefined || album.title === '' || album.title.replace(/\s/g, "") === '') {
            showToast('Preencha o titulo', 'warning');
            event.stopPropagation();
            return;
        }
        if (album.media === undefined || album.media === '' || album.media.replace(/\s/g, "") === '') {
            album.media = 'CD';
        }
        if (album.discogs === undefined || album.discogs === null || album.discogs.id === 0 || album.discogs.cover_image === '') {
            GetDiscogs(album).then((data) => {
                setDiscogsData(data);
                if (data.length === 1 || data.length === 0) {
                    handleSave(album);
                } else {
                    handleShowModalDiscogsChoose();
                }
            });
        } else {
            handleSave(album);
        }
    }

    return (
        <>
            <Modal show={showModal} onHide={handleCloseModal}>
                <Form validated={validated} onSubmit={handleSubmit}>
                    <Modal.Header closeButton>
                        <Modal.Title>{modalType}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput1">
                            <Form.Label>Titulo</Form.Label>
                            <Form.Control
                                required
                                type="text"
                                defaultValue={album?.title}
                                autoFocus
                                onChange={
                                    (e) => handleInputChange('title', e.target.value.toUpperCase())
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput2">
                            <Form.Label>Artista</Form.Label>
                            <Form.Control
                                style={
                                    {
                                        display: newArtist ? 'block' : 'none'
                                    }
                                }
                                placeholder='Novo Artista'
                                type="text"
                                onChange={
                                    (e) => handleInputChange('artist', e.target.value.toUpperCase())
                                }
                            />
                            <Form.Select aria-label="Default select example"
                                style={
                                    {
                                        display: newArtist ? 'none' : 'block'
                                    }
                                }
                                onChange={
                                    (e) => handleInputChange('artist', e.target.value)
                                }
                                defaultValue={album?.artist}
                            >
                                <option value={""}>Selecione o Artista</option>
                                {Artists().map((item, _) => (
                                    <option key={item.name}>{item.name}</option>
                                ))}
                            </Form.Select>

                            {modalType !== 'Editar Album' ? <Form.Check
                                type="checkbox"
                                id="editForm.ControlInput2"
                                label="Novo Artista"
                                onChange={
                                    (e) => {
                                        if (e.target.checked) {
                                            setNewArtist(true);
                                        } else {
                                            setNewArtist(false);
                                        }
                                    }
                                }
                            /> : <></>}
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput3">
                            <Form.Label>Ano</Form.Label>
                            <Form.Control
                                required
                                type="number"
                                defaultValue={album?.releaseYear}
                                min={1900}
                                max={new Date().getFullYear() + 1}
                                onChange={
                                    (e) => handleInputChange('releaseYear', parseInt(e.target.value))
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput4">
                            <Form.Label>Origem</Form.Label>
                            <Form.Control
                                type="text"
                                defaultValue={album?.origin}
                                onChange={
                                    (e) => handleInputChange('origin', e.target.value)
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput5">
                            <Form.Label>Compra</Form.Label>
                            <Form.Control
                                type="date"
                                defaultValue={album?.purchase ? album.purchase.split('T')[0] : ''}
                                onChange={
                                    (e) => handleInputChange('purchase', e.target.value)
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput6">
                            <Form.Label>Mídia</Form.Label>
                            <Form.Select required aria-label="Default select example"
                                onChange={
                                    (e) => {
                                        handleInputChange('media', e.target.value)
                                        if (e.target.value.startsWith('VINIL')) {
                                            setSetFieldsNA(true);
                                        } else {
                                            setSetFieldsNA(false);
                                        }
                                    }
                                }
                                defaultValue={album?.media ? album?.media : "CD"}
                            >
                                <option>CD</option>
                                <option>CD &gt; DVD</option>
                                <option>CD &gt; Blu-ray</option>
                                <option>DVD</option>
                                <option>Blu-ray</option>
                                <option>VINIL</option>
                                <option>VINIL &gt; CD</option>
                                <option>VINIL &gt; MP3</option>
                                <option>VINIL 7'</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput7">
                            <Form.Label>Ano de Edição</Form.Label>
                            <Form.Control
                                type="number"
                                defaultValue={album?.editionYear ?? ''}
                                onChange={
                                    (e) => handleInputChange('editionYear', parseInt(e.target.value))
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput8">
                            <Form.Label>IFPI Mastering</Form.Label>
                            <Form.Control
                                type="text"
                                defaultValue={setFieldsNA ? "NA" : album?.ifpiMastering}
                                onChange={
                                    (e) => handleInputChange('ifpiMastering', e.target.value)
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput9">
                            <Form.Label>IFPI Mould</Form.Label>
                            <Form.Control
                                type="text"
                                defaultValue={setFieldsNA ? "NA" : album?.ifpiMould}
                                onChange={
                                    (e) => handleInputChange('ifpiMould', e.target.value)
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput10">
                            <Form.Label>Barcode</Form.Label>
                            <Form.Control
                                type="text"
                                defaultValue={album?.barcode}
                                onChange={
                                    (e) => handleInputChange('barcode', e.target.value)
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput12">
                            <Form.Label>Lote</Form.Label>
                            <Form.Control
                                type="text"
                                defaultValue={setFieldsNA ? "NA" : album?.lote}
                                onChange={
                                    (e) => handleInputChange('lote', e.target.value)
                                }
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="editForm.ControlInput13">
                            <Form.Label>Número de Discos</Form.Label>
                            <Form.Control
                                type="number"
                                min={1}
                                defaultValue={album?.discs ? album?.discs.length : 1}
                                onChange={
                                    (e) => {
                                        let len = album?.discs ? album?.discs.length : 1;
                                        if (parseInt(e.target.value) > len) {
                                            album?.discs.push({ discNumber: e.target.value, weight: 'NA', matriz: ['NA'] } as Discs)
                                        }
                                        else if (parseInt(e.target.value) < len) {
                                            album?.discs.pop();
                                        }
                                        handleInputChange('discs', album?.discs ? album?.discs : [{ discNumber: e.target.value, weight: 'NA', matriz: ['NA'] } as Discs])
                                    }
                                }
                            />
                        </Form.Group>
                        {!album?.discs ? <></> :
                            album?.discs.map((disc, _) => (
                                <div key={disc.discNumber}>
                                    {
                                        !(album?.media ?? '').startsWith('VINIL') ? <></> :

                                            <Form.Group className="mb-3" controlId={`editForm.ControlInputDiscDuration${disc.discNumber}`}>
                                                <Form.Label>Peso do Disco {disc.discNumber} (g)</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    defaultValue={disc.weight}
                                                    onChange={(e) => {
                                                        disc.weight = e.target.value;
                                                        handleInputChange('discs', album?.discs ? album?.discs : [{ discNumber: '1', weight: '', matriz: ['NA'] } as Discs])
                                                    }
                                                    }
                                                />
                                            </Form.Group>
                                    }
                                    {
                                        album?.media && !album.media.startsWith('VINIL') ? <Form.Group className="mb-3" controlId={`editForm.ControlInputDiscDuration${disc.discNumber}`}>
                                            <Form.Label>Matriz do Disco {disc.discNumber}</Form.Label>
                                            <Form.Control
                                                type="text"
                                                defaultValue={disc.matriz}
                                                onChange={(e) => {
                                                    disc.matriz[0] = e.target.value;
                                                    handleInputChange('discs', album?.discs ? album?.discs : [{ discNumber: '1', weight: 'NA', matriz: ['NA'] } as Discs])
                                                }}
                                            />
                                        </Form.Group> :
                                            <>{
                                                Array.from({ length: 2 }, (_, i) => {
                                                    return (
                                                        <Form.Group className="mb-3" controlId={`editForm.ControlInputDiscDuration${disc.discNumber}`} key={i}>
                                                            <Form.Label>Matriz do Lado {numberToLetter(i)}</Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                defaultValue={disc.matriz[i]}
                                                                onChange={(e) => {
                                                                    disc.matriz[i] = e.target.value;
                                                                    handleInputChange('discs', album?.discs ? album?.discs : [{ discNumber: '1', weight: 'NA', matriz: ['NA'] } as Discs])
                                                                }}
                                                            />
                                                        </Form.Group>
                                                    )
                                                })
                                            }</>
                                    }

                                </div>
                            ))
                        }
                        <Form.Group className="mb-3" controlId="editForm.ControlInput12">
                            <Form.Label>Observação</Form.Label>
                            <Form.Control
                                type="text"
                                defaultValue={setFieldsNA ? "NA" : album?.obs}
                                onChange={
                                    (e) => handleInputChange('obs', e.target.value)
                                }
                            />
                        </Form.Group>

                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="submit" onClick={
                            () => {
                                setValidated(true);
                            }

                        }>Salvar</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <ModaldiscogsChoose
                showModalDiscogsChoose={showModalDiscogsChoose}
                discogsData={discogsData}
                handleCloseModalDiscogsChoose={handleCloseModalDiscogsChoose}
                setDiscogsChoose={setDiscogsChoose}

            />
        </>
    );
}

export default ModalEdit;
