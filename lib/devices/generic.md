## Generic stream constructors

`var ezs = require('ez-streams');`

* `reader = ezs.devices.generic.reader(read)`  
  creates an EZ reader from a given `read(_)` function.
* `writer = ezs.devices.generic.writer(write)`  
  creates an ES writer from a given `write(_, val)` function.
## Special streams

* `ezs.devices.generic.empty`  
  The empty stream. `empty.read(_)` returns `undefined`.
  It is also a null sink. It just discards anything you would write to it.
