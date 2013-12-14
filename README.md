This module provides _stream wrappers_ for streamline.js. 

## Low-level API

The low-level API provides

* a generic `ReadableStream` wrapper with an asynchronous `stream.read(_[, len])` method.
* a generic `WritableStream` wrapper with an asynchronous `stream.write(_, buf[, encoding])` method.
* wrappers for HTTP and TCP request and response objects (client and server).

See the [low-level API reference](lib/streams.md) for details.

## High-level functional API

Readable streams also support a higher level, functional API which is similar to [streamline's asynchronous array API](https://github.com/Sage/streamlinejs/blob/master/lib/compiler/builtins.md). So you can consume streamline streams like arrays, with the gotcha that some operations like direct indexing or sorting are not supported on streams. 

For example, if `stream` is a streamline readable stream wrapper, you can write:

``` javascript
stream.map(function(_, elt) {
	// ...
}).filter(function(_, elt) {
	// ...
}).forEach(_, function(_, elt) {
	// ...
});
```

Note that these functions return streams rather than arrays, so that you get lazy evaluation through the whole chain.

This API provides methods like `transform`, `pipe`, `limit`, `buffer`, ... that let you build powerful chains with streams. See the [High-level API reference](lib/api.md) for details.

## Transforms

The `lib/transform` directory contains standard transforms that you can use with streamline streams:

* [`json-transform`](lib/stransforms/json.md): transforms between a JSON text stream and a stream of values.
* [`lines`](lib/stransforms/lines.md): transforms between a plain text stream and a stream of lines.

For example, you can read from a JSON file, filter its entries and write the output to another JSON file with:

``` javascript
var streams = require('streamline-streams');
var jsonTrans = require('streamline/streams/lib/transforms/json');

var src = new streams.ReadableStream(fs.createReadStream(srcName), { encoding: 'utf8' });
var dst = new streams.WritableStream(fs.createWriteStream(dstName), { encoding: 'utf8' });

src.transform(jsonTrans.parser()).filter(function(_, elt) {
	return obj.name != null;
}).transform(jsonTrans.formatter({ space: '\t' })).pipe(_, dst);
```

## More information

The following blog articles give background information on the low-level API design:

* [Asynchronous episode 3 – Adventures in event-land](http://bjouhier.wordpress.com/2011/04/25/asynchronous-episode-3-adventures-in-event-land/)
* [Node.js stream API: events or callbacks?](http://bjouhier.wordpress.com/2012/07/04/node-js-stream-api-events-or-callbacks/)