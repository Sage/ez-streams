## Stream transform for CSV files

`import * as ez from 'ez-streams'`  

* `transform = ez.transforms.csv.parser(options)`  
  creates a parser transform. The following options can be set:  
  - `sep`: the field separator, comma by default 
* `transform = ez.transforms.csv.formatter(options)`  
  creates a formatter transform. The following options can be set:  
  - `sep`: the field separator, comma by default 
  - `eol`: the end of line marker (`\n`  or `\r\n`)  
