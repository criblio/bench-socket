const http = require('http');
const cluster = require('cluster');
const fs = require('fs');
const net = require('net');

const unixDomainPath = '/tmp/worker.http'


/**
 * Starts:
 *  1. a TCP server listening, by default, on port 8080
 *    - receives requests, "parses" an initial chunk of data from socket
 *    - makes routing decisions based on that info 
 *    - passes the read info + socket handle to one of the worker process 
 *    - other than request header this server is out of the data path
 *  2. Starts, by default, 3 worker processes who standup and HTTP server and listen on unix domain socket 
 *    - receive the socket handle, push back any data read by master process and start processing the HTTP request
 *    - they simply read the request body and 
 *    - respond with a minimal 200 OK back 
 */


function getWorkerPath(id) {
 return `${unixDomainPath}.${id}.sock`
}

const workerListener = function (req, res) {
  req.on('data', () => {});
  req.on('end', () => { 
    res.end('some response data here');
  });
};

function startWorkerServer() {
  const server = http.createServer(workerListener);
  const path = getWorkerPath(cluster.worker.id);
  try{ fs.unlinkSync(path); } catch(ignore){};
  server.listen({path}, () => process.stderr.write(`listening on path=${path}\n`));
  return server;
}


const workers = Number(process.argv[3] || 3);

if(cluster.isMaster) {
  const w = [];
  for(let i=0; i<workers; i++) w.push(cluster.fork());

  const server = net.createServer(()=>{});
  server.once('listening', () => {
    console.log(`listening on port=${port}`)
    server._handle.onconnection =  (err, handle) => {
      handle.onread = r => { 
        if(r == null) return;
        const buf = Buffer.from(r); /// make some routing decision based on this 
        handle.readStop();
        const proxyTo = w[Math.floor(Math.random()*w.length)];
        proxyTo.send(buf, handle); // send handle and any of the data that was read from it (it will be unread on the other side)
      };
      handle.readStart();
    };
  });
  const port = process.argv[2] || 8080;
  server.listen(port);
} else {
  const server = startWorkerServer();
  process.on('message', (msg, handle) => {
    if(!msg.data) return;
    const sock = new net.Socket({handle,
      allowHalfOpen: true,
      pauseOnCreate: false,
      readable: true,
      writable: true,
    });
    sock.unshift(Buffer.from(msg.data)); // unread some data into the socket
    server.emit('connection', sock);  // pass the socket to http server, as if a new connection came in
  })
}
