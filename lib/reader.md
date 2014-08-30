## EZ Streams core reader API

`var ez = require("ez-streams")`  

* `ez.reader.decorate(proto)`  
  Adds the EZ streams reader API to an object. 
  Usually the object is a prototype but it may be any object with a `read(_)` method.  
  You do not need to call this function if you create your readers with
  the `ez.devices` modules.   
  Returns `proto` for convenience.
* `count = reader.forEach(_, fn, thisObj)`  
  Similar to `forEach` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  This call is asynchonous. It returns the number of entries processed when the end of stream is reached.
* `reader = reader.map(fn, thisObj)`  
  Similar to `map` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = reader.every(_, fn, thisObj)`  
  Similar to `every` on arrays.  
  The `fn` function is called as `fn(_, elt)`.  
  Returns true at the end of stream if `fn` returned true on every entry.  
  Stops streaming and returns false as soon as `fn` returns false on an entry.
* `result = reader.some(_, fn, thisObj)`  
  Similar to `some` on arrays.  
  The `fn` function is called as `fn(_, elt)`.  
  Returns false at the end of stream if `fn` returned false on every entry.  
  Stops streaming and returns true as soon as `fn` returns true on an entry.
* `result = reader.reduce(_, fn, initial, thisObj)`  
  Similar to `reduce` on arrays.  
  The `fn` function is called as `fn(_, current, elt)` where `current` is `initial` on the first entry and
  the result of the previous `fn` call otherwise.
  Returns the value returned by the last `fn` call.
* `writer = reader.pipe(_, writer)`  
  Pipes from `stream` to `writer`.
  Returns the writer for chaining.
* `result = reader.toArray(_)`  
  Reads all entries and returns them to an array.
  Note that this call is an anti-pattern for streaming but it may be useful when working with small streams.
* `reader = reader.transform(fn)`  
  Inserts an asynchronous transformation into chain.  
  This API is more powerful than `map` because the transformation function can combine results, split them, etc.  
  The transformation function `fn` is called as `fn(_, reader, writer)`
  where `reader` is the `stream` to which `transform` is applied,
  and writer is a writer which is piped into the next element of the chain.  
  Returns another stream on which other operations may be chained.
* `result = reader.filter(fn, thisObj)`  
  Similar to `filter` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = reader.until(fn, testVal, thisObj)`  
  Cuts the stream by when the `fn` condition becomes true.  
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = reader.while(fn, testVal, thisObj)`  
  Cuts the stream by when the `fn` condition becomes false.  
  This is different from `filter` in that the result streams _ends_ when the condition
  becomes false, instead of just skipping the entries.
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = reader.limit(count)`  
  Limits the stream to produce `count` results.  
  Returns another stream on which other operations may be chained.
* `result = reader.skip(count)`  
  Skips the first `count` entries of the reader.  
  Returns another stream on which other operations may be chained.
* `group = reader.fork(consumers)`  
  Forks the steam and passes the values to a set of consumers, as if each consumer
  had its own copy of the stream as input.  
  `consumers` is an array of functions with the following signature: `reader = consumer(source)`
  Returns a `StreamGroup` on which other operations can be chained.
* `group = reader.parallel(count, consumer)`  
  Parallelizes by distributing the values to a set of  `count` identical consumers.  
  `count` is the number of consumers that will be created.  
  `consumer` is a function with the following signature: `reader = consumer(source)`  
  Returns a `StreamGroup` on which other operations can be chained.  
  Note: transformed entries may be delivered out of order.
* `reader = reader.peekable()`  
  Returns a stream which has been extended with two methods to support lookahead.  
  The lookahead methods are:
  - `reader.peek(_)`: same as `read(_)` but does not consume the item. 
  - `reader.unread(val)`: pushes `val` back so that it will be returned by the next `read(_)`
* `reader = reader.buffer(max)`  
  Returns a stream which is identical to the original one but in which up to `max` entries may have been buffered.  
* `stream = reader.nodify()`  
  converts the reader into a native node Readable stream.  
* `reader = reader.nodeTransform(duplex)`  
  pipes the reader into a node duplex stream. Returns another reader. 
* `cmp = reader1.compare(_, reader2)`  
  compares reader1 and reader2 return 0 if equal,  
## StreamGroup API
* `reader = group.dequeue()`  
  Dequeues values in the order in which they are delivered by the readers.
  Returns a stream on which other operations may be chained.
* `reader = group.rr()`  
  Dequeues values in round robin fashion.
  Returns a stream on which other operations may be chained.
* `reader = group.join(fn, thisObj)`  
  Combines the values read from the readers to produce a single value.
  `fn` is called as `fn(_, values)` where `values` is the set of values produced by 
  all the readers that are still active.  
  `fn` returns the value which will be read from the joined stream. `fn` _must_ also reset to `undefined` the `values` entries
  that it has consumed. The next `read(_)` on the joined stream will fetch these values. 
  Note that the length of the `values` array will decrease every time an input stream is exhausted.
  Returns a stream on which other operations may be chained.
