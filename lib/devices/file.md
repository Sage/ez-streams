## File based EZ streams

`var ez = require('ez-streams');`

* `reader = ez.devices.file.text.reader(path, encoding)`  
  creates an EZ reader that reads from a text file.    
  `encoding` is optional. It defaults to `'utf8'`.  
* `writer = ez.devices.file.text.writer(path, encoding)`  
  creates an EZ writer that writes to a text file.    
  `encoding` is optional. It defaults to `'utf8'`.  
* `reader = ez.devices.file.binary.reader(path)`  
  creates an EZ reader that reads from a binary file.    
* `writer = ez.devices.file.binary.writer(path)`  
  creates an EZ writer that writes to a binary file.    
