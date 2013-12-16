## In-memory string streams

`var ezs = require('ez-streams');`

* `reader = ezs.devices.string.reader(text, options)`  
  creates an EZ reader that reads its chunks from `text`.  
  `reader.read(_)` will return the chunks asynchronously by default.  
  You can force synchronous delivery by setting `options.sync` to `true`.
  The default chunk size is 1024. You can override it by passing 
  a `chunkSize` option.
* `writer = ezs.devices.string.writer(options)`  
  creates an EZ writer that collects strings into a text buffer.  
  `writer.write(_, data)` will write asynchronously by default.  
  You can force synchronous write by setting `options.sync` to `true`.
  `writer.toString()` returns the internal text buffer into which the 
  strings have been collected.
