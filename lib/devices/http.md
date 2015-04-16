## HTTP EZ Streams

`var ez = require('ez-streams');`

* `server = ez.devices.http.server(listener, options)`  
  Creates an EZ HTTP server.  
  The `listener` is called as `listener(request, response, _)`  
  where `request` is an EZ reader and `response` an EZ writer.  
  For a full description of this API, see `HttpServerRequest/Response` in
  https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
* `client = ez.devices.http.client(options)`  
  Creates an EZ HTTP client.  
  `client` is an EZ writer.  
  The response object returned by `client.response(_)`  is an EZ reader.  
  For a full description of this API, see `HttpClientRequest/Response` in
  https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
* `listener = ez.devices.http.listener(listener, options)`  
   wraps an ez-streams listener as a vanilla node.js listener
* `factory = ez.factory("http://user:pass@host:port/...")` 
   Use reader for a GET request, writer for POST request
* `reader = factory.reader(_)`  
* `writer = factory.writer(_)`  
