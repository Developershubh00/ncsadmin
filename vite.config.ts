import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin, Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * nurseCallWebhookPlugin
 *
 * Adds two dev-server routes so the backend can POST webhook payloads to the
 * frontend during development and they flow into the same nurseCallStore used
 * by the WebSocket hook:
 *
 *   POST /api/nurse-call/webhook
 *     – Accepts the JSON payloads defined in types.ts (create / ack / attend).
 *     – Validates required fields and returns 400 on bad input.
 *     – Pushes the payload to all active SSE clients and returns 200 immediately.
 *
 *   GET  /api/nurse-call/webhook/stream
 *     – Server-Sent Events endpoint consumed by useNurseCallRealtime hook.
 *     – Keeps a connection open; each forwarded POST body arrives as a 'message' event.
 *
 * In production (without this plugin) the WebSocket channel is the primary path.
 * To add webhook support in production deploy a small backend-for-frontend (BFF)
 * that does the same: accept the POST and push via SSE or write into a shared store.
 */
function nurseCallWebhookPlugin(): Plugin {
    // Set of active SSE response objects
    const sseClients = new Set<ServerResponse>();

    function pushToClients(payload: unknown) {
        const data = JSON.stringify(payload);
        const dead: ServerResponse[] = [];
        sseClients.forEach((res) => {
            try {
                res.write(`data: ${data}\n\n`);
            } catch {
                dead.push(res);
            }
        });
        dead.forEach((r) => sseClients.delete(r));
    }

    return {
        name: 'nurse-call-webhook',
        configureServer(server) {
            server.middlewares.use(
                '/api/nurse-call/webhook',
                (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
                    // ── SSE stream ──────────────────────────────────────────────
                    if (req.method === 'GET' && req.url === '/stream') {
                        res.writeHead(200, {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            Connection: 'keep-alive',
                            'Access-Control-Allow-Origin': '*',
                        });
                        // Send a keep-alive comment every 15 s
                        const keepAlive = setInterval(() => {
                            try { res.write(': keep-alive\n\n'); } catch { /* ignore */ }
                        }, 15_000);

                        sseClients.add(res);
                        console.log('[NurseCallWebhook] SSE client connected – total:', sseClients.size);

                        req.on('close', () => {
                            clearInterval(keepAlive);
                            sseClients.delete(res);
                            console.log('[NurseCallWebhook] SSE client disconnected – total:', sseClients.size);
                        });
                        return; // do NOT call next()
                    }

                    // ── Webhook receiver ────────────────────────────────────────
                    if (req.method === 'POST' && (req.url === '/' || req.url === '')) {
                        let body = '';
                        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                        req.on('end', () => {
                            try {
                                const payload = JSON.parse(body);

                                // Basic field validation
                                if (!payload || typeof payload !== 'object') {
                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ error: 'Body must be a JSON object' }));
                                    return;
                                }

                                // call_created payloads lack an "event" field but must have call_id + room_no
                                const isCreatePayload = !payload.event;
                                if (isCreatePayload && (!payload.call_id || !payload.room_no)) {
                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ error: 'call_id and room_no are required for create payloads' }));
                                    return;
                                }
                                if (!isCreatePayload && !payload.call_id) {
                                    res.writeHead(400, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ error: 'call_id is required' }));
                                    return;
                                }

                                console.log('[NurseCallWebhook] Received payload:', JSON.stringify(payload));
                                pushToClients(payload);

                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ ok: true, ssePeers: sseClients.size }));
                            } catch (err) {
                                console.error('[NurseCallWebhook] Failed to parse body:', err);
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                            }
                        });
                        return;
                    }

                    // ── CORS preflight ──────────────────────────────────────────
                    if (req.method === 'OPTIONS') {
                        res.writeHead(204, {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type',
                        });
                        res.end();
                        return;
                    }

                    next();
                }
            );
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv makes .env VITE_* vars available at config time
  const env = loadEnv(mode, process.cwd(), '');

  const apiBase = (env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
  // Convert http→ws and https→wss for the WebSocket proxy target
  const wsBase = apiBase.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');

  return {
    plugins: [react(), nurseCallWebhookPlugin()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        // Proxy REST API calls when running Vite dev server locally
        '/api': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
        // Proxy WebSocket upgrade — ws: true enables the WS tunnel
        '/ws': {
          target: wsBase,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  };
});

