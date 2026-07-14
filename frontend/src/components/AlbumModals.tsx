import { AlbumData } from '../models/Album';
import ModalEdit from './ModalEdit';
import ModalDelete from './ModalDelete';
import ModalFixDiscogs from './ModalFixDiscogs';
import { AlbumActions } from '../hooks/useAlbumActions';

/** The three album modals (edit, fix Discogs, delete), shared by the
 *  Manager and Tree pages. */
const AlbumModals = ({ actions }: { actions: AlbumActions }) => (
    <>
        <ModalEdit
            albumInfo={actions.albumInfo as AlbumData}
            showModal={actions.showModal}
            handleCloseModal={actions.handleCloseModal}
            modalType={actions.modalType}
            refreshArtists={actions.refreshAfterEdit}
        />
        <ModalFixDiscogs
            showModalFixDiscogs={actions.showModalFixDiscogs}
            validatedFixDiscogs={actions.validatedFixDiscogs}
            handleCloseModalFixDiscogs={actions.handleCloseModalFixDiscogs}
            handleSubmitFixDiscogs={actions.handleSubmitFixDiscogs}
            setFixDiscogs={actions.setFixDiscogs}
            albumInfo={actions.albumInfo as AlbumData}
        />
        <ModalDelete
            albumInfo={actions.albumInfo as AlbumData}
            showModalDelete={actions.showModalDelete}
            handleCloseModalDelete={actions.handleCloseModalDelete}
            removeAlbum={actions.removeAlbum}
        />
    </>
);

export default AlbumModals;
