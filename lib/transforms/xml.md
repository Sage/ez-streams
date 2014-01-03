
# Simple XML parser and formatter

Transforms back and forth between XML and JS.
Tries to generate a JS object which is as simple as possible, without losing information.

Uses the following rules when converting from XML to JS:
* all values are returned as strings. No attempt to convert numbers and booleans
* attributes are mapped to a `$` subobject.
* simple values are mapped to an object with a `$value` property if the tag has attributes. 
* simple values are mapped to a string if the tag does not have attributes.
* repeating tags are mapped to an array.
* CDATA sections are mapped to an object with a `$cdata` property.
* self-closing tags are returned as an empty object.

Some examples:

```
<a>hello world</a>  --> { a: "hello world" }
<a x="hello">world</a>  --> { a: { $: { x: "hello" }, $value: "world" } }
<a><b>hello</b><c>world</c></a>  --> { a: { b : "hello", c: "world" } }
<a><b>hello</b><b>world</b></a>  --> { a: { b : ["hello", "world"] }
<a></a>  --> { a: "" }
<a/>  --> { a: {} }
```

See the `test/common/jsxmlTest.js` unit test for more examples.

## API

`var jsxml = require('jsxml')`  

* `transform = ez.transforms.xml.parser(options)`  
  creates a parser transform. The following options can be set:  
  - `tags`: the list of tags that enclose each item returned by the reader
* `transform = ez.transforms.xml.formatter(options)`  
  creates a formatter transform. The following options can be set:  
  - `tags`: the list of tags that enclose each item returned by the reader
NOTE: NIY
