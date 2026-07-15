import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Button, Spinner } from 'react-bootstrap'
import { FaMicrophoneAlt, FaPlay, FaPause, FaRedo, FaMusic } from 'react-icons/fa'
import { stripSyncedTimestamps } from '../services/Lyrics'

interface LrcLine {
    time: number;
    text: string;
}

const LRC_TAG = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

// Parse LRC ("[mm:ss.xx] text") into time-ordered lines. A line can carry more
// than one timestamp, so each becomes its own entry.
function parseLrc(lrc: string): LrcLine[] {
    const out: LrcLine[] = [];
    for (const raw of lrc.split('\n')) {
        const tags = [...raw.matchAll(LRC_TAG)];
        if (tags.length === 0) continue;
        const text = raw.replace(LRC_TAG, '').trim();
        for (const t of tags) {
            const ms = t[3] ? parseInt(t[3].padEnd(3, '0'), 10) : 0;
            out.push({ time: parseInt(t[1], 10) * 60 + parseInt(t[2], 10) + ms / 1000, text });
        }
    }
    return out.sort((a, b) => a.time - b.time);
}

function formatTime(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const LyricsModal = ({ show, onHide, title, loading, plainLyrics, syncedLyrics, instrumental, onRetry, onMarkInstrumental }: {
    show: boolean,
    onHide: () => void,
    title: string,
    loading: boolean,
    plainLyrics: string,
    syncedLyrics: string,
    instrumental: boolean,
    onRetry: () => void,
    onMarkInstrumental: () => void,
}) => {
    const lines = useMemo(() => parseLrc(syncedLyrics), [syncedLyrics]);
    const hasSynced = lines.length > 0;
    const plainText = plainLyrics || (syncedLyrics ? stripSyncedTimestamps(syncedLyrics) : '');

    const [mode, setMode] = useState<'synced' | 'plain'>('synced');
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Internal clock: base time when play started + wall-clock elapsed since.
    const baseTime = useRef(0);
    const startPerf = useRef(0);
    const activeRef = useRef<HTMLLIElement>(null);

    // Reset whenever a new track opens.
    useEffect(() => {
        setPlaying(false);
        setCurrentTime(0);
        setMode(hasSynced ? 'synced' : 'plain');
    }, [syncedLyrics, plainLyrics, show, hasSynced]);

    useEffect(() => {
        if (!playing) return;
        let raf = 0;
        const tick = () => {
            setCurrentTime(baseTime.current + (performance.now() - startPerf.current) / 1000);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing]);

    let activeIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].time <= currentTime + 0.15) activeIndex = i;
        else break;
    }

    // Keep the active line centered.
    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [activeIndex]);

    const play = () => {
        baseTime.current = currentTime;
        startPerf.current = performance.now();
        setPlaying(true);
    };
    const pause = () => setPlaying(false);
    const restart = () => {
        baseTime.current = 0;
        startPerf.current = performance.now();
        setCurrentTime(0);
    };
    const seek = (t: number) => {
        baseTime.current = t;
        startPerf.current = performance.now();
        setCurrentTime(t);
    };

    const showKaraoke = hasSynced && mode === 'synced';

    return (
        <Modal show={show} onHide={onHide} centered scrollable>
            <Modal.Header closeButton>
                <Modal.Title className="d-flex align-items-center gap-2" style={{ fontSize: '1.1rem' }}>
                    <FaMicrophoneAlt /> {title}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ height: '60vh', overflowY: 'auto' }}>
                {loading
                    ? <div className="text-center py-4"><Spinner animation="border" /></div>
                    : showKaraoke
                        ? (
                            <ul className="karaoke">
                                {lines.map((line, i) => (
                                    <li
                                        key={i}
                                        ref={i === activeIndex ? activeRef : undefined}
                                        className={`karaoke-line${i === activeIndex ? ' active' : ''}`}
                                        onClick={() => seek(line.time)}
                                        title="Ir para este ponto"
                                    >
                                        {line.text || '♪'}
                                    </li>
                                ))}
                            </ul>
                        )
                        : plainText
                            ? <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{plainText}</pre>
                            : instrumental
                                ? (
                                    <div className="empty-state">
                                        <FaMusic size={40} />
                                        <div className="fw-semibold">Música instrumental</div>
                                    </div>
                                )
                                : (
                                    <div className="empty-state">
                                        <div className="text-muted">Letra não encontrada</div>
                                        <div className="d-flex gap-2 flex-wrap justify-content-center">
                                            <Button size="sm" variant="outline-primary" onClick={onRetry}>
                                                <FaRedo className="me-1" /> Tentar novamente
                                            </Button>
                                            <Button size="sm" variant="outline-secondary" onClick={onMarkInstrumental}>
                                                <FaMusic className="me-1" /> Marcar como instrumental
                                            </Button>
                                        </div>
                                    </div>
                                )}
            </Modal.Body>
            {(hasSynced || plainText) && (
                <Modal.Footer className="justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                        {showKaraoke && (
                            <>
                                <Button size="sm" variant="primary" onClick={playing ? pause : play}>
                                    {playing ? <FaPause /> : <FaPlay />}
                                </Button>
                                <Button size="sm" variant="outline-secondary" onClick={restart} title="Reiniciar">
                                    <FaRedo />
                                </Button>
                                <span className="small text-muted">{formatTime(currentTime)}</span>
                            </>
                        )}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        {hasSynced && plainText && (
                            <Button size="sm" variant="link" className="p-0" onClick={() => setMode(mode === 'synced' ? 'plain' : 'synced')}>
                                {mode === 'synced' ? 'Ver texto' : 'Ver sincronizada'}
                            </Button>
                        )}
                        <span className="small text-muted">Letra via LRCLIB</span>
                    </div>
                </Modal.Footer>
            )}
        </Modal>
    );
}

export default LyricsModal;
