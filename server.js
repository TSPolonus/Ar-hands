const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('404 Nie znaleziono pliku');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end(`Błąd serwera: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
});

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIpAddresses();
  console.log('\n========================================================');
  console.log('🚀 SERWER AR HAND TRACKER ZOSTAŁ URUCHOMIONY!');
  console.log('========================================================');
  console.log(`\n💻 Na tym komputerze:  http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`📱 Na tablecie Huawei (w tej samej sieci Wi-Fi):`);
    ips.forEach(ip => console.log(`   http://${ip}:${PORT}`));
  }
  console.log('\n💡 WSKAZÓWKA DLA TABLETU:');
  console.log('Przeglądarki mobilne wymagają HTTPS do włączenia kamery.');
  console.log('Najprostszym i darmowym sposobem z pełnym HTTPS jest wrzucenie na GitHub Pages (instrukcja w README.md)!');
  console.log('========================================================\n');
});
