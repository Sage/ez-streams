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
var streams = require('streamline-streams/lib/streams');
var flows = require('streamline/lib/util/flows');
var generic;

var Decorated = function Decorated(read) {
	this.read = read;
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

	/// * `result = reader.every(_, fn, thisObj)`  
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

	/// * `result = reader.some(_, fn, thisObj)`  
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
			writer.write(_, val);
		} while (val !== undefined);
		return writer;
	};

	/// * `result = reader.toArray(_)`  
	///   Reads all entries and returns them to an array.
	///   Note that this call is an anti-pattern for streaming but it may be useful when working with small streams.
	proto.toArray = function(_) {
		return this.reduce(_, function(_, arr, elt) {
			arr.push(elt);
			return arr;
		}, []);
	};

	/// * `reader = reader.transform(fn)`  
	///   Inserts an asynchronous transformation into chain.  
	///   This API is more powerful than `map` because the transformation function can combine results, split them, etc.  
	///   The transformation function `fn` is called as `fn(_, reader, writer)`
	///   where `reader` is the `stream` to which `transform` is applied,
	///   and writer is a writer which is piped into the next element of the chain.  
	///   Returns another stream on which other operations may be chained.
	proto.transform = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		var duplex = require('./devices/uturn').create();
		fn.bind(thisObj)(_ >> function(err) {
			if (err) throw err;
			// write undefined at the end of transform
			duplex.writer.write(_ >> function(err) {
				if (err) throw err;
			});
		}, self, duplex.writer);
		return duplex.reader;
	};

	/// * `result = reader.filter(fn, thisObj)`  
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

	/// * `result = reader.until(fn, testVal, thisObj)`  
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

	/// * `result = reader.while(fn, testVal, thisObj)`  
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

	/// * `result = reader.limit(count)`  
	///   Limits the stream to produce `count` results.  
	///   Returns another stream on which other operations may be chained.
	proto.limit = function(n) {
		return this.until(function(_, val, i) {
			return i >= n;
		});
	};

	/// * `result = reader.skip(count)`  
	///   Skips the first `count` entries of the reader.  
	///   Returns another stream on which other operations may be chained.
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
		var self = this;
		var callbacks = [];
		var ready = 0;
		var active = consumers.length;

		function flush() {
			if (ready === active) {
				ready = 0;
				var cbs = callbacks;
				callbacks = [];
				var data = self.read(_ >> function(err, data) {
					cbs.forEach(function(cb) {
						cb && cb(err, data);
					});
				});
			}
		}
		return new StreamGroup(consumers.map(function(consumer, i) {
			var rd = consumer(new Decorated(_(function(cb) {
				if (callbacks[i]) throw new Error("invalid attempt to read busy reader");
				callbacks[i] = cb;
				ready++;
				flush();
			}, 0)));
			return new Decorated(_(function(cb) {
				rd.read(_ >> function(err, val) {
					if (err || val === undefined) {
						callbacks[i] = null;
						active--;
						flush();
					}
					return cb(err, val);
				})
			}, 0));
		}));
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
		for (var i = 0; i < options.count; i++) {
			(function(i) { // i for debugging
				streams.push(consumer(new Decorated(function(_) {
					return funnel(_, function(_) {
						if (inside++ !== 0) throw new Error("funnel error: " + inside);
						var val = self.read(_);
						inside--;
						return val;
					});
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
			self.read(_ >>
			function(e, v) {
				pending = false;
				if (e) err = e;
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
		return new Decorated(function(_) {
			return read(~_);
		});
	};

	/// * `stream = reader.nodify()`  
	///   converts the reader into a native node Readable stream.  
	proto.nodify = function() {
		var self = this;
		var stream = new (require('stream').Readable)();
		var pending = false;
		function more() {
			if (pending) return;
			var sync = true;
			pending = true;
			self.read(_ >> function(err, result) {
				pending = false;
				if (err) stream.emit('error', err);
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
		return require('ez-streams').devices.node.reader(piped);
	}

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
	}

	return proto;
};

// run galaxy hooks before applying decorate.
!!function() {
	// fail silently and return original decorate if galaxy cannot be loaded
	try {
		eval("(function*(){})"); 
	} catch (ex) {
		return;
	}
	// enable generator support on decorate
	// hooks must be in a different file because generator support is not always enabled.
	var hooks = require('./galaxy-hooks');
	exports.decorate = hooks.reader.decorate(exports.decorate);
	Decorated = hooks.reader.construct(Decorated);
}();

exports.decorate(Decorated.prototype);

exports.create = function(read) {
	return new Decorated(read);
}

/// ## StreamGroup API

function StreamGroup(readers) {
	this.readers = readers;
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
				stream.read(_ >>
				function(e, v) {
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
	return new Decorated(_(function(cb) {
		if (alive <= 0) return cb(null);
		var res = results.shift();
		if (res) {
			if (res.next) res.next();
			return cb(res.e, res.v);
		} else {
			resume = cb;
		}
	}, 0));
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
	return new Decorated(function(_) {
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
			reply(null, val);
			reply = null;
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
				fn.bind(thisObj)(_ >> joinerCb, values);
			}
		};
	});

	function refill() {
		var count = 0;
		self.readers.forEach(function(rd, j) {
			if (rd && values[j] === undefined) {
				count++;
				rd.read(_ >> callbacks[j]);
			}
		});
		if (count === 0) throw new Error("bad joiner: must pick and reset at least one value");
	}
	return new Decorated(_(function(cb) {
		if (done) return cb();
		reply = cb;
		refill();
	}, 0));
};

// run galaxy hooks 
!!function() {
	if (!Decorated.prototype.forEachStar) return;
	var hooks = require('./galaxy-hooks');
	StreamGroup.prototype.join = hooks.wrapNonReducer(StreamGroup.prototype.join);
}();
