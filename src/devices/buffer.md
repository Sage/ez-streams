## In-memory buffer streams

`import * as ez from 'ez-streams'`

* `reader = ez.devices.buffer.reader(buffer, options)`  
  creates an EZ reader that reads its entries from `buffer`.  
  `reader.read(_)` will return its entries asynchronously by default.  
  You can force synchronous delivery by setting `options.sync` to `true`.
  The default chunk size is 1024. You can override it by passing 
  a `chunkSize` option.
* `writer = ez.devices.buffer.writer(options)`  
  creates an EZ writer that collects data into an buffer.  
  `writer.write(_, data)` will write asynchronously by default.  
  You can force synchronous write by setting `options.sync` to `true`.
  `writer.toBuffer()` returns the internal buffer into which the 
  chunks have been collected.
