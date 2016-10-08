## Stream transform for MIME multipart

`import * as ez from 'ez-streams'`  

* `transform = ez.transforms.multipart.parser(options)`  
  Creates a parser transform.
  The content type, which includes the boundary,
  is passed via `options['content-type']`.
* `transform = ez.transforms.multipart.formatter(options)`  
  Creates a formatter transform.
  The content type, which includes the boundary,
  is passed via `options['content-type']`.
