## Array readers and writers

`var ezs = require('ez-streams');`

* `reader = ezs.devices.array.reader(array, options)`  
  creates an EZ reader that reads its entries from `array`.  
  `reader.read(_)` will return its entries asynchronously by default.  
  You can force synchronous delivery by setting `options.sync` to `true`.
* `writer = ezs.devices.array.writer(options)`  
  creates an EZ writer that collects its entries into an array.  
  `writer.write(_, value)` will write asynchronously by default.  
  You can force synchronous write by setting `options.sync` to `true`.
  `writer.toArray()` returns the internal array into which the 
  entries have been collected.
