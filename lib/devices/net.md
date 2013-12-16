## TCP and socket EZ Streams

`var ezs = require('ez-streams');`

* `server = ezs.devices.net.server(serverOptions, listener, streamOptions)`  
  Creates an EZ HTTP server.  
  The `listener` is called as `listener(stream, _)`  
  where `stream` is an EZ reader and writer.  
  For a full description of this API, see `NetServer` in
  https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
* `client = ezs.devices.net.tcpClient(port, host, options)`  
  Creates an EZ TCP client.  
  The stream returned by `client.connect(_)`  is an EZ reader and writer.  
  For a full description of this API, see `tcpClient` in
  https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
* `client = ezs.devices.net.socketClient(path, options)`  
  Creates an EZ socket client.  
  The stream returned by `client.connect(_)`  is an EZ reader and writer.  
  For a full description of this API, see `tcpClient` in
  https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 