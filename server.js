/**
 * Diamond Nine — Node.js 24 server
 * Uses native ESM, the node: protocol, and fs.promises throughout.
 * Run:  node server.js          (production)
 *       node --watch server.js  (dev — built-in file-watching, no nodemon needed)
 */

import { createServer }      from 'node:http';
import { readFile, stat }    from 'node:fs/promises';
import { join, extname }     from 'node:path';
import { fileURLToPath }     from 'node:url';

// __dirname equivalent for ESM
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC    = join(__dirname, 'public');
const PORT      = process.env.PORT ?? 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

/** Resolve a request path to a file inside /public, safely. */
async function resolveFile(urlPath) {
  // Default to index.html
  const relative = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const absolute = join(PUBLIC, relative);

  // Guard against path traversal
  if (!absolute.startsWith(PUBLIC)) return null;

  try {
    const info = await stat(absolute);
    return info.isFile() ? absolute : null;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  // Only allow GET / HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = await resolveFile(req.url);

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 — Not Found');
    return;
  }

  try {
    const ext     = extname(filePath).toLowerCase();
    const mime    = MIME[ext] ?? 'application/octet-stream';
    const content = await readFile(filePath);

    res.writeHead(200, {
      'Content-Type':  mime,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });

    // HEAD requests: headers only, no body
    if (req.method === 'HEAD') { res.end(); return; }

    res.end(content);
  } catch (err) {
    console.error('Read error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 — Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`\n  ◆ Diamond Nine running at http://localhost:${PORT}\n`);
});

// Graceful shutdown (SIGINT = Ctrl+C, SIGTERM = container stop)
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n  ${signal} received — shutting down…`);
    server.close(() => process.exit(0));
  });
}
