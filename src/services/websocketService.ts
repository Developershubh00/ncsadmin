import type { WSEvent } from '../types/types';

type EventCallback = (event: WSEvent) => void;

// Derive WS URL from VITE_WS_URL env var (preferred), or auto-build from
// VITE_API_BASE_URL converting http→ws / https→wss. Falls back to the current
// page's host so it works in any environment without hardcoded addresses.
const WS_URL = (() => {
    if (import.meta.env.VITE_WS_URL) {
        return import.meta.env.VITE_WS_URL as string;
    }
    const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (base) {
        const host = base.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const protocol = base.startsWith('https://') ? 'wss' : 'ws';
        return `${protocol}://${host}/ws/notifications/`;
    }
    // Last-resort: mirror the running page's protocol
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/ws/notifications/`;
})();

class WebSocketService {
    private ws: WebSocket | null = null;
    private callbacks: EventCallback[] = [];
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private isConnecting = false;

    /**
     * Connect to the WebSocket server
     */
    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        console.log('[WS] Connecting to', WS_URL);
        try {
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                console.log('[WS] Connected to', WS_URL);
                this.reconnectAttempts = 0;
                this.isConnecting = false;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data as string) as Record<string, unknown>;

                    // Skip the welcome handshake — it is not a call event
                    if (data.event === 'connection_established') {
                        console.log('[WS] Handshake:', data.message);
                        return;
                    }

                    console.group(`[WS] ▶ Event: ${data.event}`);
                    console.log('[WS] Raw payload:', JSON.stringify(data, null, 2));
                    console.log('[WS] Parsed fields:', {
                        event:        data.event,
                        call_id:      data.call_id,
                        room_no:      data.room_no,
                        bed_no:       data.bed_no,
                        floor_no:     data.floor_no,
                        corridoor_no: data.corridoor_no,
                        call_from:    data.call_from,
                        hospital:     data.hospital ?? data.hospital_name,
                        created_at:   data.created_at,
                        acknowledged_at: data.acknowledged_at,
                        attended_at:  data.attended_at,
                        message:      data.message,
                    });
                    console.log('[WS] Timestamp:', new Date().toISOString());
                    console.groupEnd();
                    this.callbacks.forEach((cb) => cb(data as unknown as WSEvent));
                } catch (err) {
                    console.error('[WS] Failed to parse message:', err);
                }
            };

            this.ws.onclose = (event) => {
                console.warn('[WS] Connection closed:', event.code, event.reason);
                this.isConnecting = false;
                this.ws = null;  // clear ref so readyState guard works on next connect()
                this.attemptReconnect();
            };

            this.ws.onerror = (err) => {
                console.error('[WS] Connection error:', err);
                // onclose fires right after onerror — reconnect is handled there
                this.isConnecting = false;
            };
        } catch (err) {
            console.error('[WS] Failed to create WebSocket:', err);
            this.isConnecting = false;
            this.attemptReconnect();
        }
    }

    /**
     * Attempt to reconnect with exponential backoff
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[WS] Max reconnect attempts reached');
            return;
        }

        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    /**
     * Subscribe to WebSocket events
     */
    subscribe(callback: EventCallback): () => void {
        this.callbacks.push(callback);

        // Return unsubscribe function
        return () => {
            this.callbacks = this.callbacks.filter((cb) => cb !== callback);
        };
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.onclose = null; // Prevent auto-reconnect
            this.ws.close();
            this.ws = null;
        }

        this.callbacks = [];
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        console.log('[WS] Disconnected');
    }

    /**
     * Check if currently connected
     */
    isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
const websocketService = new WebSocketService();
export default websocketService;
