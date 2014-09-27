## helpers for binary streams

`var ez = require("ez-streams")`  

----

* `reader = ez.helpers.binary.reader(reader, options)`  
  Wraps a raw buffer reader and returns a reader with additional API to handle binary streams.  
  By default the reader is configured as big endian.  
  You can configure it as little endian by setting the `endian` option to `"little"`.

* `buf = reader.read(_, len)`  
  returns the `len` next bytes of the stream.  
  returns a buffer of length `len`, except at the end of the stream.  
  The last chunk of the stream may have less than `len` bytes and afterwards the call
  returns `undefined`.  
  If the `len` parameter is omitted, the call returns the next available chunk of data.

* `buf = reader.peek(_, len)`  
  Same as `read` but does not advance the read pointer.  
  Another `read` would read the same data again.

* `reader.unread(len)`  
  Unread the last `len` bytes read.  
  `len` cannot exceed the size of the last read.

* `val = reader.readInt8(_)`  
* `val = reader.readUInt8(_)`  
* `val = reader.readInt16(_)`  
* `val = reader.readUInt16(_)`  
* `val = reader.readInt32(_)`  
* `val = reader.readUInt32(_)`  
* `val = reader.readFloat(_)`  
* `val = reader.readDouble(_)`  
  Specialized readers for numbers.

* `val = reader.peekInt8(_)`  
* `val = reader.peekUInt8(_)`  
* `val = reader.peekInt16(_)`  
* `val = reader.peekUInt16(_)`  
* `val = reader.peekInt32(_)`  
* `val = reader.peekUInt32(_)`  
* `val = reader.peekFloat(_)`  
* `val = reader.peekDouble(_)`  
  Specialized peekers for numbers.
* `val = reader.unreadInt8()`  
* `val = reader.unreadUInt8()`  
* `val = reader.unreadInt16()`  
* `val = reader.unreadUInt16()`  
* `val = reader.unreadInt32()`  
* `val = reader.unreadUInt32()`  
* `val = reader.unreadFloat()`  
* `val = reader.unreadDouble()`  
  Specialized unreaders for numbers.

----

* `writer = ez.helpers.binary.writer(writer, options)`  
  Wraps a raw buffer writer and returns a writer with additional API to handle binary streams.
  By default the writer is configured as big endian.  
  You can configure it as little endian by setting the `endian` option to `"little"`.  
  The `bufSize` option controls the size of the intermediate buffer.

* `writer.flush(_)`  
  Flushes the buffer to the wrapped writer.

* `writer.write(_, buf)`  
  Writes `buf`.  
  Note: writes are buffered.  
  Use the `flush(_)` call if you need to flush before the end of the stream.

* `writer.writeInt8(_, val)`  
* `writer.writeUInt8(_, val)`  
* `writer.writeInt16(_, val)`  
* `writer.writeUInt16(_, val)`  
* `writer.writeInt32(_, val)`  
* `writer.writeUInt32(_, val)`  
* `writer.writeFloat(_, val)`  
* `writer.writeDouble(_, val)`  
  Specialized writers for numbers.
