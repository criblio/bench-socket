# bench-socket
This repo implements 3 ways of distributing HTTP requests from one process to child processes. The goal is to measure the performance of each method.

## Cluster 
This is method is the simple NodeJS cluster module. In it the cluster master process `accept`s a socket and it passes to a child process to handling. The master process does not (and cannot) inspect the payloads. The master process is **not** in the data path. 

## Passthru 
In this method, the cluster master process accepts the HTTP requests, but only processes the headers. It can use the headers to make routing decisions (in terms of which child process needs to process the request). Child processes listen on a unix domain socket. The master process then proxies the request headers + body to the child process - the response is also proxied back to the client. In this case the master process is in the data path.

## Socket 
This method aims to take the master process out of the data path **after** it processes the headers. The master process accepts the socket, reads sufficient info to route the request, then it passes the socket + whatever data it read to a child process. Which then needs to first process the data the master process did and continue with data from the socket. In this case the master process is in the data path only for processing the request headers - it is outside of the data path wrt request body and response.
NOTE: the socket method is **not** straightforward to implement when TLS is involved. 

## Benchmark
To evaluate the performance we chose to use `ab` and measure the total data thruput the system could handle. The benchmark was ran on a system with 4 child processes, using two types of requests:
1. 10MB payload size 
2. 1MB payload size 


## Results 
Connection reuse: **NO**
| Test  | Thruput w/ 10MB Req | Thruput w/ 1MB Req |
| - | -: | -: | 
| cluster | 374 r/s| 1397 r/s |
| socket | 167 r/s | 258 r/s | 
| passthru |  87 r/s| 578 r/s|


Connection reuse: **YES** 
| Test  | Thruput w/ 10MB Req | Thruput w/ 1MB Req |
| - | -: | -: | 
| cluster | 461 r/s | 3059 r/s |
| socket | 301 r/s | 2662 r/s |
| passthru | 100 r/s | 680 r/s | 
