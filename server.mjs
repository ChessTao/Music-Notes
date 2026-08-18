import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, normalize, resolve } from 'node:path';
import { createApi } from './server-api.js';
import { createStorage } from './server-storage.js';
import { textResponse } from './server-utils.js';

const root = resolve('.');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.rules': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolve(root, normalize(relative));
  return filePath.startsWith(root) ? filePath : null;
}

function serveStatic(req, res, url) {
  const filePath = resolveRequestPath(url);

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    textResponse(res, 404, 'Not found');
    return;
  }

  res.writeHead(200, {
    'content-type': types[extname(filePath)] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(res);
}

const storage = await createStorage();
await storage.init();
const api = createApi({ storage });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);
  if (url.pathname.startsWith('/api/')) {
    const handled = await api.handle(req, res, url);
    if (!handled) textResponse(res, 404, 'API route not found');
    return;
  }

  serveStatic(req, res, url);
}).listen(port, host, () => {
  console.log(`Music notes trainer: http://${host}:${port}/`);
  console.log(`Storage: ${storage.kind}`);
});
