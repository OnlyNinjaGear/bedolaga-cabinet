/**
 * Vite plugin: local mock for /api/cabinet/branding/* endpoints.
 *
 * - GET requests first check the in-memory store; if no local override exists,
 *   they fall through to the production proxy.
 * - Write requests (PATCH/POST/PUT/DELETE) are handled locally:
 *   the request body is merged into the in-memory store and echoed back.
 * - Nothing is sent to production for write operations.
 *
 * This lets you test theme changes without affecting prod users.
 */

import type { Plugin, Connect } from 'vite';

// ── Default data (returned until the first GET populates from prod) ─────────

const DEFAULT_COLORS = {
  accent: '#3b82f6',
  darkBackground: '#09090b',
  darkSurface: '#18181b',
  darkText: '#fafafa',
  darkTextSecondary: '#a1a1aa',
  lightBackground: '#fafafa',
  lightSurface: '#ffffff',
  lightText: '#18181b',
  lightTextSecondary: '#71717a',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

const DEFAULT_THEMES = { dark: true, light: true };

// ── In-memory store ─────────────────────────────────────────────────────────

const store: Record<string, unknown> = {};

function get(key: string, fallback: unknown) {
  return store[key] ?? fallback;
}

function set(key: string, data: unknown) {
  store[key] = data;
  return store[key];
}

function merge(key: string, patch: Record<string, unknown>, fallback: unknown) {
  const current = (store[key] ?? fallback) as Record<string, unknown>;
  store[key] = { ...current, ...patch };
  return store[key];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

import type { ServerResponse } from 'http';

function json(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// ── Route table ─────────────────────────────────────────────────────────────

type Handler = (req: Connect.IncomingMessage, res: ServerResponse) => Promise<void> | void;

function routes(): Record<string, Record<string, Handler>> {
  return {
    '/api/cabinet/branding/colors': {
      GET: (_req, res) => {
        if (store['colors']) {
          json(res, 200, store['colors']);
        } else {
          // No local override yet — let proxy handle it
          return;
        }
      },
      PATCH: async (req, res) => {
        const body = JSON.parse(await readBody(req));
        const result = merge('colors', body, DEFAULT_COLORS);
        console.log('[mock] PATCH /branding/colors — saved locally');
        json(res, 200, result);
      },
    },
    '/api/cabinet/branding/colors/reset': {
      POST: (_req, res) => {
        set('colors', { ...DEFAULT_COLORS });
        console.log('[mock] POST /branding/colors/reset — reset to defaults');
        json(res, 200, store['colors']);
      },
    },
    '/api/cabinet/branding/themes': {
      GET: (_req, res) => {
        if (store['themes']) {
          json(res, 200, store['themes']);
        } else {
          return; // proxy
        }
      },
      PATCH: async (req, res) => {
        const body = JSON.parse(await readBody(req));
        const result = merge('themes', body, DEFAULT_THEMES);
        console.log('[mock] PATCH /branding/themes — saved locally');
        json(res, 200, result);
      },
    },
    '/api/cabinet/branding/animation': {
      PATCH: async (req, res) => {
        const body = JSON.parse(await readBody(req));
        const result = merge('animation', body, { enabled: true });
        console.log('[mock] PATCH /branding/animation — saved locally');
        json(res, 200, result);
      },
    },
    '/api/cabinet/branding/animation-config': {
      PATCH: async (req, res) => {
        const body = JSON.parse(await readBody(req));
        const result = merge('animation-config', body, {});
        console.log('[mock] PATCH /branding/animation-config — saved locally');
        json(res, 200, result);
      },
    },
    '/api/cabinet/branding/fullscreen': {
      PATCH: async (req, res) => {
        const body = JSON.parse(await readBody(req));
        const result = merge('fullscreen', body, { enabled: false });
        json(res, 200, result);
      },
    },
    '/api/cabinet/branding/email-auth': {
      PATCH: async (req, res) => {
        const body = JSON.parse(await readBody(req));
        const result = merge('email-auth', body, { enabled: true });
        json(res, 200, result);
      },
    },
    '/api/cabinet/branding/gift-enabled': {
      PATCH: async (req, res) => {
        const body = JSON.parse(await readBody(req));
        const result = merge('gift-enabled', body, { enabled: false });
        json(res, 200, result);
      },
    },
    '/api/cabinet/branding/analytics': {
      PATCH: async (req, res) => {
        const body = JSON.parse(await readBody(req));
        const result = merge('analytics', body, {});
        json(res, 200, result);
      },
    },
    '/api/cabinet/branding/name': {
      PUT: async (req, res) => {
        const body = JSON.parse(await readBody(req));
        const result = merge('branding', body, {
          name: '',
          logo_url: null,
          logo_letter: '',
          has_custom_logo: false,
        });
        json(res, 200, result);
      },
    },
    '/api/cabinet/branding/logo': {
      POST: async (_req, res) => {
        json(
          res,
          200,
          get('branding', { name: '', logo_url: null, logo_letter: '', has_custom_logo: false }),
        );
      },
      DELETE: (_req, res) => {
        json(res, 200, merge('branding', { logo_url: null, has_custom_logo: false }, {}));
      },
    },
  };
}

// ── Vite plugin ─────────────────────────────────────────────────────────────

export function mockBrandingPlugin(): Plugin {
  return {
    name: 'mock-branding',
    configureServer(server) {
      const routeTable = routes();

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]; // strip query params
        if (!url?.startsWith('/api/cabinet/branding')) {
          return next();
        }

        const method = req.method ?? 'GET';
        const handler = routeTable[url]?.[method];

        if (handler) {
          try {
            const result = handler(req, res);
            // If handler returns undefined without writing a response,
            // it means "fall through to proxy" (used by GET when no local data)
            if (result instanceof Promise) await result;
            if (!res.writableEnded) {
              // Handler didn't write — fall through to proxy
              return next();
            }
          } catch (e) {
            console.error('[mock] Error:', e);
            json(res, 500, { error: String(e) });
          }
        } else if (method !== 'GET') {
          // Unknown write endpoint — block it from reaching prod
          console.log(`[mock] Blocked unknown write: ${method} ${url}`);
          json(res, 200, {});
        } else {
          // Unknown GET — let proxy handle
          return next();
        }
      });

      console.log('\n  🎨 Mock branding server active — theme changes stay local\n');
    },
  };
}
