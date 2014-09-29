## EZ Streams core writer API

`var ez = require("ez-streams")`  

* `ez.writer.decorate(proto)`  
  Adds the EZ streams writer API to an object. 
  Usually the object is a prototype but it may be any object with a `write(_, data)` method.  
  You do not need to call this function if you create your readers with
  the `ez.devices` modules.   
  Returns `proto` for convenience.

* `writer = writer.writeAll(_, val)`  
  writes `val` and ends the writer
* `writer = writer.pre.action(fn)`  
  returns another writer which applies `action(fn)` before writing to the original writer.  
  `action` may be any chainable action from the reader API: `map`, `filter`, `transform`, ...  
* `stream = writer.nodify()`  
  converts the writer into a native node Writable stream.  
