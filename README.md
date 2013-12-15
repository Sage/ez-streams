# Easy Streams for node.js

EZ streams come in two flavors: _readers_ and _writers_. You pull data from _readers_ and you push data into _writers_.

The data that you push or pull may be anything: buffers and strings of course, but also simple values like numbers or Booleans, JavaScript objects, nulls, ... There is only one value which has a special meaning: `undefined`. Reading `undefined` means that you have reached the end of a reader stream. Writing `undefined` signals that you want to end a writer stream.

EZ streams are implemented with streamline.js. The examples and API descriptions below use the streamline.js syntax because this is more concise but the `ez-streams` package can also be used directly with callback code. Just mentally replace every `_` by a callback.

## Creating a stream

The `devices` modules let you get or create various kinds of EZ streams. For example:

``` javascript
var ezs = require('ez-streams');
var log = ezs.devices.console.log; // console writer
var stdin = ezs.devices.std.in('utf8'); // stdin in text mode
var textRd = ezs.devices.file.text.reader(path); // text file reader
var binWr = ezs.devices.file.text.writer(path); // binary file writer
var stringRd = ezs.devices.string.reader(text); // in memory text reader
```

You can also wrap any node.js stream into an EZ stream, with the `node` device. For example:

``` javascript
var reader = ezs.devices.node.reader(fs.createReadStream(path)); // same as ezs.file.binary.reader
var writer = ezs.devices.node.writer(fs.createWriteStream(path)); // same as ezs.file.binary.writer
```

The `devices.http` and `devices.net` modules give you wrappers for servers and clients in which the request
and response objects are EZ readers and writers.

The `devices.generic` module lets you create your own EZ streams. For example here is how you would implement a reader that returns numbers from 0 to n

``` javascript
var numberReader = function(n) {
	var i = 0;
	return ezs.devices.generic.reader(function read(_) {
		if (i < n) return i++;
		else return undefined;
	});
};
```

To define your own reader you just need to pass an asynchronous `read(_) {...}` function to `ezs.devices.generic.reader`.

To define your own writer you just need to pass an asynchronous `write(_, val) {...}` function to `ezs.devices.generic.writer`.

So, for example, here is how you can wrap mongodb APIs into EZ streams:

``` javascript
var reader = function(cursor) {
	return ezs.devices.generic.reader(function(_) {
		var obj = cursor.nextObject(_);
		return obj == null ? undefined : obj;
	});
}
var writer = function(collection) {
	var done;
	return ezs.devices.generic.writer(function(_, val) {
		if (val === undefined) done = true;
		if (!done) collection.insert(val, _);
	});
}
```


## Basic read and write

You can read from a reader by calling it `read` method and you can write to a writer by calling its `write` method:

``` javascript
var val = reader.read(_);
writer.write(_, val);
```

The `read` and `write` methods are both asynchronous. 

`read` returns `undefined` at the end of a stream. Symmetrically, passing `undefined` to the `write` method of a writer ends the writer.


## Array-like API

You can treat an EZ reader very much like a JavaScript array: you can filter it, map it, reduce it, etc. For example you can write:

``` javascript
console.log("pi~=" + 4 * numberReader(10000).filter(function(_, n) {
	return n % 2; // keep only odd numbers
}).map(function(_, n) {
	return n % 4 === 1 ? 1 / n : -1 / n;
}).reduce(_, function(_, res, val) {
	return res + val;
}, 0));
```

This will compute 4 * (1 - 1/3 + 1/5 - 1/7 ...).

For those not used to streamline this chain could be rewritten with callbacks as:

``` javascript
numberReader(10000).filter(function(cb, n) {
	cb(null, n % 2);
}).map(function(cb, n) {
	cb(null, n % 4 === 1 ? 1 / n : -1 / n);
}).reduce(function(err, result) {
	console.log("pi~=" + 4 * result);
}, function(cb, res, val) {
	cb(null, res + val);
}, 0);
```

Every step of the chain, except the last one, returns a new reader stream. The first stream produces all integers up to 9999. The second one, which is returned by the `filter` call produces only odd integers. The third one, returned by the `map` call returns the alternating fractions. The `reduce` step at the end combines alternating fractions to produce the final result.

Also note that the `reduce` function takes a continuation callback as first parameter while the other functions don't. This is because the other functions (`filter`, `map`) return another stream immediately, while `reduce` pulls all the values from the stream and combines them to produce a result. So `reduce` can only produce its result once all the operations have completed, and it does so by returning its result through a continuation callback. 

The callbacks that you pass to `filter`, `map`, `reduce` are slightly different from the callbacks that you pass to normal array functions. They receive a continuation callback (`_`) as first parameter. This allows you to call asynchronous functions from these callbacks. We did not do it in the example above but this would be easy to do. For example we could slow down the computation by injecting a `setTimeout` call in the filter operation:

