const http = require('http');
const cluster = require('cluster');

/**
 * Starts a simple NodeJS cluster based HTTP server
 */

const workerListener = function (req, res) {
  req.on('data', d => {});
  req.on('end', () => {     
    res.end('some response data here'); 
});
};

const workers = Number(process.argv[3] || 3);
if(cluster.isMaster) {
  for(let i=0; i<workers; i++) cluster.fork();
} else {
  const server = http.createServer(workerListener);
  const port = process.argv[2] || 8080;
  server.listen(port, () => process.stderr.write(`worker listening on port=${port}\n`));
}
