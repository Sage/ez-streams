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
/// ## High-level functional stream API
/// 
var streams = require('streamline-streams/lib/streams');
var flows = require('streamline/lib/util/flows');

function Decorated(read) {
	this.read = read;
};

/// * `api.decorate(proto)`  
///   Adds the high-level API to an object. 
///   Usually this object is a prototype but it may be any object with a `read(_)` method.  
///   You do not need to call this function if you use streamline wrappers around node.js streams, or streams
///   created with `streams.reader(readFn)` because the high-level API is already in place.  
///   Returns `proto` for convenience.
exports.decorate = function(proto) {
	/// * `count = stream.forEach(_, fn, thisObj)`  
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

	/// * `stream = stream.map(fn, thisObj)`  
	///   Similar to `map` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another stream on which other operations may be chained.
	proto.map = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		var count = 0;
		return new Decorated(function(_) {
			var val = self.read(_);
			if (val === undefined) return undefined;
			return fn.call(thisObj, _, val, count++);
		});
	};

	/// * `result = stream.every(_, fn, thisObj)`  
	///   Similar to `every` on arrays.  
	///   The `fn` function is called as `fn(_, elt)`.  
	///   Returns true at the end of stream if `fn` returned true on every entry.  
	///   Stops streaming and returns false as soon as `fn` returns false on an entry.
	proto.every = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return true;
			if (!fn.call(thisObj, _, val)) return false;
		}
	};

	/// * `result = stream.some(_, fn, thisObj)`  
	///   Similar to `some` on arrays.  
	///   The `fn` function is called as `fn(_, elt)`.  
	///   Returns false at the end of stream if `fn` returned false on every entry.  
	///   Stops streaming and returns true as soon as `fn` returns true on an entry.
	proto.some = function(_, fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		while (true) {
			var val = self.read(_);
			if (val === undefined) return false;
			if (fn.call(thisObj, _, val)) return true;
		}
	};

	/// * `result = stream.reduce(_, fn, initial, thisObj)`  
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

	/// * `count = stream.pipe(_, writer)`  
	///   Pipes from `stream` to `writer`.
	///   Returns the writer for chaining.
	proto.pipe = function(_, writer) {
		var self = this;
		var count = -1;
		do {
			count++;
			var val = self.read(_);
			writer.write(_, val);
		} while (val !== undefined);
		return writer;
	};

	/// * `stream = stream.transform(fn)`  
	///   Inserts an asynchronous transformation into chain.  
	///   This API is more powerful than `map` because the transformation function can combine results, split them, etc.  
	///   The transformation function `fn` is called as `fn(_, reader, writer)`
	///   where `reader` is the `stream` to which `transform` is applied,
	///   and writer is a writer which is piped into the next element of the chain.  
	///   Returns another stream on which other operations may be chained.
	proto.transform = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		var resume;
		var done = false;
		var bounce = function(xcb, val) {
				setImmediate(function() {
					var cb = resume;
					resume = xcb;
					if (cb) {
						try {
							cb(null, val);
						} catch (ex) {
							resume(ex);
						}
					}
				});
			};
		var writer = {
			write: function(_, val) {
				bounce(~_, val);
			}
		};

		function f(_) {
			fn.call(thisObj, _, self, writer);
		}
		var rd = _(function(cb) {
			var xcb = function(e, r) {
					if (!e && r === undefined) done = true;
					cb(e, r);
				}
			if (done) return cb(null);
			if (!resume) {
				resume = xcb;
				f(_ >>
				function(err, val) {
					if (err) resume(err);
					else bounce(xcb); // extra writer.write(_) call to close stream
				});
			} else {
				bounce(xcb)
			}
		}, 0);
		return new Decorated(rd);
	};

	/// * `result = stream.filter(fn, thisObj)`  
	///   Similar to `filter` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another stream on which other operations may be chained.
	proto.filter = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		return this.transform(function(_, reader, writer) {
			for (var i = 0, val;
			(val = reader.read(_)) !== undefined; i++) {
				if (fn.call(thisObj, _, val, i)) writer.write(_, val);
			}
		});
	};

	/// * `result = stream.until(fn, testVal, thisObj)`  
	///   Cuts the stream by when the `fn` condition becomes true.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another stream on which other operations may be chained.
	proto.until = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		return this.transform(function(_, reader, writer) {
			for (var i = 0, val;
			(val = reader.read(_)) !== undefined; i++) {
				if (fn.call(thisObj, _, val, i)) return;
				writer.write(_, val);
			}
		});
	};

	/// * `result = stream.while(fn, testVal, thisObj)`  
	///   Cuts the stream by when the `fn` condition becomes false.  
	///   This is different from `filter` in that the result streams _ends_ when the condition
	///   becomes false, instead of just skipping the entries.
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another stream on which other operations may be chained.
	proto.
	while = function(fn, thisObj) {
		return this.until(function(_, val, i) {
			return !fn.call(thisObj, _, val, i);
		}, thisObj);
	};

	/// * `result = stream.limit(count)`  
	///   Limits the stream to produce `count` results.  
	///   Returns another stream on which other operations may be chained.
	proto.limit = function(n) {
		return this.until(function(_, val, i) {
			return i >= n;
		});
	};

	/// * `result = stream.skip(count)`  
	///   Skips the first `count` entries of the stream.  
	///   Returns another stream on which other operations may be chained.
	proto.skip = function(n) {
		return this.filter(function(_, val, i) {
			return i >= n;
		});
	};

	/// * `group = stream.fork(consumers)`  
	///   Forks the steam and passes the values to a set of consumers, as if each consumer
	///   had its own copy of the stream as input.  
	///   `consumers` is an array of functions with the following signature: `stream = consumer(source)`
	///   Returns a `StreamGroup` on which other operations can be chained.
	proto.fork = function(consumers, options) {
		options = options || {};
		var self = this;
		var q = [];
		var bufferBase = 0;
		var streamsPositions = [];
		var buffer = [];
		var bufSize = options.bufSize != null ? options.bufSize : consumers.length;
		var done = 0;
		var trace = console.log;
		var funnel = flows.funnel(1);

		function readOne(_) {
			return funnel(_, function(_) {
				return self.read(_);
			})
		}
		var next = readOne(!_);
		var waiting;

		function flushQueue(item) {
			var queued;
			while (queued = q.shift()) {
				trace && trace("FORK: " + queued.i + ": dequeueing err=" + item.err + ", val=" + item.val);
				consume(item, queued);
			}
		}

		function advance() {
			if (next && !waiting) {
				waiting = true;
				next(function(err, val) {
					waiting = false;
					var item = {
						readCount: done,
						err: err,
						val: val,
					};
					buffer.push(item);
					flushQueue(item);
					if (!item.err && item.val !== undefined) {
						next = readOne(!_);
					} else {
						next = null;
					}
				});
			}
		}

		function consume(item, qelt) {
			if (++item.readCount === consumers.length) {
				buffer.shift();
				bufferBase++;
				// rearm read
				if (buffer.length === 0) advance();
			}
			if (qelt) {
				streamsPositions[qelt.i]++;
				qelt.cb(item.err, item.val);
			}
		}

		function finish(i) { // consumer #i is finished (returns undefined)
			done++;
			trace && trace("FORK: " + i + ": finish done=" + done);
			for (var j = streamsPositions[i] - bufferBase; j < buffer.length; j++) {
				trace && trace("FORK: " + i + ": finish consume=" + j);
				consume(buffer[j]);
			}
		}

		var sources = consumers.map(function(consumer, i) {
			streamsPositions[i] = 0;

			function read(cb) {
				trace && trace("FORK: " + i + ": inside read: pos=" + streamsPositions[i] + ", bufferBase=" + bufferBase);
				var offset = streamsPositions[i] - bufferBase;
				var item;
				if (offset < 0) throw new Error("invalid state 1 in fork: offset=" + offset);
				var qelt = {
					cb: cb,
					i: i,
				};
				if (offset >= 0 && offset < buffer.length) {
					item = buffer[offset];
					trace && trace("FORK: " + i + ": found in buffer, err=" + item.err + ", val=" + item.val);
					consume(item, qelt);
				} else if (next) {
					trace && trace("FORK: " + i + ": queuing");
					q.push(qelt);
					if (buffer.length < bufSize) {
						advance();
					}
				} else {
					cb(null);
				}
			}
			var stream = consumer(new Decorated(function(_) {
				return read(~_);
			}));
			return new Decorated(function(_) {
				var val = stream.read(_);
				trace && trace("FORK: " + i + ": end of chain: val=" + val);
				if (val === undefined) finish(i);
				return val;
			});
		});
		return new StreamGroup(sources);
	};

	/// * `group = stream.parallel(count, consumer)`  
	///   Parallelizes by distributing the values to a set of  `count` identical consumers.  
	///   `count` is the number of consumers that will be created.  
	///   `consumer` is a function with the following signature: `stream = consumer(source)`  
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
		var trace = null;
		for (var i = 0; i < options.count; i++) {
			(function(i) { // i for debugging
				streams.push(consumer(new Decorated(function(_) {
					return funnel(_, function(_) {
						trace && trace("PARALLEL: " + i + ", reading...");
						if (inside++ !== 0) throw new Error("funnel error: " + inside);
						var val = self.read(_);
						inside--;
						trace && trace("PARALLEL: " + i + ", read returns " + val);
						return val;
					});
				})));
			})(i);
		}
		var group = new StreamGroup(streams);
		return options.shuffle ? group.dequeue() : group.rr();
	};

	/// * `stream = stream.peekable()`  
	///   Returns a stream which has been extended with two methods to support lookahead.  
	///   The lookahead methods are:
	///   - `stream.peek(_)`: same as `read(_)` but does not consume the item. 
	///   - `stream.unread(val)`: pushes `val` back so that it will be returned by the next `read(_)`
	proto.peekable = function() {
		var self = this;
		var buffered = [];
		var stream = new Decorated(function(_) {
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

	return proto;
};

exports.decorate(Decorated.prototype);

/// ## StreamGroup API

function StreamGroup(streams) {
	this.streams = streams;
}

/// * `stream = group.dequeue()`  
///   Dequeues values in the order in which they are delivered by the streams.
///   Returns a stream on which other operations may be chained.
StreamGroup.prototype.dequeue = function() {
	var results = [];
	var alive = this.streams.length;
	var resume;
	var trace = null;
	this.streams.forEach(function(stream, i) {
		var next = function next() {
				stream.read(_ >>
				function(e, v) {
					trace && trace("DEQUEUE CB: " + i + ": alive=" + alive + ", e=" + e + ", v=" + v);
					if (!e && v === undefined) alive--;
					if (e || v !== undefined || alive === 0) {
						if (resume) {
							trace && trace("CALLING RESUME");
							var cb = resume;
							resume = null;
							cb(e, v);
							next();
						} else {
							trace && trace("PUSHING");
							results.push({
								i: i,
								e: e,
								v: v,
								next: next,
							});
						}
					} else {
						trace && trace("IGNORING");
					}
				});
			};
		next();
	});
	return new Decorated(_(function(cb) {
		trace && trace("DEQUEUE READ " + alive);
		if (alive <= 0) return cb(null);
		var res = results.shift();
		if (res) {
			trace && trace("RES: " + res.i + ", e=" + res.e + ", v=" + res.v);
			if (res.next) res.next();
			return cb(res.e, res.v);
		} else {
			trace && trace("READ SETS RESUME");
			resume = cb;
		}
	}, 0));
}
/// * `stream = group.rr()`  
///   Dequeues values in round robin fashion.
///   Returns a stream on which other operations may be chained.
StreamGroup.prototype.rr = function() {
	var trace = null;

	function entry(stream, i) {
		return {
			i: i,
			stream: stream,
			read: stream.read(!_),
		};
	}
	var q = this.streams.map(entry);
	return new Decorated(function(_) {
		var elt;
		while (elt = q.shift()) {
			trace && trace("RR " + elt.i + ": reading ....");
			var val = elt.read(_);
			trace && trace("RR " + elt.i + ": read returns " + val);
			if (val !== undefined) {
				q.push(entry(elt.stream, elt.i));
				return val;
			}
		}
		return undefined;
	});
}

/// * `stream = group.join(fn, thisObj)`  
///   Combines the values read from the streams to produce a single value.
///   `fn` is called as `fn(_, values)` where `values` is the set of values produced by 
///   all the streams that are still active.  
///   `fn` returns the value which will be read from the joined stream. `fn` _must_ also reset to `undefined` the `values` entries
///   that it has consumed. The next `read(_)` on the joined stream will fetch these values. 
///   Note that the length of the `values` array will decrease every time an input stream is exhausted.
///   Returns a stream on which other operations may be chained.
StreamGroup.prototype.join = function(fn, thisObj) {
	thisObj = thisObj !== undefined ? thisObj : this;
	var self = this;
	var values = [];
	var trace = null; //console.log;
	return new Decorated(function(_) {
		var i = 0;
		var advanced = false;
		while (i < self.streams.length) {
			var val;
			// todo: parallelize
			if (values[i] === undefined) {
				trace && trace("JOIN: " + i + ": before read");
				values[i] = self.streams[i].read(_);
				trace && trace("JOIN: " + i + ": after read: " + values[i]);
				advanced = true;
				if (values[i] === undefined) {
					self.streams.splice(i, 1);
					values.splice(i, 1);
				} else {
					i++;
				}
			} else {
				i++;
			}
		}
		if (!advanced) throw new Error("join hook must reset at least one value to undefined");
		if (values.length === 0) return undefined;
		trace && trace("JOIN: values=" + values);
		return fn.call(thisObj, _, values);
	});
}