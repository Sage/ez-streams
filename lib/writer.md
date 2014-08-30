## EZ Streams core writer API

`var ez = require("ez-streams")`  

* `ez.writer.decorate(proto)`  
  Adds the EZ streams writer API to an object. 
  Usually the object is a prototype but it may be any object with a `write(_, data)` method.  
  You do not need to call this function if you create your readers with
  the `ez.devices` modules.   
  Returns `proto` for convenience.
* `writer = writer.premap(fn, thisObj)`  
  Similar to `map` on arrays.  
  The `fn` function is called as `fn(_, elt, i)`.  
  Returns another writer on which other operations may be chained.
* `stream = writer.nodify()`  
  converts the writer into a native node Writable stream.  
