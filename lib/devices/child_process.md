## EZ Stream wrappers for node child processes

`var ez = require('ez-streams');`

* `reader = ez.devices.child_process.reader(proc, options)`  
  wraps a node.js child process as an EZ reader.  
  For a full description of the options, see `ReadableStream` in
  https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
* `writer = ez.devices.child_process.writer(proc, options)`  
  wraps a node.js child process as an EZ writer.  
  For a full description of the options, see `WritableStream` in
  https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
