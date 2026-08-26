const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('ok');
});

server.listen(3000, async () => {
  try {
    await fetch('http://localhost:3000', {
      headers: {
        'Authorization': 'Bearer a\nb'
      }
    });
  } catch (e) {
    console.log("Newline error:", e.message, e.name);
  }
  
  try {
    await fetch('http://localhost:3000', {
      headers: {
        'Authorization': 'Bearer äöü'
      }
    });
  } catch (e) {
    console.log("Umlaut error:", e.message, e.name);
  }

  server.close();
});
