/* Moby Family local demo server.
   Runs from source (`npm start`) or as a packaged Windows EXE.
   - serves the PWA over HTTP on the local network
   - injects the share/QR address into index.html
   - opens the default browser automatically in EXE mode
   - falls back to the next free port if 4173 is busy
*/
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, execFile } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE_PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const IS_EXE = typeof process.pkg !== 'undefined';
let activePort = BASE_PORT;
let tries = 0;

if (IS_EXE) process.title = 'Moby Family — demo server';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const ALLOWED_FILES = [
  '/index.html',
  '/manifest.webmanifest',
  '/service-worker.js',
  '/favicon.ico'
];
const ALLOWED_DIRS = ['/css/', '/js/', '/assets/'];

function lanAddresses() {
  const nets = os.networkInterfaces();
  const found = [];
  const virtual = /(vmware|virtualbox|vbox|hyper-v|vethernet|wsl|loopback|docker|tailscale|zerotier|radmin|vpn|tap|tun)/i;
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        found.push({
          name,
          address: net.address,
          score: virtual.test(name) ? 0 : /(wi-?fi|wlan|wireless|беспровод|ethernet|eth|en0|wlp)/i.test(name) ? 3 : 2
        });
      }
    });
  });
  return found.sort((a, b) => b.score - a.score);
}

let cachedDefaultAddress;
function defaultRouteAddress() {
  if (cachedDefaultAddress !== undefined) return cachedDefaultAddress;
  cachedDefaultAddress = null;
  if (process.platform === 'win32') {
    try {
      const command = 'Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | ForEach-Object { Get-NetIPAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue } | Select-Object -First 1 -ExpandProperty IPAddress';
      const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', command], {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true
      }).trim();
      if (/^\d+\.\d+\.\d+\.\d+$/.test(out)) cachedDefaultAddress = out;
    } catch (err) {
      /* fall back to interface scoring */
    }
  }
  return cachedDefaultAddress;
}

function publicBaseUrl() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/?$/, '/');
  return configuredProductionUrl() || lanBaseUrl();
}

function configuredProductionUrl() {
  try {
    const source = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
    const match = source.match(/productionUrl\s*:\s*'([^']+)'/);
    return match ? match[1].replace(/\/?$/, '/') : null;
  } catch (err) {
    return null;
  }
}

function lanBaseUrl() {
  const defaultAddress = defaultRouteAddress();
  if (defaultAddress) return 'http://' + defaultAddress + ':' + activePort + '/';
  const preferred = lanAddresses()[0];
  if (!preferred) return 'http://localhost:' + activePort + '/';
  return 'http://' + preferred.address + ':' + activePort + '/';
}

function injectLan(html) {
  const lanUrl = publicBaseUrl();
  const snippet = '<script>window.__MOBY_LAN_URL__ = ' + JSON.stringify(lanUrl) + ';</script>\n  ';
  return html.replace('<script src="js/config.js" defer></script>', snippet + '<script src="js/config.js" defer></script>');
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  res.end(body);
}

function isPublicPath(pathname) {
  if (ALLOWED_FILES.indexOf(pathname) !== -1) return true;
  return ALLOWED_DIRS.some((prefix) => pathname.startsWith(prefix));
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (err) {
    return send(res, 400, 'Bad request');
  }

  if (pathname === '/') pathname = '/index.html';
  if (pathname.endsWith('/')) pathname += 'index.html';

  if (!isPublicPath(pathname)) {
    // Allow extensionless app routes to load the shell, but never expose files
    // like package.json, .git or the scripts directory.
    if (!path.extname(pathname)) pathname = '/index.html';
    else return send(res, 404, 'Not found');
  }

  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    let body = data;
    if (ext === '.html') body = injectLan(data.toString('utf8'));
    send(res, 200, body, MIME[ext] || 'application/octet-stream');
  });
});

function openBrowser(url) {
  if (process.platform !== 'win32') return;
  execFile('cmd', ['/c', 'start', '', url], { windowsHide: true }, () => {});
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && tries < 20) {
    tries += 1;
    activePort = BASE_PORT + tries;
    server.listen(activePort, HOST);
    return;
  }
  console.error('  Could not start Moby Family:', err.message);
  process.exitCode = 1;
});

server.on('listening', () => {
  activePort = server.address().port;
  const network = lanAddresses();
  console.log('');
  console.log('  Moby Family PWA');
  console.log('  Local:   http://localhost:' + activePort + '/');
  network.forEach((a) => {
    console.log('  Phone:   http://' + a.address + ':' + activePort + '/  (' + a.name + ')');
  });
  console.log('');
  console.log('  QR target: ' + publicBaseUrl());
  console.log('  QR opens the public version and works across networks.');
  console.log('  Keep this window open while the demo is running. Press Ctrl+C to stop.');
  console.log('');
  if (IS_EXE) {
    setTimeout(() => openBrowser('http://localhost:' + activePort + '/'), 500);
  }
});

server.listen(BASE_PORT, HOST);
