import { NavLink } from 'react-router-dom'
import styled from 'styled-components'
import { Image, Spinner, Dropdown } from 'react-bootstrap'
import { FaFileCsv, FaFileCode, FaAccusoft, FaTasks, FaTree, FaMoon, FaSun, FaSignOutAlt } from 'react-icons/fa'
import { ExportCollection } from '../services/Albums';
import { forwardRef, useState } from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import { useTheme } from '../hooks/useTheme';

const SidebarMenu = styled.nav`
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: linear-gradient(180deg, #3a4150 0%, #1f232b 100%);
    color: #fff;
    padding: 1.25rem 0.75rem;
`

const Brand = styled.div`
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0 0.5rem 0.25rem;
`

const BrandText = styled.span`
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.15;
`

const Divider = styled.hr`
    border: none;
    height: 1px;
    background: rgba(255, 255, 255, 0.12);
    margin: 0.9rem 0.5rem;
`

const SectionLabel = styled.div`
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    padding: 0 0.75rem 0.4rem;
`

const NavList = styled.ul`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`

const IconSlot = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    font-size: 16px;
    flex-shrink: 0;
`

const itemStyles = `
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 0.6rem 0.75rem;
    font-size: 0.95rem;
    border-radius: 10px;
    text-decoration: none;
    color: rgba(255, 255, 255, 0.82);
    cursor: pointer;
    transition: background-color .15s ease, color .15s ease;

    &:hover {
        background-color: rgba(255, 255, 255, 0.08);
        color: #ffffff;
    }
`

const MenuItemLinks = styled(NavLink)`
    ${itemStyles}
    position: relative;

    &.active {
        background-color: rgba(255, 255, 255, 0.14);
        color: #ffffff;
        font-weight: 600;
    }

    &.active::before {
        content: '';
        position: absolute;
        left: -0.75rem;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 22px;
        border-radius: 0 3px 3px 0;
        background: var(--brand-2, #8b5cf6);
    }
`

const MenuItemButton = styled.div`
    ${itemStyles}
`

const Footer = styled.div`
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 0.5rem 0.25rem;
`

const Avatar = styled(Image)`
    width: 38px;
    height: 38px;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
`

const UserMeta = styled.div`
    min-width: 0;
    flex: 1;
`

const UserName = styled.div`
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`

const UserButton = styled.div`
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    min-width: 0;
    padding: 0.35rem;
    margin: -0.35rem;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color .15s ease;

    &:hover {
        background-color: rgba(255, 255, 255, 0.08);
    }
`

const ThemeToggleButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    font-size: 14px;
    cursor: pointer;
    flex-shrink: 0;
    border-radius: 8px;
    transition: color .15s ease, background-color .15s ease;

    &:hover {
        color: rgba(255, 255, 255, 0.95);
        background-color: rgba(255, 255, 255, 0.08);
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

const ThemeToggle = () => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <ThemeToggleButton
            onClick={toggleTheme}
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
            {isDark ? <FaSun /> : <FaMoon />}
        </ThemeToggleButton>
    );
};

type UserToggleProps = {
    picture?: string;
    name?: string;
    onClick?: (e: React.MouseEvent) => void;
};

// Custom Dropdown toggle: the whole user chip opens the menu on click.
const UserToggle = forwardRef<HTMLDivElement, UserToggleProps>(
    ({ picture, name, onClick }, ref) => (
        <UserButton
            ref={ref}
            onClick={onClick}
            role="button"
            aria-label="Abrir menu do usuário"
            title="Menu do usuário"
        >
            <Avatar src={picture} roundedCircle />
            <UserMeta>
                <UserName>{name ?? 'Convidado'}</UserName>
            </UserMeta>
        </UserButton>
    )
);

const Home: React.FunctionComponent = () => {
    const [exportLoadingCSV, setExportLoadingCSV] = useState(false);
    const [exportLoadingJSON, setExportLoadingJSON] = useState(false);
    const { user, logout } = useAuth0();

    // Auth0 often sets `name` to the email for email-only accounts; prefer a
    // real name and otherwise fall back to the email's local part so the chip
    // never shows the full address (the email itself lives in the dropdown).
    const displayName =
        (user?.name && user.name !== user.email && user.name)
        || user?.nickname
        || user?.given_name
        || (user?.email ? user.email.split('@')[0] : undefined)
        || 'Convidado';

    const exportCSV = () => {
        if (exportLoadingCSV) return;
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
            const universalBOM = "﻿";
            const csvData = universalBOM + headers + csv;
            const blob = new Blob([csvData], { type: 'text/csv' })
            const hiddenElement = document.createElement('a')
            hiddenElement.href = window.URL.createObjectURL(blob)
            hiddenElement.target = '_blank'
            hiddenElement.download = 'collection.csv'
            hiddenElement.click()
            setExportLoadingCSV(false);
        })
    };

    const exportJSON = () => {
        if (exportLoadingJSON) return;
        setExportLoadingJSON(true);
        ExportCollection().then(data => {
            const hiddenElement = document.createElement('a')
            hiddenElement.href = 'data:text/json;charset=utf-8,' + encodeURI(JSON.stringify(data))
            hiddenElement.target = '_blank'
            hiddenElement.download = 'collection.json'
            hiddenElement.click()
            setExportLoadingJSON(false);
        })
    };

    return (
        <SidebarMenu>
            <Brand>
                <BrandText>Music<br />Collection</BrandText>
            </Brand>

            <Divider />

            <SectionLabel>Menu</SectionLabel>
            <NavList>
                {SidebarData.map((item) => (
                    <li key={item.title}>
                        <MenuItemLinks to={item.path}>
                            <IconSlot>{item.icon}</IconSlot>
                            <span>{item.title}</span>
                        </MenuItemLinks>
                    </li>
                ))}
            </NavList>

            <Divider />

            <SectionLabel>Exportar</SectionLabel>
            <NavList>
                <li>
                    <MenuItemButton onClick={exportCSV}>
                        <IconSlot><FaFileCsv /></IconSlot>
                        <span>Exportar CSV</span>
                        {exportLoadingCSV && <Spinner size="sm" style={{ marginLeft: 'auto' }} />}
                    </MenuItemButton>
                </li>
                <li>
                    <MenuItemButton onClick={exportJSON}>
                        <IconSlot><FaFileCode /></IconSlot>
                        <span>Exportar JSON</span>
                        {exportLoadingJSON && <Spinner size="sm" style={{ marginLeft: 'auto' }} />}
                    </MenuItemButton>
                </li>
            </NavList>

            <Footer>
                <Dropdown drop="up" style={{ flex: 1, minWidth: 0 }}>
                    <Dropdown.Toggle
                        as={UserToggle}
                        picture={user?.picture}
                        name={displayName}
                    />
                    <Dropdown.Menu style={{ minWidth: '200px', maxWidth: '220px' }}>
                        {user?.email && (
                            <>
                                <Dropdown.Header style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                                    {user.email}
                                </Dropdown.Header>
                                <Dropdown.Divider />
                            </>
                        )}
                        <Dropdown.Item
                            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                        >
                            <FaSignOutAlt style={{ marginRight: 10 }} />
                            Log Out
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <ThemeToggle />
            </Footer>
        </SidebarMenu>
    )
}

export default Home
