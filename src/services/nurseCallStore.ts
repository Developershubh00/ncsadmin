/**
 * nurseCallStore – shared in-memory store and event bus for nurse-call real-time events.
 *
 * Both the WebSocket client (useNurseCallRealtime) and the HTTP webhook handler feed into
 * this store via processEvent(), so both code paths share identical update logic.
 *
 * Debug logging is enabled when:
 *   localStorage.getItem('NCS_DEBUG') === 'true'  OR  import.meta.env.DEV === true
 */

import type {
    CallRecord,
    WSEvent,
    WebhookCallCreatedPayload,
    WebhookCallAcknowledgedPayload,
    WebhookCallAttendedPayload,
    AnyWebhookPayload,
} from '../types/types';

// ─── Debug helper ────────────────────────────────────────────────────────────

function dbg(...args: unknown[]) {
    const enabled =
        (typeof localStorage !== 'undefined' && localStorage.getItem('NCS_DEBUG') === 'true') ||
        (import.meta.env.DEV as boolean);
    if (enabled) console.log('[NurseCallStore]', ...args);
}

// ─── Store state ─────────────────────────────────────────────────────────────

/** Map<call_id, CallRecord> */
const callsMap = new Map<number, CallRecord>();

type StoreListener = (calls: CallRecord[]) => void;
const listeners = new Set<StoreListener>();

function getCallsArray(): CallRecord[] {
    // Sort newest-first by created_at
    return Array.from(callsMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

function notify() {
    const snapshot = getCallsArray();
    listeners.forEach((fn) => fn(snapshot));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Replace the entire call list (called after initial HTTP fetch) */
export function hydrateStore(calls: CallRecord[]) {
    callsMap.clear();
    calls.forEach((c) => callsMap.set(c.id, c));
    dbg('hydrated with', calls.length, 'calls');
    notify();
}

/** Subscribe to store updates. Returns an unsubscribe function. */
export function subscribeStore(listener: StoreListener): () => void {
    listeners.add(listener);
    // Immediately deliver current snapshot
    listener(getCallsArray());
    return () => listeners.delete(listener);
}

/** Read the current snapshot without subscribing */
export function getSnapshot(): CallRecord[] {
    return getCallsArray();
}

// ─── Normalisation helpers ────────────────────────────────────────────────────

function normaliseStatus(call: CallRecord): CallRecord {
    // Derive status from timestamps if backend doesn't update the status field
    if (call.attended_at) return { ...call, status: 'attended' };
    if (call.acknowledged_at) return { ...call, status: 'acknowledged' };
    return { ...call, status: call.status ?? 'new' };
}

// ─── Core processor – handles both WS events and webhook payloads ─────────────

/** Process a WebSocket event pushed from the server */
export function processWSEvent(event: WSEvent) {
    dbg('WS event:', event.event, event);

    switch (event.event) {
        case 'call_created': {
            const existing = callsMap.get(event.call_id);
            const record: CallRecord = {
                id: event.call_id,
                bed_no: event.bed_no ?? existing?.bed_no,
                room_no: event.room_no ?? existing?.room_no ?? '',
                floor_no: event.floor_no ?? existing?.floor_no ?? 0,
                hospital_name: event.hospital_name ?? event.hospital ?? existing?.hospital_name ?? '',
                call_from: event.call_from ?? existing?.call_from,
                status: 'new',
                created_at: event.created_at,
                acknowledged_at: existing?.acknowledged_at ?? null,
                attended_at: existing?.attended_at ?? null,
            };
            callsMap.set(event.call_id, record);
            notify();
            break;
        }
        case 'call_acknowledged': {
            const existing = callsMap.get(event.call_id);
            if (existing) {
                const updated = normaliseStatus({
                    ...existing,
                    acknowledged_at: event.acknowledged_at,
                    status: 'acknowledged',
                });
                callsMap.set(event.call_id, updated);
            } else {
                // Partial record – we don't have the full call data yet
                dbg('call_acknowledged for unknown call_id', event.call_id, '– storing partial');
                callsMap.set(event.call_id, {
                    id: event.call_id,
                    room_no: event.room_no ?? '',
                    // bed_no is not part of CallRecord; room_no is the display key
                    floor_no: 0,
                    hospital_name: '',
                    status: 'acknowledged',
                    created_at: '',
                    acknowledged_at: event.acknowledged_at,
                    attended_at: null,
                });
            }
            notify();
            break;
        }
        case 'call_attended': {
            const existing = callsMap.get(event.call_id);
            if (existing) {
                const updated = normaliseStatus({
                    ...existing,
                    attended_at: event.attended_at,
                    status: 'attended',
                });
                callsMap.set(event.call_id, updated);
            } else {
                dbg('call_attended for unknown call_id', event.call_id, '– storing partial');
                callsMap.set(event.call_id, {
                    id: event.call_id,
                    room_no: event.room_no ?? '',
                    floor_no: 0,
                    hospital_name: '',
                    status: 'attended',
                    created_at: '',
                    acknowledged_at: null,
                    attended_at: event.attended_at,
                });
            }
            notify();
            break;
        }
        case 'call_unacknowledged': {
            // Flag the call for operator attention – status stays 'new'
            const existing = callsMap.get(event.call_id);
            if (existing) {
                callsMap.set(event.call_id, {
                    ...existing,
                    status: 'new',
                    acknowledged_at: null,
                });
                notify();
            }
            dbg('call_unacknowledged alert for call_id', event.call_id);
            break;
        }
    }
}

/** Process an HTTP webhook payload (same business logic, different shape) */
export function processWebhookPayload(raw: AnyWebhookPayload) {
    dbg('Webhook payload:', raw);

    // Detect create events – they don't have an "event" field in the spec
    if (!('event' in raw) || (raw as { event?: unknown }).event === undefined) {
        const p = raw as WebhookCallCreatedPayload;
        if (!p.call_id || !p.room_no) {
            console.warn('[NurseCallStore] Webhook create payload missing required fields', p);
            return;
        }
        // Translate to WS event shape and reuse the same processor
        processWSEvent({
            event: 'call_created',
            call_id: p.call_id,
            bed_no: p.bed_no,
            room_no: p.room_no,
            floor_no: p.floor_no ?? 0,
            hospital_name: p.hospital_name,
            call_from: p.call_from ?? '',
            created_at: p.created_at,
        });
        return;
    }

    const withEvent = raw as WebhookCallAcknowledgedPayload | WebhookCallAttendedPayload;

    if (withEvent.event === 'call_acknowledged') {
        const p = withEvent as WebhookCallAcknowledgedPayload;
        if (!p.call_id || !p.acknowledged_at) {
            console.warn('[NurseCallStore] Webhook ack payload missing required fields', p);
            return;
        }
        processWSEvent({
            event: 'call_acknowledged',
            call_id: p.call_id,
            room_no: p.room_no,
            bed_no: p.bed_no,
            acknowledged_at: p.acknowledged_at,
        });
        return;
    }

    if (withEvent.event === 'call_attended') {
        const p = withEvent as WebhookCallAttendedPayload;
        if (!p.call_id || !p.attended_at) {
            console.warn('[NurseCallStore] Webhook attend payload missing required fields', p);
            return;
        }
        processWSEvent({
            event: 'call_attended',
            call_id: p.call_id,
            room_no: p.room_no,
            bed_no: p.bed_no,
            attended_at: p.attended_at,
        });
        return;
    }

    console.warn('[NurseCallStore] Unknown webhook event type', raw);
}
