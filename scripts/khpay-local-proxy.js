#!/usr/bin/env node
// KHPay local proxy — run this on your Cambodia machine.
// Vercel's servers are geo-blocked by KHPay's WAF (non-KH IPs get a CAPTCHA).
// This script runs on your local KH IP and relays requests to khpay.site.
// Expose it to the internet via: npx cloudflared tunnel --url http://localhost:4099

const http = require("http");
const https = require("https");

const PORT = 4099;
const KHPAY_BASE = "https://khpay.site/api/v1";

// Read API key from env or ~/.khpay/config.json (same as the CLI)
function getApiKey() {
  const fromEnv = (process.env.KHPAY_API_KEY ?? "").replace(/[\s"']/g, "");
  if (fromEnv) return fromEnv;
  try {
    const os = require("os");
    const path = require("path");
    const fs = require("fs");
    const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".khpay", "config.json"), "utf8"));
    return (cfg.api_key ?? cfg.apiKey ?? "").replace(/[\s"']/g, "");
  } catch {
    return "";
  }
}

// Shared secret that Vercel must include in every request (set KHPAY_PROXY_SECRET in Vercel)
const PROXY_SECRET = (process.env.KHPAY_PROXY_SECRET ?? "a5524b7287b1420cafe9c68d4b720ff2").replace(/[\s]/g, "");

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, proxy: "khpay-local", version: "1.0.0" }));
    return;
  }

  const isGenerate = req.method === "POST" && req.url === "/qr/generate";
  const checkMatch = req.method === "GET" && /^\/qr\/check\/.+/.test(req.url || "");

  if (!isGenerate && !checkMatch) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, message: "Not found" }));
    return;
  }

  // Validate proxy secret
  const incomingSecret = (req.headers["x-proxy-secret"] ?? "").replace(/[\s]/g, "");
  if (!PROXY_SECRET || incomingSecret !== PROXY_SECRET) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, message: "Forbidden" }));
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, message: "API key not configured" }));
    return;
  }

  const forwardUpstream = (method, path, payload) => {
    const upstreamReq = https.request(
      {
        hostname: "khpay.site",
        port: 443,
        path,
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "khpay-cli/0.2.0",
          ...(payload ? { "Content-Length": payload.length } : {}),
        },
      },
      (upstreamRes) => {
        const chunks = [];
        upstreamRes.on("data", (c) => chunks.push(c));
        upstreamRes.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8");
          res.writeHead(upstreamRes.statusCode ?? 200, {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(responseBody);
          console.log(`[${new Date().toISOString()}] KHPay ${method} ${path} -> ${upstreamRes.statusCode} — ${responseBody.slice(0, 120)}`);
        });
      },
    );

    upstreamReq.on("error", (err) => {
      console.error("Upstream error:", err.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "KHPay request failed: " + err.message }));
    });

    if (payload) {
      upstreamReq.write(payload);
    }
    upstreamReq.end();
  };

  if (checkMatch) {
    const txId = decodeURIComponent((req.url || "").split("/").pop() || "");
    if (!txId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "Missing transaction id" }));
      return;
    }

    forwardUpstream("GET", `/api/v1/qr/check/${encodeURIComponent(txId)}`);
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const payload = Buffer.from(body, "utf8");
    forwardUpstream("POST", "/api/v1/qr/generate", payload);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`\nKHPay local proxy running on http://localhost:${PORT}`);
  console.log(`\nNext step — expose it publicly with Cloudflare Tunnel:`);
  console.log(`  npx cloudflared tunnel --url http://localhost:${PORT}\n`);
  console.log(`Copy the https://xxx.trycloudflare.com URL shown, then set it in Vercel:`);
  console.log(`  npx vercel env add KHPAY_LOCAL_PROXY_URL production\n`);
});
