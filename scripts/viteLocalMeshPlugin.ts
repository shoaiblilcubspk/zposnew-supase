import type { Plugin } from 'vite';

/**
 * Local LAN WebRTC Signaling Server Plugin for Vite.
 * Enables zero-internet, offline peer discovery and SDP/ICE signaling over LAN.
 */
export function viteLocalMeshPlugin(): Plugin {
  const clients = new Map<string, any>();
  const activePeers = new Map<string, any>();
  const recentSignals: any[] = [];

  return {
    name: 'vite-local-mesh-signaling',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url || '/', 'http://localhost');

        // CORS preflight handling for LAN / mobile clients
        if (url.pathname.startsWith('/api/mesh/')) {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }
        }

        // 0. Status inspection: /api/mesh/status
        if (url.pathname === '/api/mesh/status' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            connectedClients: Array.from(clients.keys()),
            activePeers: Array.from(activePeers.values()),
            recentSignals: recentSignals.slice(-20),
          }));
          return;
        }

        // 1. SSE Stream: /api/mesh/events?deviceId=...
        if (url.pathname === '/api/mesh/events' && req.method === 'GET') {
          const deviceId = url.searchParams.get('deviceId') || `terminal_${Math.random().toString(36).slice(2, 8)}`;

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });

          res.write(':connected\n\n');
          clients.set(deviceId, res);

          if (!activePeers.has(deviceId)) {
            activePeers.set(deviceId, {
              deviceId,
              name: `Terminal-${deviceId.slice(0, 6)}`,
              role: deviceId === 'PC-MAIN' ? 'primary' : 'terminal',
              publicKey: '',
              joinedAt: Date.now(),
            });
          }

          const currentPeerInfo = activePeers.get(deviceId);
          // Send current active peers to newly connected client
          for (const peer of activePeers.values()) {
            if (peer.deviceId !== deviceId) {
              res.write(`event: presence\ndata: ${JSON.stringify(peer)}\n\n`);
            }
          }

          // Broadcast this client's presence to all other clients
          for (const [id, clientRes] of clients.entries()) {
            if (id !== deviceId) {
              clientRes.write(`event: presence\ndata: ${JSON.stringify(currentPeerInfo)}\n\n`);
            }
          }

          const keepAlive = setInterval(() => {
            try { res.write(':ping\n\n'); } catch {}
          }, 10000);

          req.on('close', () => {
            clearInterval(keepAlive);
            clients.delete(deviceId);
            activePeers.delete(deviceId);
            // Broadcast leave event
            for (const [id, clientRes] of clients.entries()) {
              try {
                clientRes.write(`event: peer-leave\ndata: ${JSON.stringify({ deviceId })}\n\n`);
              } catch {
                clients.delete(id);
              }
            }
          });
          return;
        }

        // 2. Presence Broadcast: POST /api/mesh/presence
        if (url.pathname === '/api/mesh/presence' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            try {
              if (!body || body.trim() === '') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
                return;
              }
              const data = JSON.parse(body);
              if (data?.deviceId) {
                activePeers.set(data.deviceId, data);
                // Broadcast to all other connected clients
                for (const [id, clientRes] of clients.entries()) {
                  if (id !== data.deviceId) {
                    try {
                      clientRes.write(`event: presence\ndata: ${JSON.stringify(data)}\n\n`);
                    } catch {
                      clients.delete(id);
                    }
                  }
                }
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch (err: any) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: err.message }));
            }
          });
          return;
        }

        // 3. WebRTC Signal Relay: POST /api/mesh/signal
        if (url.pathname === '/api/mesh/signal' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => (body += chunk));
          req.on('end', () => {
            try {
              if (!body || body.trim() === '') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
                return;
              }
              const data = JSON.parse(body);
              const target = data?.targetDeviceId;
              const subType = data?.payload?.type || data?.type;
              const p = data?.payload?.payload || {};
              const prodInfo = (Array.isArray(p?.newProducts) ? p.newProducts.slice(0, 5).map((x: any) => ({ id: x?.id, name: x?.name, stock: x?.stock })) : null) || (Array.isArray(p?.productIds) ? p.productIds.slice(0, 5) : []);
              const newProdsCount = Array.isArray(p?.newProducts) ? p.newProducts.length : 0;
              const salesCount = Array.isArray(p?.newSales) ? p.newSales.length : (Array.isArray(p?.sales) ? p.sales.length : 0);

              recentSignals.push({
                from: data?.senderDeviceId,
                to: target || '*',
                type: data?.type,
                subType,
                details: { newProds: newProdsCount, prodInfo, sales: salesCount },
                time: Date.now(),
              });
              if (recentSignals.length > 50) recentSignals.shift();

              for (const [id, clientRes] of clients.entries()) {
                if (id !== data.senderDeviceId && (!target || target === '*' || target === id)) {
                  try {
                    clientRes.write(`event: signal\ndata: ${JSON.stringify(data)}\n\n`);
                  } catch {
                    clients.delete(id);
                  }
                }
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch (err: any) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}
