## High-level functional stream API

* `api.decorate(proto)`  
  Adds the high-level API to an object. 
  Usually this object is a prototype but it may be any object with a `read(_)` method.  
  You do not need to call this function if you use streamline wrappers around node.js streams, or streams
  created with `streams.reader(readFn)` because the high-level API is already in place.  
  Returns `proto` for convenience.
* `count = stream.forEach(_, fn, thisObj)`  
  Similar to `forEach` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  This call is asynchonous. It returns the number of entries processed when the end of stream is reached.
* `stream = stream.map(fn, thisObj)`  
  Similar to `map` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = stream.every(_, fn, thisObj)`  
  Similar to `every` on arrays.  
  The `fn` function is called as `fn(_, elt)`.  
  Returns true at the end of stream if `fn` returned true on every entry.  
  Stops streaming and returns false as soon as `fn` returns false on an entry.
* `result = stream.some(_, fn, thisObj)`  
  Similar to `some` on arrays.  
  The `fn` function is called as `fn(_, elt)`.  
  Returns false at the end of stream if `fn` returned false on every entry.  
  Stops streaming and returns true as soon as `fn` returns true on an entry.
* `result = stream.reduce(_, fn, initial, thisObj)`  
  Similar to `reduce` on arrays.  
  The `fn` function is called as `fn(_, current, elt)` where `current` is `initial` on the first entry and
  the result of the previous `fn` call otherwise.
  Returns the value returned by the last `fn` call.
* `count = stream.pipe(_, writer)`  
  Pipes from `stream` to `writer`.
  Returns the writer for chaining.
* `stream = stream.transform(fn)`  
  Inserts an asynchronous transformation into chain.  
  This API is more powerful than `map` because the transformation function can combine results, split them, etc.  
  The transformation function `fn` is called as `fn(_, reader, writer)`
  where `reader` is the `stream` to which `transform` is applied,
  and writer is a writer which is piped into the next element of the chain.  
  Returns another stream on which other operations may be chained.
* `result = stream.filter(fn, thisObj)`  
  Similar to `filter` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = stream.until(fn, testVal, thisObj)`  
  Cuts the stream by when the `fn` condition becomes true.  
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = stream.while(fn, testVal, thisObj)`  
  Cuts the stream by when the `fn` condition becomes false.  
  This is different from `filter` in that the result streams _ends_ when the condition
  becomes false, instead of just skipping the entries.
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another stream on which other operations may be chained.
* `result = stream.limit(count)`  
  Limits the stream to produce `count` results.  
  Returns another stream on which other operations may be chained.
* `result = stream.skip(count)`  
  Skips the first `count` entries of the stream.  
  Returns another stream on which other operations may be chained.
* `group = stream.fork(consumers)`  
  Forks the steam and passes the values to a set of consumers, as if each consumer
  had its own copy of the stream as input.  
  `consumers` is an array of functions with the following signature: `stream = consumer(source)`
  Returns a `StreamGroup` on which other operations can be chained.
* `group = stream.parallel(count, consumer)`  
  Parallelizes by distributing the values to a set of  `count` identical consumers.  
  `count` is the number of consumers that will be created.  
  `consumer` is a function with the following signature: `stream = consumer(source)`  
  Returns a `StreamGroup` on which other operations can be chained.  
  Note: transformed entries may be delivered out of order.
* `stream = stream.peekable()`  
  Returns a stream which has been extended with two methods to support lookahead.  
  The lookahead methods are:
  - `stream.peek(_)`: same as `read(_)` but does not consume the item. 
  - `stream.unread(val)`: pushes `val` back so that it will be returned by the next `read(_)`
* `stream = stream.buffer(size)`  
  Returns a stream which is identical to the original one but in which up to `size` entries may have been buffered.  
## StreamGroup API
* `stream = group.dequeue()`  
  Dequeues values in the order in which they are delivered by the streams.
  Returns a stream on which other operations may be chained.
* `stream = group.rr()`  
  Dequeues values in round robin fashion.
  Returns a stream on which other operations may be chained.
* `stream = group.join(fn, thisObj)`  
  Combines the values read from the streams to produce a single value.
  `fn` is called as `fn(_, values)` where `values` is the set of values produced by 
  all the streams that are still active.  
  `fn` returns the value which will be read from the joined stream. `fn` _must_ also reset to `undefined` the `values` entries
  that it has consumed. The next `read(_)` on the joined stream will fetch these values. 
  Note that the length of the `values` array will decrease every time an input stream is exhausted.
  Returns a stream on which other operations may be chained.
