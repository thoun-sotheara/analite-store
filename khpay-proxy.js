/**
 * KHPay local dev proxy
 *
 * Usage:
 *   KHPAY_API_KEY=your_key node khpay-proxy.js
 *
 * Exposes:
 *   GET  /health                       → liveness check
 *   *    /api/khpay/*                  → proxies to https://khpay.site/api/v1/*
 *   GET  /api/khpay/render-qr?d=<str>  → returns a PNG QR code for the given data string
 *   GET  /api/khpay/fetch-qr?u=<url>   → authenticated proxy-fetch for KHPay QR image URLs
 *
 * Set KHPAY_PROXY_PORT to change the default port (8787).
 */

'use strict';

const http = require('http');
const { URL } = require('url');
const QRCode = require('qrcode');

const PORT = Number(process.env.KHPAY_PROXY_PORT || 8787);
const TARGET_BASE = 'https://khpay.site/api/v1';
const API_PREFIX = '/api/khpay';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, statusCode, data) {
  setCors(res);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function forward(req, res) {
  // ── /api/khpay/render-qr?d=<data> → PNG QR code ──────────────────────────
  if (req.url.startsWith(API_PREFIX + '/render-qr')) {
    const incoming = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const data = String(incoming.searchParams.get('d') || '');
    if (!data) {
      sendJson(res, 400, { success: false, message: 'Missing query param: d' });
      return;
    }

    try {
      const png = await QRCode.toBuffer(data, {
        type: 'png',
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      setCors(res);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/png');
      res.end(png);
      return;
    } catch (error) {
      sendJson(res, 500, { success: false, message: 'QR render failed', error: error.message });
      return;
    }
  }

  // ── /api/khpay/fetch-qr?u=<url> → authenticated image proxy ──────────────
  if (req.url.startsWith(API_PREFIX + '/fetch-qr')) {
    const incoming = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const source = String(incoming.searchParams.get('u') || '').trim();

    if (!source) {
      sendJson(res, 400, { success: false, message: 'Missing query param: u' });
      return;
    }

    const apiKey = String(process.env.KHPAY_API_KEY || '').trim();
    if (!apiKey) {
      sendJson(res, 500, {
        success: false,
        message: 'KHPAY_API_KEY is not set. Start proxy with the API key in env.',
      });
      return;
    }

    let sourceUrl;
    try {
      sourceUrl = new URL(source);
    } catch {
      sendJson(res, 400, { success: false, message: 'Invalid source URL' });
      return;
    }

    // Restrict proxying to the KHPay QR download endpoint only.
    const validHost = sourceUrl.hostname === 'khpay.site';
    const validPath = sourceUrl.pathname.startsWith('/api/v1/qr/');
    if (!validHost || !validPath || sourceUrl.protocol !== 'https:') {
      sendJson(res, 403, { success: false, message: 'URL is not allowed for QR fetch' });
      return;
    }

    try {
      const upstream = await fetch(sourceUrl.toString(), {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const arr = await upstream.arrayBuffer();
      setCors(res);
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
      res.end(Buffer.from(arr));
      return;
    } catch (error) {
      sendJson(res, 502, { success: false, message: 'QR fetch failed', error: error.message });
      return;
    }
  }

  // ── Unknown non-khpay path ─────────────────────────────────────────────────
  if (!req.url.startsWith(API_PREFIX)) {
    sendJson(res, 404, { success: false, message: 'Unknown endpoint. Use /api/khpay/*' });
    return;
  }

  // ── /api/khpay/* → forward to KHPay API ───────────────────────────────────
  const apiKey = String(process.env.KHPAY_API_KEY || '').trim();
  if (!apiKey) {
    sendJson(res, 500, {
      success: false,
      message: 'KHPAY_API_KEY is not set. Start proxy with the API key in env.',
    });
    return;
  }

  const suffix = req.url.slice(API_PREFIX.length) || '/';
  const targetUrl = new URL(TARGET_BASE + suffix);

  try {
    const rawBody = await readBody(req);
    const upstream = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : rawBody,
    });

    const arr = await upstream.arrayBuffer();
    setCors(res);
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.end(Buffer.from(arr));
  } catch (error) {
    sendJson(res, 502, { success: false, message: 'Proxy request failed', error: error.message });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.url === '/health') {
    sendJson(res, 200, { ok: true, service: 'khpay-local-proxy' });
    return;
  }

  await forward(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[khpay-proxy] Running on http://127.0.0.1:${PORT}`);
  console.log(`[khpay-proxy] Forward prefix: ${API_PREFIX} → ${TARGET_BASE}`);
  console.log('[khpay-proxy] Set KHPAY_API_KEY in your terminal before starting.');
});
