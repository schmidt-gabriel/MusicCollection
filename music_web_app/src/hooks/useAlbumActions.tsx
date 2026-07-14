import React, { useState } from 'react';
import { AlbumData } from '../models/Album';
import { FetchAlbums, RemoveAlbum, UpdateDiscogs } from '../services/Albums';
import { showToast } from '../components/Toasts';

/**
 * Shared state and handlers for the album management pages (Manager and
 * Tree): album list, selected album, the three modals and their actions.
 */
export function useAlbumActions() {
    const [albuns, setAlbuns] = useState<AlbumData[]>();
    const [albumInfo, setAlbumInfo] = useState<AlbumData>();
    const [modalType, setModalType] = useState<string>("None");
    const [loading, setLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const handleCloseModal = () => setShowModal(false);
    const handleShowModal = () => setShowModal(true);

    const [showModalFixDiscogs, setShowModalFixDiscogs] = useState(false);
    const handleCloseModalFixDiscogs = () => setShowModalFixDiscogs(false);
    const handleShowModalFixDiscogs = () => setShowModalFixDiscogs(true);

    const [showModalDelete, setShowModalDelete] = useState(false);
    const handleCloseModalDelete = () => setShowModalDelete(false);
    const handleShowModalDelete = () => setShowModalDelete(true);

    const [validatedFixDiscogs, setValidatedFixDiscogs] = useState(false);
    const [fixDiscogs, setFixDiscogs] = useState<string>('');

    function clearContent() {
        setAlbuns(undefined);
        setAlbumInfo(undefined);
    }

    function loadAlbums(artist: string) {
        setLoading(true);
        FetchAlbums(artist)
            .then(setAlbuns)
            .catch(() => showToast("Não foi possível carregar os discos", "danger"))
            .finally(() => setLoading(false));
    }

    function refreshAfterEdit(album: AlbumData) {
        clearContent();
        handleCloseModal();
        showToast(`Album ${album.title} atualizado!`);
        loadAlbums(album.artist);
        setAlbumInfo(album);
    }

    function removeAlbum(album: AlbumData) {
        RemoveAlbum(album.id)
            .then(() => {
                clearContent();
                handleCloseModalDelete();
                showToast(`Album ${album.title} removido!`);
                loadAlbums(album.artist);
            })
            .catch(() => showToast("Não foi possível remover o disco", "danger"));
    }

    const handleSubmitFixDiscogs = (event: React.FormEvent<HTMLFormElement>) => {
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (albumInfo === undefined) {
            return;
        }
        event.preventDefault();
        setValidatedFixDiscogs(true);
        UpdateDiscogs(fixDiscogs, albumInfo)
            .then((result) => {
                if (result === undefined) {
                    showToast("Não encontrado no Discogs", "warning");
                    return;
                }
                showToast("Atualizado com sucesso!");
                clearContent();
                handleCloseModalFixDiscogs();
                loadAlbums(albumInfo.artist);
            })
            .catch(() => showToast("Não foi possível atualizar o Discogs", "danger"));
    };

    return {
        albuns, setAlbuns, albumInfo, setAlbumInfo, modalType, setModalType, loading,
        showModal, handleShowModal, handleCloseModal,
        showModalFixDiscogs, handleShowModalFixDiscogs, handleCloseModalFixDiscogs,
        showModalDelete, handleShowModalDelete, handleCloseModalDelete,
        validatedFixDiscogs, fixDiscogs, setFixDiscogs,
        clearContent, loadAlbums, refreshAfterEdit, removeAlbum, handleSubmitFixDiscogs,
    };
}

export type AlbumActions = ReturnType<typeof useAlbumActions>;
