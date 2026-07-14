import { NavLink } from 'react-router-dom'
import styled from 'styled-components'
import { Image, Spinner } from 'react-bootstrap'
import { FaFileCsv, FaFileCode, FaAccusoft, FaTasks, FaTree } from 'react-icons/fa'
import { ExportCollection } from '../services/Albums';
import { useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";

const SidebarBottom = styled.div`
    position: absolute;
    bottom: 0;
    display: flex;
    align-items: start;
    justify-content: start;
    padding-bottom: 1rem;   
`

const SidebarMenu = styled.div` 
    width: 100%;
    height: 100vh;
    background: linear-gradient(180deg, #3a4150 0%, #23272f 100%);
    transition: .6s;
`

const MenuItems = styled.li`
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: start;
    width: 100%;
    height: 52px;
`

const MenuItemLinks = styled(NavLink)`
    display: flex;
    align-items: center;
    width: 100%;
    margin: 0 0.75rem;
    padding: 0.6rem 1rem;
    font-size: 17px;
    border-radius: 10px;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.92);
    transition: background-color .15s ease;

    &:hover {
        background-color: rgba(255, 255, 255, 0.16);
        color: #ffffff;
    }

    &.active {
        background-color: #ffffff;
        color: var(--brand-dark);
        font-weight: 600;
    }
`

const MenuItemButton = styled.div`
    display: flex;
    align-items: center;
    width: 100%;
    margin: 0 0.75rem;
    padding: 0.6rem 1rem;
    font-size: 17px;
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.92);
    cursor: pointer;
    transition: background-color .15s ease;

    &:hover {
        background-color: rgba(255, 255, 255, 0.16);
        color: #ffffff;
    }
`

const SidebarData = [
    {
        title: 'Gerenciador',
        path: '/manager',
        icon: <FaAccusoft />
    },
    {
        title: 'Dashboard',
        path: '/dashboard',
        icon: <FaTasks />
    },
    {
        title: 'Arvore',
        path: '/tree',
        icon: <FaTree />
    }
]

const LogoutButton = () => {
    const { logout } = useAuth0();

    return (
        <MenuItemButton onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log Out
        </MenuItemButton>
    );
};

const Home: React.FunctionComponent = () => {
    const [exportLoadingCSV, setExportLoadingCSV] = useState(false);
    const [exportLoadingJSON, setExportLoadingJSON] = useState(false);
    const { user } = useAuth0();
    return (
        <SidebarMenu>
            <h2 style={{ marginLeft: '16px', color: 'white', paddingTop: '1rem' }}>Music Collection</h2>
            <hr style={{ width: '90%', marginLeft: '16px', color: "white" }}></hr>
            {SidebarData.map((item) => {
                return (
                    <MenuItems key={item.title}>
                        <MenuItemLinks to={item.path}>
                            {item.icon}
                            <span style={{ marginLeft: '16px' }}>{item.title}</span>
                        </MenuItemLinks>
                    </MenuItems>
                )
            })}
            <hr style={{ width: '90%', marginLeft: '16px', color: "white" }}></hr>
            <MenuItems>
                <MenuItemButton
                    onClick={
                        () => {
                            if (exportLoadingCSV) {
                                return;
                            }
                            setExportLoadingCSV(true);
                            ExportCollection().then(data => {
                                const headers = 'RELEASE_YEAR;ARTIST;TITLE;MEDIA;PURCHASE;ORIGIN;EDITION_YEAR;IFPI_MASTERING;IFPI_MOULD;BARCODE;LOTE;OBS;DISCOGS_ID;SPOTIFY_ID\n'
                                const csv = data.map((item) => {
                                    return [
                                        item.releaseYear,
                                        item.artist,
                                        item.title,
                                        item.media,
                                        item.purchase,
                                        item.origin,
                                        item.editionYear,
                                        item.ifpiMastering,
                                        item.ifpiMould,
                                        item.barcode,
                                        item.lote,
                                        item.obs,
                                        item.discogs.id,
                                        item.spotify.id,
                                    ].join(';').replace(/(\r\n|\n|\r)/gm, "")
                                }).join('\n')
                                const universalBOM = "\uFEFF";
                                const csvData = universalBOM + headers + csv;
                                const blob = new Blob([csvData], { type: 'text/csv' })
                                const hiddenElement = document.createElement('a')
                                hiddenElement.href = window.URL.createObjectURL(blob)
                                hiddenElement.target = '_blank'
                                hiddenElement.download = 'collection.csv'
                                hiddenElement.click()
                                setExportLoadingCSV(false);
                            }
                            )

                        }

                    }>
                    <FaFileCsv></FaFileCsv><span style={{ marginLeft: '16px' }}>Exportar CSV</span>
                    {exportLoadingCSV && <Spinner style={{ marginLeft: '16px' }}></Spinner>}
                </MenuItemButton>
            </MenuItems>
            <MenuItems>
                <MenuItemButton
                    onClick={
                        () => {
                            if (exportLoadingJSON) {
                                return;
                            }
                            setExportLoadingJSON(true);
                            console.log('exporting JSON')
                            ExportCollection().then(data => {
                                const hiddenElement = document.createElement('a')
                                hiddenElement.href = 'data:text/json;charset=utf-8,' + encodeURI(JSON.stringify(data))
                                hiddenElement.target = '_blank'
                                hiddenElement.download = 'collection.json'
                                hiddenElement.click()
                                setExportLoadingJSON(false);
                            })
                        }
                    }>
                    <FaFileCode></FaFileCode><span style={{ marginLeft: '16px' }}>Exportar JSON</span>
                    {exportLoadingJSON && <Spinner style={{ marginLeft: '16px' }}></Spinner>}
                </MenuItemButton>
            </MenuItems>
            <hr style={{ width: '90%', marginLeft: '16px', color: "white" }}></hr>
            <MenuItems>
                <LogoutButton></LogoutButton>
            </MenuItems>
            <hr style={{ width: '90%', marginLeft: '16px', color: "white" }}></hr>
            <SidebarBottom>
                <Image src={user?.picture} roundedCircle style={{ width: '50px', height: '50px', marginLeft: '16px' }} />
            </SidebarBottom>
        </SidebarMenu>
    )
}

export default Home