``` javascript
console.log("pi~=" + 4 * numberReader(10000).filter(function(_, n) {
	setTimeout(_, 10);
	return n % 2; // keep only odd numbers
})...
```

Rather academic here but in real life you often need to query databases or external services when filtering or mapping stream entries.

The Array-like API also includes `every`, `some` and `forEach`. On the other hand it does not include `reduceRight` nor `sort`, as these functions are incompatible with streaming (they would need to buffer the entire stream).

The `forEach` function is also a reducer and takes a continuation callback, like `reduce` (see example later).

## Pipe

Readers have a `pipe` method that lets you pipe them into a writer:

``` javascript
reader.pipe(_, writer)
```

For example we can output the odd numbers up to 100 to the console by piping the stream to the console device:

``` javascript
numberReader(100).filter(function(_, n) {
	return n % 2; // keep only odd numbers
}).pipe(_, ezs.devices.console.log);
```

Note that `pipe` is also a reducer. It takes a continuation callback. So you can schedule operations which will be executed after the pipe has been fully processed.

A major difference with standard node streams is that `pipe` operations only appear once in a chain, at the end, instead of being inserted between processing steps. The EZ `pipe` does not return a reader. Instead it returns (asynchronously) its writer argument, so that you can chain other operations on the writer itself. Here is a typical use:

``` javascript
var result = numberReader(100).map(function(_, n) {
	return n + ' ';
}).pipe(_, ezs.devices.string.writer()).toString();
```

In this example, the integers are mapped to strings which are written to an in-memory string writer. The string writer is returned by the `pipe` call and we obtain its contents by applying `toString()`.

## Infinite streams

You can easily create an infinite stream. For example, here is a reader stream that will return all numbers (*) in sequence:

``` javascript
var infiniteReader = function() {
	var i = 0;
	return ezs.devices.generic.reader(function read(_) {
		return i++;
	});
};
```
(\*): not quite as `i++` will stop moving when we reach 2**53

EZ streams have methods like `skip`, `limit`, `until` and `while` that let you control how many entries you will read, even if the stream is potentially infinite. Here are two examples:

``` javascript
// output 100 numbers after skipping the first 20
infiniteReader().skip(20).limit(100).pipe(_, ezs.devices.console.log);

// output numbers until their square exceeds 1000 
infiniteReader().until(function(_, n) {
	return n * n > 1000;
}).pipe(_, ezs.devices.console.log);
```

## Transformations

The array functions are nice but they have limited power. They work well to process stream entries independently from each other but they don't allow us to do more complex operation like combining several entries into a bigger one, or splitting one entry into several smaller ones, or a mix of both. This is something we typically do when we parse text streams: we receive chunks of texts; we look for special boundaries and we emit the items that we have isolated between boundaries. Usally, there is not a one to one correspondance between the chunks that we receive and the items that we emit.

The `transform` function is designed to handle these more complex operations. Typical code looks like:

``` javascript
stream.transform(function(_, reader, writer) {
	// read items with reader.read(_)
	// transform them (combine them, split them)
	// write transformation results with writer.write(_, result)
	// repeat until the end of reader
}).filter(...).map(...).reduce(...);
```

You have complete freedom to organize your read and write calls: you can read several items, combine them and write only one result, you can read one item, split it and write several results, you can drop data that you don't want to transfer, or inject additional data with extra writes, etc.

Also, you are not limited to reading with the `read(_)` call, you can use any API available on a reader, even another transform. For example, here is how you can implement a simple CSV parser:

``` javascript
var csvParser = function(_, reader, writer) {
	// get a lines parser from our transforms library
	var linesParser = ezs.transforms.lines.parser();
	// transform the raw text reader into a lines reader
	reader = reader.transform(linesParser);
	// read the first line and split it to get the keys
	var keys = reader.read(_).split(',');
	// read the other lines
	reader.forEach(_, function(_, line) {
		// ignore empty line (we get one at the end if file is terminated by newline)
		if (line.length === 0) return;
		// split the line to get the values
		var values = line.split(',');
		// convert it to an object with the keys that we got before
		var obj = {};
		keys.forEach(function(key, i) {
			obj[key] = values[i];
		});
		// send the object downwards.
		writer.write(_, obj);
	});
};
```

You can then use this transform as:

``` javascript
ezs.devices.file.text.reader('mydata.csv').transform(csvParser)
	.pipe(_, ezs.devices.console.log);
```

Note that the transform is written with a `forEach` call which loops through all the items read from the input chain. This may seem incompatible with streaming but it is not. This loop advances by executing asynchronous `reader.read(_)` and `writer.write(_, obj)` calls. So it yields to the event loop and gives it chance to wake up other pending calls at other steps of the chain. So, even thought the code may look like a tight loop, it gets processed one piece at a time, interleaved with other steps in the chain.

