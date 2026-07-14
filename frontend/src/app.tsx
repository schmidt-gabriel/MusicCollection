import { useEffect, useState } from 'react';
import AppRoutes from './routes';
import Sidebar from './components/Sidebar';
import { Row, Col, Container, Spinner, Image } from 'react-bootstrap';

import { BrowserRouter } from "react-router-dom";

import logo from './assets/music-collection-logo.png';
import { useAuth0 } from '@auth0/auth0-react';
import { registerTokenGetter } from './services/Token';
import { Toasts } from './components/Toasts';

// Dev-only: skip Auth0 and use fixture data (see services/mock.ts).
const mockMode = !!import.meta.env.REACT_APP_MOCK;

const App = () => {
    const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently, user, error } = useAuth0();
    const [tokenReady, setTokenReady] = useState(false);

    useEffect(() => {
        if (mockMode || !isAuthenticated) return;

        // The login token (audience = Music Collection API) is the API token.
        // On a stale session (e.g. after the API audience changed) the SDK has
        // no refresh token for the new audience and throws; recover by
        // re-authenticating once, guarded against a redirect loop.
        const fetchApiToken = async () => {
            try {
                const token = await getAccessTokenSilently();
                sessionStorage.removeItem('reauthAttempted');
                return token;
            } catch (e) {
                const code = (e as { error?: string })?.error ?? '';
                const recoverable =
                    code === 'missing_refresh_token' ||
                    code === 'login_required' ||
                    code === 'invalid_grant' ||
                    /missing refresh token|login required/i.test(
                        String((e as Error)?.message ?? ''),
                    );
                if (recoverable && !sessionStorage.getItem('reauthAttempted')) {
                    sessionStorage.setItem('reauthAttempted', '1');
                    await loginWithRedirect();
                }
                throw e;
            }
        };
        registerTokenGetter(fetchApiToken);

        // Spotify/Discogs credentials come as custom claims on the ID token
        // (set by the post-login Action in Auth0). Match each claim by its
        // name, ignoring the namespace, so the Action can use any namespace.
        const claims = (user as Record<string, unknown> | undefined) ?? {};
        for (const key of ['DISCOGS_TOKEN', 'SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET']) {
            const match = Object.entries(claims).find(
                ([k]) => k === key || k.endsWith('/' + key),
            );
            if (typeof match?.[1] === 'string' && match[1]) {
                sessionStorage.setItem(key, match[1]);
            }
        }

        (async () => {
            try {
                const apiToken = await fetchApiToken();
                sessionStorage.setItem("token", apiToken);
            } catch (e) {
                console.error("Token setup failed", e);
            } finally {
                setTokenReady(true);
            }
        })();
    }, [isAuthenticated, getAccessTokenSilently, loginWithRedirect, user]);

    // Surface auth errors instead of looping back into loginWithRedirect.
    if (!mockMode && error) {
        console.error("Auth0 error", error);
        return (
            <Container style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <Row><Col><strong>Erro de autenticação</strong></Col></Row>
                <Row><Col>{error.message}</Col></Row>
                <Row><Col>
                    <button className="btn btn-primary" onClick={() => loginWithRedirect()}>
                        Tentar novamente
                    </button>
                </Col></Row>
            </Container>
        )
    }

    if (!mockMode && (isLoading || (isAuthenticated && !tokenReady))) return (
        <Container style={
            {
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }
        }>
            <Row>
                <Col>
                    <Spinner animation="border"></Spinner>
                </Col>
            </Row>
        </Container>
    )

    if (!mockMode && !isAuthenticated) {
        setTimeout(() => {
            loginWithRedirect()
        }, 1000)
        return (
            <Container style={
                {
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    cursor: 'pointer',
                    opacity: "0",
                    transition: "width 1s, height 1s, opacity 1s 1s"
                }
            }>
                <Row>
                    <Col>
                        <Image src={logo} fluid roundedCircle
                        />
                    </Col>
                </Row>
            </Container>
        )
    }

    return (
        <BrowserRouter>
            <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
                <div style={{ width: '232px', flexShrink: 0 }}>
                    <Sidebar />
                </div>
                <div className="flex-grow-1" style={{ minWidth: 0, overflowY: 'auto', paddingTop: '1rem', paddingInline: '0.5rem' }}>
                    <AppRoutes />
                </div>
            </div>
            <Toasts />
        </BrowserRouter>
    )
}

export default App;
