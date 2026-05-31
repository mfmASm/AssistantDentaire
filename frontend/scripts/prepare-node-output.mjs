import { cpSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distClient = join(root, "dist", "client");
const distServer = join(root, "dist", "server");
const outputRoot = join(root, ".output");
const outputPublic = join(outputRoot, "public");
const outputServer = join(outputRoot, "server");
const outputServerBuild = join(outputServer, "build");

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputPublic, { recursive: true });
mkdirSync(outputServerBuild, { recursive: true });

cpSync(distClient, outputPublic, { recursive: true });
cpSync(distServer, outputServerBuild, { recursive: true });

writeFileSync(
  join(outputServer, "index.mjs"),
  `import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import serverBuild from "./build/server.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
]);

function originFromEnv(value) {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

const connectSrc = uniqueValues([
  "'self'",
  originFromEnv(process.env.VITE_API_URL),
  originFromEnv(process.env.VITE_SUPABASE_URL),
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://*.onrender.com",
]);

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  \`connect-src \${connectSrc.join(" ")}\`,
  "navigate-to 'self' https://wa.me https://api.whatsapp.com",
].join("; ");

function applySecurityHeaders(res) {
  res.setHeader("content-security-policy", contentSecurityPolicy);
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "strict-origin-when-cross-origin");
}

function toPublicPath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const candidate = normalize(join(publicDir, pathname));
  const rel = relative(publicDir, candidate);
  if (rel.startsWith("..") || rel === ".." || rel.split(sep).includes("..")) return null;
  return candidate;
}

function serveStatic(req, res) {
  if (!["GET", "HEAD"].includes(req.method || "GET")) return false;
  const filePath = toPublicPath(req.url || "/");
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) return false;

  applySecurityHeaders(res);
  const contentType = contentTypes.get(extname(filePath));
  if (contentType) res.setHeader("content-type", contentType);
  res.setHeader("cache-control", filePath.includes(\`\${sep}assets\${sep}\`) ? "public, max-age=31536000, immutable" : "public, max-age=300");

  if (req.method === "HEAD") {
    res.statusCode = 200;
    res.end();
    return true;
  }

  createReadStream(filePath).pipe(res);
  return true;
}

createServer(async (req, res) => {
  try {
    if (serveStatic(req, res)) return;

    const requestInit = {
      method: req.method,
      headers: req.headers,
    };

    if (!["GET", "HEAD"].includes(req.method || "GET")) {
      requestInit.body = req;
      requestInit.duplex = "half";
    }

    const request = new Request(\`http://\${req.headers.host || "localhost"}\${req.url || "/"}\`, requestInit);

    const response = await serverBuild.fetch(request, process.env, {});
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("content-security-policy", contentSecurityPolicy);
    responseHeaders.set("x-content-type-options", "nosniff");
    responseHeaders.set("referrer-policy", "strict-origin-when-cross-origin");
    res.writeHead(response.status, response.statusText, Object.fromEntries(responseHeaders));

    if (!response.body || req.method === "HEAD") {
      res.end();
      return;
    }

    for await (const chunk of response.body) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    console.error("Hostinger Node server failed", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}).listen(port, host, () => {
  console.log(\`AssistantDentaire listening on http://\${host}:\${port}\`);
});
`,
  "utf8",
);
