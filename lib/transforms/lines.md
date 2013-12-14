Stream transform for line-oriented text streams
## API

`var lines = require("ez-streams").transforms.lines`  

* `transform = lines.parser(options)`  
  creates a parser transform.
  `options` is reserved for future use.
* `transform = lines.formatter(options)`  
  creates a formatter transform.
  `options.eol` defines the line separator. It is set to `\n` by default.
  `options.extra` indicates if an extra line separator must be emitted or not at the end. It is false by default.
