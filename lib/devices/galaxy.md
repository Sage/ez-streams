## Stream constructors for galaxy

`var ez = require('ez-streams');`

* `reader = ez.devices.galaxy.reader(readStar)`  
  creates an EZ reader from a given `readStar()` function*.
* `writer = ez.devices.galaxy.writer(write)`  
  creates an ES writer from a given `write(_, val)` function.
