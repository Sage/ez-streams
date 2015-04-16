## Stream constructors for galaxy

`var ez = require('ez-streams');`

* `reader = ez.devices.galaxy.reader(readStar[, stop])`  
  creates an EZ reader from a given `readStar()` function* and an optional `stop([arg])` function.
* `writer = ez.devices.galaxy.writer(write)`  
  creates an ES writer from a given `write(_, val)` function.
