import type { WSEvent } from '../types/types';

type EventCallback = (event: WSEvent) => void;

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/notifications/';

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

        try {
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                console.log('[WS] Connected to', WS_URL);
                this.reconnectAttempts = 0;
                this.isConnecting = false;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data: WSEvent = JSON.parse(event.data);
                    console.log('[WS] Event received:', data.event);
                    this.callbacks.forEach((cb) => cb(data));
                } catch (err) {
                    console.error('[WS] Failed to parse message:', err);
                }
            };

            this.ws.onclose = (event) => {
                console.log('[WS] Connection closed:', event.code, event.reason);
                this.isConnecting = false;
                this.attemptReconnect();
            };

            this.ws.onerror = (err) => {
                console.error('[WS] Connection error:', err);
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
