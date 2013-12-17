## Generic stream constructors

`var ez = require('ez-streams');`

* `reader = ez.devices.generic.reader(read)`  
  creates an EZ reader from a given `read(_)` function.
* `writer = ez.devices.generic.writer(write)`  
  creates an ES writer from a given `write(_, val)` function.
## Special streams

* `ez.devices.generic.empty`  
  The empty stream. `empty.read(_)` returns `undefined`.
  It is also a null sink. It just discards anything you would write to it.
