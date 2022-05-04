const http = require('http');
const cluster = require('cluster');
const fs = require('fs');
const net = require('net');

const unixDomainPath = '/tmp/worker.http'

function getWorkerPath(id) {
 return `${unixDomainPath}.${id}.sock`
}

const masterListener = function (req, res) {
  const start = Date.now();
  // inspect request and route to correct worker process - here we just pick randomly
  const proxyReqOptions = {
    socketPath: getWorkerPath(Math.floor(Math.random()*workers) + 1),
    path: `/worker${req.url}`,
    headers: {
      ...req.headers, 
    },
    method: req.method,
    agent: false
  };
  req.pause(); // stop buffering, to avoid reading anything else from socket

  // proxy the request to 
  const proxiedReq = http.request(proxyReqOptions, function(proxyResp) {
    proxyResp.pause();
    res.writeHead(proxyResp.statusCode, proxyResp.headers); // send headers 
    proxyResp.pipe(res);  // pipe worker response body to client
    proxyResp.resume();
  })
  .on('error', err => {
    console.log(err);
    res.end();
  });

  // pipe requst to 
  req.pipe(proxiedReq);
  req.resume();
};

const workerListener = function (req, res) {
  req.on('data', () => {});
  req.on('end', () => { res.end() });
};


function startWorkerServer() {
  const server = http.createServer(workerListener);
  const path = getWorkerPath(cluster.worker.id);
  try{ fs.unlinkSync(path); } catch(ignore){};
  server.listen({path}, () => process.stderr.write(`listening on path=${path}\n`));
}

const workers = Number(process.argv[3] || 3);
if(cluster.isMaster) {
  const server = http.createServer(masterListener);
  const port = process.argv[2] || 8080;
  server.listen(port, () => process.stderr.write(`master listening on port=${port}, workers=${workers}\n`));
  for(let i=0; i<workers; i++) cluster.fork();
} else {
  startWorkerServer();
}

