import { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

type ToastVariant = 'success' | 'danger' | 'warning';
type ToastMessage = { id: number; text: string; variant: ToastVariant };

let listener: ((msg: ToastMessage) => void) | null = null;
let nextId = 1;

/** Fire-and-forget notification, replaces window.alert(). */
export function showToast(text: string, variant: ToastVariant = 'success') {
    listener?.({ id: nextId++, text, variant });
}

/** Mounted once in app.tsx; renders the queued toasts. */
export function Toasts() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        listener = (msg) => setToasts((prev) => [...prev, msg]);
        return () => { listener = null; };
    }, []);

    return (
        <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 2000, position: 'fixed' }}>
            {toasts.map((t) => (
                <Toast
                    key={t.id}
                    bg={t.variant}
                    autohide
                    delay={4000}
                    onClose={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                >
                    <Toast.Body className="text-white">{t.text}</Toast.Body>
                </Toast>
            ))}
        </ToastContainer>
    );
}
