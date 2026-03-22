/**
 * useNurseCallRealtime
 *
 * React hook that:
 *  1. Opens a WebSocket to ws(s)://<API_HOST>/ws/notifications/ and reconnects with
 *     exponential backoff on disconnect.
 *  2. Parses incoming messages and pushes them into nurseCallStore via processWSEvent().
 *  3. Subscribes to Server-Sent Events from /api/nurse-call/webhook/stream so that HTTP
 *     webhook payloads (forwarded by the Vite dev-server middleware or a backend-for-frontend
 *     in production) flow through the same nurseCallStore code path.
 *  4. Exposes { calls, loading, error, connectionStatus } for consumers plus an
 *     onEvent callback so UI layers can react to individual events (toasts, sounds, etc.).
 *
 * Debug logging is gated by localStorage 'NCS_DEBUG'=true or import.meta.env.DEV.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WSEvent, CallRecord, ConnectionStatus, AnyWebhookPayload } from '../types/types';
import {
    hydrateStore,
    subscribeStore,
    processWSEvent,
    processWebhookPayload,
} from '../services/nurseCallStore';
import { listCallEvents } from '../services/callService';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_HOST = (() => {
    const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (base) {
        // strip http/https scheme to build ws URL
        return base.replace(/^https?:\/\//, '');
    }
    return 'localhost:8000';
})();

const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss' : 'ws';
const WS_URL = import.meta.env.VITE_WS_URL || `${WS_PROTOCOL}://${API_HOST}/ws/notifications/`;

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

// ─── Debug helper ─────────────────────────────────────────────────────────────

function dbg(...args: unknown[]) {
    const enabled =
        (typeof localStorage !== 'undefined' && localStorage.getItem('NCS_DEBUG') === 'true') ||
        (import.meta.env.DEV as boolean);
    if (enabled) console.log('[useNurseCallRealtime]', ...args);
}

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface NurseCallRealtimeResult {
    calls: CallRecord[];
    loading: boolean;
    error: string;
    connectionStatus: ConnectionStatus;
    /** Register a callback that fires on every WS / webhook event */
    onEvent: (cb: (event: WSEvent | AnyWebhookPayload) => void) => () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNurseCallRealtime(): NurseCallRealtimeResult {
    const [calls, setCalls] = useState<CallRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

    // Listeners registered via onEvent()
    const eventListeners = useRef<Set<(e: WSEvent | AnyWebhookPayload) => void>>(new Set());

    // WebSocket refs
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const unmounted = useRef(false);

    // ── SSE ref (webhook forwarding stream) ───────────────────────────────────
    const sseRef = useRef<EventSource | null>(null);

    // ── Helper: emit to onEvent listeners ─────────────────────────────────────
    function emitEvent(event: WSEvent | AnyWebhookPayload) {
        eventListeners.current.forEach((cb) => {
            try { cb(event); } catch (e) { console.error('[useNurseCallRealtime] onEvent listener threw', e); }
        });
    }

    // ── Subscribe to store ────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = subscribeStore((snapshot) => {
            setCalls(snapshot);
        });
        return unsub;
    }, []);

    // ── Initial HTTP fetch to populate the store ──────────────────────────────
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                dbg('Loading initial call list from REST API');
                const data = await listCallEvents();
                if (!active) return;
                hydrateStore(data);
                setError('');
                setLoading(false);
                dbg('Hydrated store with', data.length, 'calls');
            } catch (err: unknown) {
                if (!active) return;
                const msg = err instanceof Error ? err.message : 'Unknown error';
                console.error('[useNurseCallRealtime] Initial fetch failed:', msg);
                setError('Unable to load calls. Please ensure the API is accessible.');
                setLoading(false);
            }
        })();
        return () => { active = false; };
    }, []);

    // ── WebSocket connection management ───────────────────────────────────────
    const connect = useCallback(() => {
        if (unmounted.current) return;
        dbg('Connecting to', WS_URL);
        setConnectionStatus('connecting');

        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                if (unmounted.current) { ws.close(); return; }
                dbg('WebSocket connected');
                reconnectAttempts.current = 0;
                setConnectionStatus('connected');
                setError('');
            };

            ws.onmessage = (ev) => {
                try {
                    const raw = JSON.parse(ev.data as string) as Record<string, unknown>;

                    // Skip the welcome handshake — not a call event
                    if (raw.event === 'connection_established') {
                        dbg('Handshake received:', raw.message);
                        return;
                    }

                    dbg('WS message:', raw.event, raw);
                    processWSEvent(raw as unknown as WSEvent);
                    emitEvent(raw as unknown as WSEvent);
                } catch (e) {
                    console.error('[useNurseCallRealtime] Failed to parse WS message:', e);
                }
            };

            ws.onclose = (ev) => {
                if (unmounted.current) return;
                dbg('WebSocket closed:', ev.code, ev.reason);
                scheduleReconnect();
            };

            ws.onerror = (ev) => {
                dbg('WebSocket error:', ev);
                // onclose will fire next; error alone doesn't need extra handling
            };
        } catch (e) {
            dbg('Failed to create WebSocket:', e);
            scheduleReconnect();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const scheduleReconnect = useCallback(() => {
        if (unmounted.current) return;
        if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
            console.error('[useNurseCallRealtime] Max reconnect attempts reached');
            setConnectionStatus('disconnected');
            setError('Real-time connection lost. Please refresh the page.');
            return;
        }
        const delay = Math.min(
            BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempts.current,
            MAX_RECONNECT_DELAY_MS
        );
        dbg(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);
        setConnectionStatus('reconnecting');
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
    }, [connect]);

    useEffect(() => {
        unmounted.current = false;
        connect();
        return () => {
            unmounted.current = true;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.onclose = null; // prevent re-schedule
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [connect]);

    // ── SSE – webhook forwarding stream (Vite dev middleware / BFF in prod) ────
    useEffect(() => {
        // Attempt to connect to the SSE stream; fail silently if not available
        const SSE_URL = '/api/nurse-call/webhook/stream';
        let source: EventSource;

        try {
            source = new EventSource(SSE_URL);
            sseRef.current = source;

            source.onopen = () => dbg('SSE stream connected');

            source.onmessage = (ev) => {
                try {
                    const raw = JSON.parse(ev.data as string) as AnyWebhookPayload;
                    dbg('SSE/webhook event:', raw);
                    processWebhookPayload(raw);
                    emitEvent(raw);
                } catch (e) {
                    console.error('[useNurseCallRealtime] Failed to parse SSE message:', e);
                }
            };

            source.onerror = () => {
                // SSE is optional – fail silently; the WS is the primary channel
                dbg('SSE stream unavailable (this is expected in production without a BFF)');
                source.close();
            };
        } catch {
            dbg('EventSource not supported or SSE endpoint unavailable');
        }

        return () => {
            sseRef.current?.close();
            sseRef.current = null;
        };
    }, []);

    // ── onEvent registration helper ───────────────────────────────────────────
    const onEvent = useCallback(
        (cb: (event: WSEvent | AnyWebhookPayload) => void): (() => void) => {
            eventListeners.current.add(cb);
            return () => eventListeners.current.delete(cb);
        },
        []
    );

    return { calls, loading, error, connectionStatus, onEvent };
}
