"use strict";
/**
 * Copyright (c) 2013 Bruno Jouhier <bruno.jouhier@sage.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
/// !doc
/// ## EZ Streams core reader API
/// 
/// `var ez = require("ez-streams")`  
/// 
var streams = require('./node-wrappers');
var flows = require('streamline-runtime').flows;
var predicate = require('./predicate').convert;
var stopException = require('./stop-exception');

var generic;

var Decorated = function Decorated(parent, read, stop) {
	this.parent = parent;
	this.read = read;
	this.stopped = false;
	if (stop) this.stop = stop;
};

/// * `ez.reader.decorate(proto)`  
///   Adds the EZ streams reader API to an object. 
///   Usually the object is a prototype but it may be any object with a `read(_)` method.  
///   You do not need to call this function if you create your readers with
///   the `ez.devices` modules.   
///   Returns `proto` for convenience.
exports.decorate = function(proto) {
	/// * `count = reader.forEach(_, fn, thisObj)`  
	///   Similar to `forEach` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   This call is asynchonous. It returns the number of entries processed when the end of stream is reached.
	proto.forEach = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var val;
		for (var i = 0;
		(val = this.read(_)) !== undefined; i++) {
			fn.call(thisObj, _, val, i);
		}
		
		return i;
	};

	/// * `reader = reader.map(fn, thisObj)`  
	///   Similar to `map` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another reader on which other operations may be chained.
	proto.map = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		var count = 0;
		return new Decorated(self, function(_) {
			var val = self.read(_);
			if (val === undefined) return undefined;
			return fn.call(thisObj, _, val, count++);
		});
	};

	/// * `result = reader.every(_, fn, thisObj)`  
	///   Similar to `every` on arrays.  
	///   The `fn` function is called as `fn(_, elt)`.  
	///   Returns true at the end of stream if `fn` returned true on every entry.  
	///   Stops streaming and returns false as soon as `fn` returns false on an entry.
	proto.every = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		if (typeof fn !== 'function') fn = predicate(fn);
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return true;
			if (!fn.call(thisObj, _, val)) {
				self.stop(_);
				return false;
			};
		}
	};

	/// * `result = reader.some(_, fn, thisObj)`  
	///   Similar to `some` on arrays.  
	///   The `fn` function is called as `fn(_, elt)`.  
	///   Returns false at the end of stream if `fn` returned false on every entry.  
	///   Stops streaming and returns true as soon as `fn` returns true on an entry.
	proto.some = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		if (typeof fn !== 'function') fn = predicate(fn);
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return false;
			if (fn.call(thisObj, _, val)) {
				self.stop(_);
				return true;
			}
		}
	};

	/// * `result = reader.reduce(_, fn, initial, thisObj)`  
	///   Similar to `reduce` on arrays.  
	///   The `fn` function is called as `fn(_, current, elt)` where `current` is `initial` on the first entry and
	///   the result of the previous `fn` call otherwise.
	///   Returns the value returned by the last `fn` call.
	proto.reduce = function(_, fn, v, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return v;
			v = fn.call(thisObj, _, v, val);
		}
	};

	/// * `writer = reader.pipe(_, writer)`  
	///   Pipes from `stream` to `writer`.
	///   Returns the writer for chaining.
	proto.pipe = function(_, writer) {
		var self = this;
		do {
			var val = self.read(_);
			try {
				writer.write(_, val);
			} catch (ex) {
				var arg = stopException.unwrap(ex);
				if (arg && arg !== true) {
					self.stop(_, arg);
					throw arg;
				} else {
					self.stop(_, arg);
					break;
				}
			}

		} while (val !== undefined);
		return writer;
	};

	/// * `reader = reader.tee(writer)`  
	///   Branches another writer on the chain`.  
	///   Returns another reader on which other operations may be chained.
	proto.tee = function(writer) {
		var self = this;
		var writeStop;
		var readStop;
		function stopResult(arg) {
			if (!arg || arg === true) return undefined;
			else throw arg;			
		}
		function readDirect(_) {
			var val = self.read(_);
			if (!writeStop) {
				try {
					writer.write(_, val);
				} catch (ex) {
					var arg = stopException.unwrap(ex);
					var writeStop = [arg];
					if (readStop) {
						// both outputs are now stopped
						// stop parent if readStop was a soft stop
						if (!readStop[0]) self.stop(_, arg);
						if (arg && arg !== true) throw arg;
						else val = undefined;
					} else if (arg) {
						// direct output was not stopped and received a full stop
						readStop = writeStop;
						self.stop(_, arg);
						if (arg && arg !== true) throw arg;
						else val = undefined;
					}
				}
			}
			return val;
		}

		return new Decorated(self, function read(_) {
			if (readStop) return stopResult(readStop[0]);
			return readDirect(_);
		}, function stop(_, arg) {
			if (readStop) return;
			readStop = [arg];
			if (arg && !writeStop) {
				// full stop - writer output still running
				// stop writer and parent
				writeStop = readStop;
				writer.stop(_, arg);
				self.stop(_, arg);
			} else if (writeStop && !writeStop[0]) {
				// only writer was stopped before
				// stop parent
				self.stop(_, arg);
			} else if (!writeStop) {
				// direct output is stopped.
				// we continue to read it, to propagate to the secondary output
				(function(_) {
					while (readDirect(_) !== undefined);
				})(flows.check);
			}
		});
	};

	/// * `readers = reader.dup()`  
	///   Duplicates a reader and returns a pair of readers which can be read from independently.
	proto.dup = function() {
		var uturn = require('./devices/uturn').create();
		var readers = [this.tee(uturn.writer), uturn.reader];
		return readers;
	};

	/// * `reader = reader.concat(reader1, reader2)`  
	///   Concatenates reader with one or more readers.  
	///   Works like array.concat: you can pass the readers as separate arguments, or pass an array of readers.  
	proto.concat = function() {
		var streams = Array.prototype.concat.apply([], arguments);
		var stream = this;
		return new Decorated(this, function read(_) {
			var val;
			while (stream && (val = stream.read(_)) === undefined) stream = streams.shift();
			return val;
		}, function stop(_, arg) {
			while (stream) {
				stream.stop(_, arg);
				stream = streams.shift();
			}
		});
	}

	/// * `result = reader.toArray(_)`  
	///   Reads all entries and returns them to an array.
	///   Note that this call is an anti-pattern for streaming but it may be useful when working with small streams.
	proto.toArray = function(_) {
		return this.reduce(_, function(_, arr, elt) {
			arr.push(elt);
			return arr;
		}, []);
	};

	/// * `result = reader.readAll(_)`  
	///   Reads all entries and returns them as a single string or buffer. Returns undefined if nothing has been read.
	///   Note that this call is an anti-pattern for streaming but it may be useful when working with small streams.
	proto.readAll = function(_) {
		var arr = this.toArray(_);
		if (typeof arr[0] === 'string') return arr.join('');
		if (Buffer.isBuffer(arr[0])) return Buffer.concat(arr);
		return arr.length > 0 ? arr : undefined;
	};

	/// * `reader = reader.transform(fn)`  
	///   Inserts an asynchronous transformation into chain.  
	///   This API is more powerful than `map` because the transformation function can combine results, split them, etc.  
	///   The transformation function `fn` is called as `fn(_, reader, writer)`
	///   where `reader` is the `stream` to which `transform` is applied,
	///   and writer is a writer which is piped into the next element of the chain.  
	///   Returns another reader on which other operations may be chained.
	proto.transform = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		var uturn = require('./devices/uturn').create();
		fn.call(thisObj, function(err) {
			// stop parent at end
			self.stop(uturn.end);
		}, self, uturn.writer);
		return uturn.reader;
	};

	/// * `result = reader.filter(fn, thisObj)`  
	///   Similar to `filter` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another reader on which other operations may be chained.
	proto.filter = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		if (typeof fn !== 'function') fn = predicate(fn);
		return this.transform(function(_, reader, writer) {
			for (var i = 0, val;
			(val = reader.read(_)) !== undefined; i++) {
				if (fn.call(thisObj, _, val, i)) writer.write(_, val);
			}
		});
	};

	/// * `result = reader.until(fn, testVal, thisObj, stopArg)`  
	///   Cuts the stream by when the `fn` condition becomes true.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   `stopArg` is an optional argument which is passed to `stop` when `fn` becomes true.  
	///   Returns another reader on which other operations may be chained.
	proto.until = function(fn, thisObj, stopArg) {
		thisObj = thisObj !== undefined ? thisObj : this;
		if (typeof fn !== 'function') fn = predicate(fn);
		var self = this;
		var i = 0;
		return new Decorated(self, function(_) {
			var val = self.read(_);
			if (val === undefined) return undefined;
			if (!fn.call(thisObj, _, val, i++)) return val;
			self.stop(_, stopArg);
		});
	};

	/// * `result = reader.while(fn, testVal, thisObj, stopArg)`  
	///   Cuts the stream by when the `fn` condition becomes false.  
	///   This is different from `filter` in that the result streams _ends_ when the condition
	///   becomes false, instead of just skipping the entries.
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   `stopArg` is an optional argument which is passed to `stop` when `fn` becomes false.  
	///   Returns another reader on which other operations may be chained.
	proto.
	while = function(fn, thisObj, stopArg) {
		if (typeof fn !== 'function') fn = predicate(fn);
		return this.until(function(_, val, i) {
			return !fn.call(thisObj, _, val, i);
		}, thisObj, stopArg);
	};

	/// * `result = reader.limit(count, stopArg)`  
	///   Limits the stream to produce `count` results.  
	///   `stopArg` is an optional argument which is passed to `stop` when the limit is reached.  
	///   Returns another reader on which other operations may be chained.
	proto.limit = function(n, stopArg) {
		return this.until(function(_, val, i) {
			return i >= n;
		}, this, stopArg);
	};

	/// * `result = reader.skip(count)`  
	///   Skips the first `count` entries of the reader.  
	///   Returns another reader on which other operations may be chained.
	proto.skip = function(n) {
		return this.filter(function(_, val, i) {
			return i >= n;
		});
	};

	/// * `group = reader.fork(consumers)`  
	///   Forks the steam and passes the values to a set of consumers, as if each consumer
	///   had its own copy of the stream as input.  
	///   `consumers` is an array of functions with the following signature: `reader = consumer(source)`
	///   Returns a `StreamGroup` on which other operations can be chained.
	proto.fork = function(consumers) {
		// simple implementation with repeated dup.
		var self = this;
		var readers = [];
		if (consumers.length === 1) {
			readers.push(consumers[0](self));
		} else {
			var source = self;
			for (var i = 0; i < consumers.length - 1; i ++) {
				var dup = source.dup()
				readers.push(consumers[i](dup[0]));
				source = dup[1];
			}
			readers.push(consumers[consumers.length - 1](source));
		}
		return new StreamGroup(readers);
	};

	/// * `group = reader.parallel(count, consumer)`  
	///   Parallelizes by distributing the values to a set of  `count` identical consumers.  
	///   `count` is the number of consumers that will be created.  
	///   `consumer` is a function with the following signature: `reader = consumer(source)`  
	///   Returns a `StreamGroup` on which other operations can be chained.  
	///   Note: transformed entries may be delivered out of order.
	proto.parallel = function(options, consumer) {
		if (typeof options === "number") options = {
			count: options,
		};
		var self = this;
		var streams = [];
		var funnel = flows.funnel(1);
		var inside = 0;
		var stopArg;
		for (var i = 0; i < options.count; i++) {
			(function(i) { // i for debugging
				streams.push(consumer(new Decorated(self, function read(_) {
					if (stopArg) {
						if (stopArg === true) return undefined;
						else throw stopArg;
					}
					return funnel(_, function(_) {
						if (inside++ !== 0) throw new Error("funnel error: " + inside);
						var val = self.read(_);
						inside--;
						return val;
					});
				}, function stop(_, arg) {
					if (stopArg) return;
					stopArg = arg;
					self.stop(_, arg);
				})));
			})(i);
		}
		var group = new StreamGroup(streams);
		return options.shuffle ? group.dequeue() : group.rr();
	};

	/// * `reader = reader.peekable()`  
	///   Returns a stream which has been extended with two methods to support lookahead.  
	///   The lookahead methods are:
	///   - `reader.peek(_)`: same as `read(_)` but does not consume the item. 
	///   - `reader.unread(val)`: pushes `val` back so that it will be returned by the next `read(_)`
	proto.peekable = function() {
		var self = this;
		var buffered = [];
		var stream = new Decorated(self, function(_) {
			return buffered.length > 0 ? buffered.pop() : self.read(_);
		});
		stream.unread = function(val) {
			buffered.push(val);
			return this; // for chaining
		}
		stream.peek = function(_) {
			var val = this.read(_);
			this.unread(val);
			return val;
		}
		return stream;
	}

	/// * `reader = reader.buffer(max)`  
	///   Returns a stream which is identical to the original one but in which up to `max` entries may have been buffered.  
	proto.buffer = function(max) {
		var self = this;
		var buffered = [];
		var resume;
		var err;
		var pending = false;

		function fill() {
			if (pending) return;
			pending = true;
			self.read(function(e, v) {
				pending = false;
				if (e) err = err || e;
				else buffered.push(v);

				if (resume) {
					var cb = resume;
					resume = undefined;
					if (buffered.length > 0) {
						v = buffered.shift();
						fill();
						cb(null, v);
					} else {
						cb(err)
					}
				} else if (buffered.length < max) {
					if (!err && v !== undefined) fill();
				}
			});
		}
		fill();

		function read(cb) {
			if (buffered.length > 0) {
				var val = buffered.shift();
				fill();
				cb(null, val);
			} else {
				resume = cb;
			}
		}
		return new Decorated(self, function(_) {
			return read(_);
		});
	};

	proto.join = function(streams, fn, thisObj) {
		var all = [this].concat(streams);
		return new StreamGroup(all).dequeue();
	};

	/// * `stream = reader.nodify()`  
	///   converts the reader into a native node Readable stream.  
	proto.nodify = function() {
		var self = this;
		var stream = new (require('stream').Readable)();
		var pending = false;
		function end() {
			stream.push(null);
		}
		function more() {
			if (pending) return;
			var sync = true;
			pending = true;
			self.read(function(err, result) {
				pending = false;
				if (err) return stream.emit('error', err);
				if (result === undefined) {
					if (sync) setImmediate(end);
					else end();
					return;
				}
				if (stream.push(result)) {
					if (sync) setImmediate(more);
					else more();
				}
			});
			sync = false;
		}
		stream._read = function() {
			more();
		}
		return stream;
	};

	/// * `reader = reader.nodeTransform(duplex)`  
	///   pipes the reader into a node duplex stream. Returns another reader. 
	proto.nodeTransform = function(duplex) {
		var piped = this.nodify().pipe(duplex);
		return require('./devices/node').reader(piped);
	};

	/// * `cmp = reader1.compare(_, reader2)`  
	///   compares reader1 and reader2 return 0 if equal,  
	proto.compare = function(_, other, options) {
		var options = options || {};
		var compare = options.compare;
		if (!compare) compare = function(a, b) {
			return a === b ? 0 : a < b ? -1 : +1;
		};
		var cmp = 0;
		while (true) {
			var data1 = this.read(_);
			var data2 = other.read(_);
			if (data1 === undefined) return data2 === undefined ? 0 : -1;
			if (data2 === undefined) return +1;
			// for now, only strings
			cmp = compare(data1, data2);
			if (cmp !== 0) return cmp;
		}
	};

	/// * `reader.stop(_, arg)`  
	///   Informs the source that the consumer(s) has(ve) stopped reading.  
	///   The source should override this method if it needs to free resources when the stream ends.  
	///   `arg` is an optional argument.  
	///   If `arg` is falsy and the reader has been forked (or teed) upstream, only this reader stops (silently).  
	///   If `arg` is true, readers that have been forked upstream are stopped silently (their `read` returns undefined).  
	///   Otherwise `arg` should be an error object which will be thrown when readers that have been forked upstream try to read.  
	///   The default `stop` function is a no-op.  
	///   Note: `stop` is only called if reading stops before reaching the end of the stream.  
	///   Sources should free their resources both on `stop` and on end-of-stream.  
	proto.stop = proto.stop || function(_, arg) {
		if (this.stopped) return;
		this.stopped = true;
		if (this.parent) this.parent.stop(_, arg);
	};

	return proto;
};

exports.decorate(Decorated.prototype);

exports.create = function(read, stop) {
	return new Decorated(null, read, stop);
}

/// ## StreamGroup API

function StreamGroup(readers) {
	var self = this;
	this.readers = readers;
	this.stop = function(_, arg) {
		self.readers.forEach_(_, function(_, rd) {
			if (rd) rd.stop(_, arg);
		});
	};
}

/// * `reader = group.dequeue()`  
///   Dequeues values in the order in which they are delivered by the readers.
///   Returns a stream on which other operations may be chained.
StreamGroup.prototype.dequeue = function() {
	var results = [];
	var alive = this.readers.length;
	var resume;
	this.readers.forEach(function(stream, i) {
		var next = function next() {
			if (alive === 0) return;
				stream.read(function(e, v) {
					if (!e && v === undefined) alive--;
					if (e || v !== undefined || alive === 0) {
						if (resume) {
							var cb = resume;
							resume = null;
							cb(e, v);
							next();
						} else {
							results.push({
								i: i,
								e: e,
								v: v,
								next: next,
							});
						}
					}
				});
			};
		next();
	});
	return new Decorated(this, function read(cb) {
		if (alive <= 0) return cb(null);
		var res = results.shift();
		if (res) {
			if (res.next) res.next();
			return cb(res.e, res.v);
		} else {
			resume = cb;
		}
	});
}
/// * `reader = group.rr()`  
///   Dequeues values in round robin fashion.
///   Returns a stream on which other operations may be chained.
StreamGroup.prototype.rr = function() {
	function entry(stream, i) {
		return {
			i: i,
			stream: stream,
			read: stream.read(!_),
		};
	}
	var q = this.readers.map(entry);
	return new Decorated(this, function(_) {
		var elt;
		while (elt = q.shift()) {
			var val = elt.read(_);
			if (val !== undefined) {
				q.push(entry(elt.stream, elt.i));
				return val;
			}
		}
		return undefined;
	});
}

/// * `reader = group.join(fn, thisObj)`  
///   Combines the values read from the readers to produce a single value.
///   `fn` is called as `fn(_, values)` where `values` is the set of values produced by 
///   all the readers that are still active.  
///   `fn` returns the value which will be read from the joined stream. `fn` _must_ also reset to `undefined` the `values` entries
///   that it has consumed. The next `read(_)` on the joined stream will fetch these values. 
///   Note that the length of the `values` array will decrease every time an input stream is exhausted.
///   Returns a stream on which other operations may be chained.
StreamGroup.prototype.join = function(fn, thisObj) {
	thisObj = thisObj !== undefined ? thisObj : this;

	var last = 0; // index of last value read by default fn 
	fn = fn || function(_, values) {
		var i = last; 
		do {
			i = (i + 1) % values.length;
			var v = values[i];
			if (v !== undefined) {
				values[i] = undefined;
				last = i;
				return v;
			}
			i = (i )
		} while (i !== last);
	}

	var self = this;
	var values = [];
	var active = self.readers.length;
	var done = false;
	var reply;
	var joinerCb = function(err, val) {
			if (err || val === undefined) {
				done = true;
				return reply(err, val);
			}
			// be careful with re-entrancy
			var rep = reply;
			reply = null;
			rep(null, val);
		};
	var callbacks = this.readers.map(function(reader, i) {
		return function(err, data) {
			if (active === 0) return reply();
			if (err) {
				done = true;
				return reply(err);
			}
			values[i] = data;
			if (data === undefined) {
				self.readers[i] = null;
				if (--active === 0) return reply();
			}
			var vals = values.filter(function(val) {
				return val !== undefined;
			});
			if (vals.length === active) {
				fn.call(thisObj, joinerCb, values);
			}
		};
	});

	function refill() {
		var count = 0;
		self.readers.forEach(function(rd, j) {
			if (rd && values[j] === undefined) {
				count++;
				rd.read(callbacks[j]);
			}
		});
		if (count === 0) throw new Error("bad joiner: must pick and reset at least one value");
	}
	return new Decorated(this, function(cb) {
		if (done) return cb();
		reply = cb;
		refill();
	});
};
