const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5000;

// Map file extensions to content types
const contentTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  // Get the file path from the URL
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  // Get the file extension
  const extname = String(path.extname(filePath)).toLowerCase();
  
  // Set the default content type for the response
  let contentType = contentTypes[extname] || 'application/octet-stream';
  
  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If file doesn't exist, serve index.html (for SPA-like behavior)
      filePath = path.join(__dirname, 'index.html');
      contentType = 'text/html';
    }
    
    // Read the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end(`Error loading the file: ${err.code}`);
        return;
      }
      
      // Add CORS headers
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, x-auth-token'
      });
      
      res.end(content, 'utf-8');
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}/`);
});