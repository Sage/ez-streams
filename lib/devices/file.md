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
* `reader = ez.devices.file.list(path, options)`  
  `reader = ez.devices.file.list(path, recurse, accept)`  
  creates a reader that enumerates (recursively) directories and files.  
  Returns the entries as `{ path: path, name: name, depth: depth, stat: stat }` objects.  
  Two `options` may be specified: `recurse` and `accept`.  
  If `recurse` is falsy, only the entries immediately under `path` are returned.  
  If `recurse` is truthy, entries at all levels (including the root entry) are returned.  
  If `recurse` is `"postorder"`, directories are returned after their children.  
  `accept` is an optional function which will be called as `accept(_, entry)` and 
  will control whether files or subdirectories will be included in the stream or not.  