## Transforms library

The `lib/transforms` directory contains standard transforms:

* [`ezs.transforms.lines`](lib/transforms/lines.md): simple lines parser and formatter.
* [`ezs.transforms.csv`](lib/transforms/json.md): CSV parser and formatter.
* [`ezs.transforms.json`](lib/transforms/json.md): JSON parser and formatter.
* [`ezs.transforms.multipart`](lib/transforms/json.md): MIME multipart parser and formatter.

For example, you can read from a CSV file, filter its entries and write the output to a JSON file with:

``` javascript
ezs.devices.file.text.reader('users.csv').transform(ezs.transforms.csv.parser())
	.filter(function(_, item) {
	return item.gender === 'F';
}).transform(ezs.transforms.json.formatter({ space: '\t' }))
	.pipe(_, ezs.devices.file.text.writer('females.json'));
```

The transforms library is rather embryonic at this stage but you can expect it to grow.

## Lookahead

It is often handy to be able to look ahead in a stream when implementing parsers. The reader API does not directly support lookahead but it includes a `peekable()` method which extends the stream with `peek` and `unread` methods:

```
// stream does not support lookahead methods but peekableStream will.
var peekableStream = stream.peekable();
val = peekableStream.peek(_); // reads a value without consuming it.
val = peekableStream.read(_); // normal read
peekableStream.unread(val); // pushes back val so that it can be read again.
```

## Parallelizing

You can parallelize operations on a stream with the `parallel` call:

``` javascript
reader.parallel(4, function(source) {
	return source.map(fn1).transform(trans1);
}).map(fn2).pipe(_, writer);
```

In this example the `parallel` call will dispatch the items to 4 identical chains that apply the `fn1` mapping and the `trans1` transform. The output of these chains will be merged and passed through the `fn2` mapping.

You can control the `parallel` call by passing an options object instead of an integer as first parameter. The `shuffle` option lets you control if the order of entries is preserved or not. By default it is false and the order is preserved but you can get better thoughput by setting `shuffle` to true if order does not matter.

## Fork and join

You can also fork a stream into a set of identical streams that you pass through different chains:

``` javascript
var streams = reader.fork([
	function(source) { return source.map(fn1).transform(trans1); },
	function(source) { return source.map(fn2); },
	function(source) { return source.transform(trans3); },
]).streams;
```

This returns 3 streams which operate on the same input but perform different chains of operations. You can then pipe these 3 streams to different outputs. 

Note that you have to use futures (or callbacks) when piping these streams so that they are piped in parallel. See the examples in the `api-test._js` test file.

You can also `join` the group of streams created by a fork, with a joiner function that defines how entries are dequeued from the group.

``` javascript
var streams = reader.fork([
	function(source) { return source.map(fn1).transform(trans1); },
	function(source) { return source.map(fn2); },
	function(source) { return source.transform(trans3); },
]).join(joinerFn).map(fn4).pipe(_, writer);
```

This part of the API is still fairly experimental but it passes at least basic unit tests.

## Exception handling

Exceptions are propagated through the chains and you can trap them in the reducer which pulls the items from the chain. If you write your code with streamline, you will naturally use try/catch:

``` javascript
try {
	ezs.devices.file.text.reader('users.csv').transform(ezs.transforms.csv.parser())
		.filter(function(_, item) {
		return item.gender === 'F';
	}).transform(ezs.transforms.json.formatter({ space: '\t' }))
		.pipe(_, ezs.devices.file.text.writer('females.json'));
} catch (ex) {
	logger.write(_, ex);
}
```

It you write your code with callbacks, you will receive the exception as first parameter in your continuation callback:

``` javascript
ezs.devices.file.text.reader('users.csv').transform(ezs.transforms.csv.parser())
	.filter(function(cb, item) {
	cb(null, item.gender === 'F');
}).transform(ezs.transforms.json.formatter({ space: '\t' })).pipe(function(err) {
	if (err) logger.write(function(e) {}, err);
}, ezs.devices.file.text.writer('females.json'));
```

## Backpressure

Backpressure is a non-issue. The ez-streams plumbing takes care of the low level pause/resume dance on the reader side, and of the write/drain dance on the write side. The event loop takes care of the rest. So you don't need to worry about backpressure when writing map or transform functions.

Instead of worrying about backpressure, you should worry about buffering. You can control buffering on the source side by passing special options to `ezs.devices.node.reader(nodeStream, options)`. See the [`streamline-streams`](https://github.com/Sage/streamline-streams/blob/master/lib/streams.md) documentation (`ReadableStream`) for details. You can also control buffering with a `bufSize` option in `fork` calls.

# License

This work is licensed under the terms of the [MIT license](http://en.wikipedia.org/wiki/MIT_License).
