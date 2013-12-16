## Stream transform for MIME multipart

`var ezs = require("ez-streams")`  

* `transform = ezs.transforms.multipart.parser(options)`  
  Creates a parser transform.
  The content type, which includes the boundary,
  is passed via `options['content-type']`.
* `transform = ezs.transforms.multipart.formatter(options)`  
  Creates a formatter transform.
  The content type, which includes the boundary,
  is passed via `options['content-type']`.
