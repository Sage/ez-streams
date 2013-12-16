## Stream transform for CSV files

`var ezs = require("ez-streams")`  

* `transform = ezs.transforms.csv.parser(options)`  
  creates a parser transform. The following options can be set:  
  - `sep`: the field separator, comma by default 
* `transform = ezs.transforms.csv.formatter(options)`  
  creates a formatter transform. The following options can be set:  
  - `sep`: the field separator, comma by default 
  - `eol`: the end of line marker (`\n`  or `\r\n`)  
