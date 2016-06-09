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
/// `const ez = require("ez-streams")`  
/// 
import { _ } from "streamline-runtime";
import { convert as predicate } from "./predicate";
import { Writer } from './writer';
import * as stopException from './stop-exception';
import * as nodeStream from "stream";


const nextTick = require('./util').nextTick;

function tryCatch<R>(_: _, that: any, f: (_: _) => R) {
	try {
		return f.call(that, _);
	} catch (ex) {
		that.stop(_, ex);
		throw ex;
	}
}

export interface ParallelOptions {
	count?: number;
	shuffle?: boolean;
}

export interface CompareOptions<T> {
	compare?: (v1: T, v2: T) => number;
}

export interface Stoppable {
	stop: (_: _, arg?: any) => void;
}

function resolvePredicate<T>(fn: ((_: _, value: T) => boolean) | {}): (_: _, value: T) => boolean {
	const f: any = fn;
	if (typeof fn !== 'function') return predicate(fn);
	else return f;
}

export class Reader<T> {
	parent: Stoppable;
	read: (_: _) => T;
	_stop: (_: _, arg?: any) => void;
	stopped: boolean;
	headers: { [name: string]: string }; // experimental
	constructor(read: (_: _) => T, stop?: (_: _, arg: any) => void, parent?: Stoppable) {
		if (typeof read !== 'function') throw new Error("invalid reader.read: " + (read && typeof read));
		this.parent = parent;
		this.read = read;
		this.stopped = false;
		if (stop) this._stop = stop;
	}

	/// * `count = reader.forEach(_, fn, thisObj)`  
	///   Similar to `forEach` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   This call is asynchonous. It returns the number of entries processed when the end of stream is reached.
	forEach(_: _, fn: (_: _, value: T, index: number) => void, thisObj?: any) {
		thisObj = thisObj !== undefined ? thisObj : this;
		return tryCatch(_, this, (_) => {
			var i: number, val: any;
			for (i = 0; (val = this.read(_)) !== undefined; i++) {
				fn.call(thisObj, _, val, i);
			}			
			return i;
		});
	}

	/// * `reader = reader.map(fn, thisObj)`  
	///   Similar to `map` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another reader on which other operations may be chained.
	map<U>(fn: (_: _, value: T, index: number) => U, thisObj?: any) : Reader<U> {
		thisObj = thisObj !== undefined ? thisObj : this;
		return new Reader((_) => {
			var count = 0;
			var val = this.read(_);
			if (val === undefined) return undefined;
			return fn.call(thisObj, _, val, count++);
		}, null, this);
	}

	/// * `result = reader.every(_, fn, thisObj)`  
	///   Similar to `every` on arrays.  
	///   The `fn` function is called as `fn(_, elt)`.  
	///   Returns true at the end of stream if `fn` returned true on every entry.  
	///   Stops streaming and returns false as soon as `fn` returns false on an entry.
	every(_: _, fn: ((_: _, value: T) => boolean) | {}, thisObj?: any) {
		thisObj = thisObj !== undefined ? thisObj : this;
		const f = resolvePredicate(fn);
		return tryCatch(_, this, (_) => {
			while (true) {
				var val = this.read(_);
				if (val === undefined) return true;
				if (!f.call(thisObj, _, val)) {
					this.stop(_);
					return false;
				};
			}
		});
	}

	/// * `result = reader.some(_, fn, thisObj)`  
	///   Similar to `some` on arrays.  
	///   The `fn` function is called as `fn(_, elt)`.  
	///   Returns false at the end of stream if `fn` returned false on every entry.  
	///   Stops streaming and returns true as soon as `fn` returns true on an entry.
	some(_:_, fn: ((_: _, value: T) => boolean) | {}, thisObj?: any) {
		thisObj = thisObj !== undefined ? thisObj : this;
		const f = resolvePredicate(fn);
		return tryCatch(_, this, (_) => {
			while (true) {
				var val = this.read(_);
				if (val === undefined) return false;
				if (f.call(thisObj, _, val)) {
					this.stop(_);
					return true;
				}
			}
		});
	}

	/// * `result = reader.reduce(_, fn, initial, thisObj)`  
	///   Similar to `reduce` on arrays.  
	///   The `fn` function is called as `fn(_, current, elt)` where `current` is `initial` on the first entry and
	///   the result of the previous `fn` call otherwise.
	///   Returns the value returned by the last `fn` call.
	reduce<U>(_: _, fn: (_: _, prev: U, value: T) => U, v: U, thisObj?: any) : U {
		thisObj = thisObj !== undefined ? thisObj : this;
		return tryCatch(_, this, (_) => {
			while (true) {
				var val = this.read(_);
				if (val === undefined) return v;
				v = fn.call(thisObj, _, v, val);
			}
		});
	}

	/// * `writer = reader.pipe(_, writer)`  
	///   Pipes from `stream` to `writer`.
	///   Returns the writer for chaining.
	// should be pipe<R extends Writer<T>>(_: _, writer: R) 
	// but flow-comments plugin does not understand this syntax
	// so I relax the return type.
	pipe(_: _, writer: Writer<T>) : any {
		tryCatch(_, this, (_) => {
			do {
				var val = this.read(_);
				try {
					writer.write(_, val);
				} catch (ex) {
					var arg = stopException.unwrap(ex);
					if (arg && arg !== true) {
						this.stop(_, arg);
						throw arg;
					} else {
						this.stop(_, arg);
						break;
					}
				}

			} while (val !== undefined);
		});
		return writer;
	}

	/// * `reader = reader.tee(writer)`  
	///   Branches another writer on the chain`.  
	///   Returns another reader on which other operations may be chained.
	tee(writer: Writer<T>) {
		const parent = this;
		var writeStop: [any];
		var readStop: [any];
		const stopResult: (arg: any) => T = (arg) => {
			if (!arg || arg === true) return undefined;
			else throw arg;			
		}
		const readDirect = (_: _) => {
			var val = parent.read(_);
			if (!writeStop) {
				try {
					writer.write(_, val);
				} catch (ex) {
					const arg = stopException.unwrap(ex);
					writeStop = [arg];
					if (readStop) {
						// both outputs are now stopped
						// stop parent if readStop was a soft stop
						if (!readStop[0]) parent.stop(_, arg);
						if (arg && arg !== true) throw arg;
						else val = undefined;
					} else if (arg) {
						// direct output was not stopped and received a full stop
						readStop = writeStop;
						parent.stop(_, arg);
						if (arg && arg !== true) throw arg;
						else val = undefined;
					}
				}
			}
			return val;
		}

		return new Reader(function read(_: _) {
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
				parent.stop(_, arg);
			} else if (writeStop && !writeStop[0]) {
				// only writer was stopped before
				// stop parent
				parent.stop(_, arg);
			} else if (!writeStop) {
				// direct output is stopped.
				// we continue to read it, to propagate to the secondary output
				_.run((_) => {
					while (readDirect(_) !== undefined);
				});
			}
		}, parent);
	}

	/// * `readers = reader.dup()`  
	///   Duplicates a reader and returns a pair of readers which can be read from independently.
	dup(): [Reader<T>, Reader<T>] {
		const uturn = require('./devices/uturn').create();
		return [this.tee(uturn.writer), uturn.reader];
	}

	/// * `reader = reader.concat(reader1, reader2)`  
	///   Concatenates reader with one or more readers.  
	///   Works like array.concat: you can pass the readers as separate arguments, or pass an array of readers.  
	concat(...readers: (Reader<T> | Reader<T>[])[]) {
		const streams: Reader<T>[] = Array.prototype.concat.apply([], arguments);
		var stream: Reader<T> = this;
		return new Reader(function read(_) {
			var val: T;
			while (stream && (val = stream.read(_)) === undefined) stream = streams.shift();
			return val;
		}, function stop(_, arg) {
			while (stream) {
				stream.stop(_, arg);
				stream = streams.shift();
			}
		}, this);
	}

	/// * `result = reader.toArray(_)`  
	///   Reads all entries and returns them to an array.
	///   Note that this call is an anti-pattern for streaming but it may be useful when working with small streams.
	toArray(_: _) : T[] {
		return this.reduce(_, (_, arr, elt) => {
			arr.push(elt);
			return arr;
		}, []);
	}

	/// * `result = reader.readAll(_)`  
	///   Reads all entries and returns them as a single string or buffer. Returns undefined if nothing has been read.
	///   Note that this call is an anti-pattern for streaming but it may be useful when working with small streams.
	readAll(_: _) : string | Buffer | T[] {
		const arr = this.toArray(_);
		if (typeof arr[0] === 'string') return arr.join('');
		if (Buffer.isBuffer(arr[0])) {
			const bufs: any = arr;
			return Buffer.concat(bufs);
		}
		return arr.length > 0 ? arr : undefined;
	}

	/// * `reader = reader.transform(fn)`  
	///   Inserts an asynchronous transformation into chain.  
	///   This API is more powerful than `map` because the transformation function can combine results, split them, etc.  
	///   The transformation function `fn` is called as `fn(_, reader, writer)`
	///   where `reader` is the `stream` to which `transform` is applied,
	///   and writer is a writer which is piped into the next element of the chain.  
	///   Returns another reader on which other operations may be chained.
	transform<U>(fn: (_: _, reader: Reader<T>, writer: Writer<U>) => void, thisObj?: any): Reader<U> {
		thisObj = thisObj !== undefined ? thisObj : this;
		const parent = this;
		const uturn = require('./devices/uturn').create();
		_.run(_ => fn.call(thisObj, _, parent, uturn.writer), err => {
			// stop parent at end
			_.run(_ => parent.stop(_), e => {
				uturn.end(err || e);
			});
		});
		return uturn.reader;
	}

	/// * `result = reader.filter(fn, thisObj)`  
	///   Similar to `filter` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another reader on which other operations may be chained.
	filter(fn: ((_: _, value: T, index: number) => boolean) | {}, thisObj?: any) {
		thisObj = thisObj !== undefined ? thisObj : this;
		const f = resolvePredicate(fn);
		const parent = this;
		var i = 0, done = false;
		return new Reader(function(_) {
			while (!done) {
				var val = parent.read(_);
				done = val === undefined;
				if (done || f.call(thisObj, _, val, i++)) return val;
			}
		}, null, parent);
	}

	/// * `result = reader.until(fn, testVal, thisObj, stopArg)`  
	///   Cuts the stream by when the `fn` condition becomes true.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   `stopArg` is an optional argument which is passed to `stop` when `fn` becomes true.  
	///   Returns another reader on which other operations may be chained.
	until(fn: ((_: _, value: T, index: number) => boolean) | {}, thisObj?: any, stopArg?: any) {
		thisObj = thisObj !== undefined ? thisObj : this;
		const f = resolvePredicate(fn);
		const parent = this;
		var i = 0;
		return new Reader(function(_) {
			var val = parent.read(_);
			if (val === undefined) return undefined;
			if (!f.call(thisObj, _, val, i++)) return val;
			parent.stop(_, stopArg);
		}, null, parent);
	}

	/// * `result = reader.while(fn, testVal, thisObj, stopArg)`  
	///   Cuts the stream by when the `fn` condition becomes false.  
	///   This is different from `filter` in that the result streams _ends_ when the condition
	///   becomes false, instead of just skipping the entries.
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   `stopArg` is an optional argument which is passed to `stop` when `fn` becomes false.  
	///   Returns another reader on which other operations may be chained.
	while(fn: ((_: _, value: T, index: number) => boolean) | {}, thisObj?: any, stopArg?: any) {
		const f = resolvePredicate(fn);
		return this.until((_, val, i) => !f.call(thisObj, _, val, i), thisObj, stopArg);
	}

	/// * `result = reader.limit(count, stopArg)`  
	///   Limits the stream to produce `count` results.  
	///   `stopArg` is an optional argument which is passed to `stop` when the limit is reached.  
	///   Returns another reader on which other operations may be chained.
	limit(n: number, stopArg?: any) {
		return this.until((_, val, i) => i >= n, this, stopArg);
	}

	/// * `result = reader.skip(count)`  
	///   Skips the first `count` entries of the reader.  
	///   Returns another reader on which other operations may be chained.
	skip(n: number) {
		return this.filter((_, val, i) => i >= n);
	}

	/// * `group = reader.fork(consumers)`  
	///   Forks the steam and passes the values to a set of consumers, as if each consumer
	///   had its own copy of the stream as input.  
	///   `consumers` is an array of functions with the following signature: `reader = consumer(source)`
	///   Returns a `StreamGroup` on which other operations can be chained.
	fork(consumers: ((source: any) => Reader<T>)[]) {
		// simple implementation with repeated dup.
		const parent: Reader<T> = this;
		const readers: Reader<T>[] = [];
		if (consumers.length === 1) {
			readers.push(consumers[0](parent));
		} else {
			var source = parent;
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
	parallel(options: ParallelOptions | number, consumer: (source: any) => Reader<T>) {
		var opts : ParallelOptions;
		if (typeof options === "number") opts = {
			count: options,
		};
		else opts = options;

		const parent = this;
		const streams: Reader<T>[] = [];
		const funnel = _.funnel(1);
		var inside = 0;
		var stopArg: any;
		for (var i = 0; i < opts.count; i++) {
			((i: number) => { // i for debugging
				streams.push(consumer(new Reader(function read(_) {
					if (stopArg) {
						if (stopArg === true) return undefined;
						else throw stopArg;
					}
					return funnel(_, (_) => {
						if (inside++ !== 0) throw new Error("funnel error: " + inside);
						var val = parent.read(_);
						inside--;
						return val;
					});
				}, function stop(_, arg) {
					if (stopArg) return;
					stopArg = arg;
					parent.stop(_, arg);
				}, parent)));
			})(i);
		}
		const group = new StreamGroup(streams);
		return opts.shuffle ? group.dequeue() : group.rr();
	}

	/// * `reader = reader.peekable()`  
	///   Returns a stream which has been extended with two methods to support lookahead.  
	///   The lookahead methods are:
	///   - `reader.peek(_)`: same as `read(_)` but does not consume the item. 
	///   - `reader.unread(val)`: pushes `val` back so that it will be returned by the next `read(_)`
	peekable() : PeekableReader<T> {
		const that: Reader<T> = this;
		return new PeekableReader(that);
	}

	/// * `reader = reader.buffer(max)`  
	///   Returns a stream which is identical to the original one but in which up to `max` entries may have been buffered.  
	buffer(max: number) {
		const parent = this;
		const buffered: T[] = [];
		var resume: (err: any, val?: T) => void;
		var err: any;
		var pending = false;

		const fill = () => {
			if (pending) return;
			pending = true;
			_.run(_ => parent.read(_), (e, v) => {
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

		return new Reader(_.cast(function read(cb) {
			if (buffered.length > 0) {
				var val = buffered.shift();
				fill();
				cb(null, val);
			} else {
				resume = cb;
			}
		}), null, parent);
	}

	join(streams: Reader<T>[] | Reader<T>, thisObj?: any) {
		const that: Reader<T> = this;
		const sts = Array.isArray(streams) ? streams : [streams];
		return new StreamGroup([that].concat(sts)).dequeue();
	}

	/// * `stream = reader.nodify()`  
	///   converts the reader into a native node Readable stream.  
	nodify() {
		const stream = new (require('stream').Readable)();
		var pending = false;
		const end = () => {
			stream.push(null);
		}
		const more = () => {
			if (pending) return;
			var sync = true;
			pending = true;
			_.run(_ => this.read(_), (err, result) => {
				pending = false;
				if (err) return stream.emit('error', err);
				if (result === undefined) {
					if (sync) nextTick(end);
					else end();
					return;
				}
				if (stream.push(result)) {
					if (sync) nextTick(more);
					else more();
				}
			});
			sync = false;
		}
		stream._read = () => {
			more();
		};
		return stream;
	}

	/// * `reader = reader.nodeTransform(duplex)`  
	///   pipes the reader into a node duplex stream. Returns another reader. 
	nodeTransform(duplex: nodeStream.Duplex) {
		return require('./devices/node').reader(this.nodify().pipe(duplex));
	}

	/// * `cmp = reader1.compare(_, reader2)`  
	///   compares reader1 and reader2 return 0 if equal,  
	compare(_: _, other: Reader<T>, options: CompareOptions<T>) {
		options = options || {};
		var compare = options.compare;
		if (!compare) compare = (a, b) => a === b ? 0 : a < b ? -1 : +1;
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
	stop(_: _, arg?: any) {
		if (this.stopped) return;
		this.stopped = true;
		if (this._stop) this._stop(_, arg);
		else if (this.parent) this.parent.stop(_, arg);
	};
}


export class PeekableReader<T> extends Reader<T> {
	buffered: T[];
	constructor(parent: Reader<T>) {
		super((_: _) => {
			return this.buffered.length > 0 ? this.buffered.pop() : parent.read(_);
		}, null, parent);
		this.buffered = [];
	}

	unread(val: T) {
		this.buffered.push(val);
		return this; // for chaining
	}
	peek(_: _) {
		var val = this.read(_);
		this.unread(val);
		return val;
	}
}

/// * `ez.reader.decorate(proto)`  
///   Adds the EZ streams reader API to an object. 
///   Usually the object is a prototype but it may be any object with a `read(_)` method.  
///   You do not need to call this function if you create your readers with
///   the `ez.devices` modules.   
///   Returns `proto` for convenience.
exports.decorate = function(proto: any) {
	const readerProto: any = Reader.prototype;
	Object.getOwnPropertyNames(Reader.prototype).forEach(k => {
		if (k !== 'constructor') proto[k] = readerProto[k];
	});
	return proto;
}

export function create<T>(read: (_: _) => T, stop?: (_: _, arg: any) => void) {
	return new Reader(read, stop, null);
}

/// ## StreamGroup API

export class StreamGroup<T> implements Stoppable {
	readers: Reader<T>[];
	constructor(readers: Reader<T>[]) {
		this.readers = readers;
	}
	stop(_: _, arg?: any) {
		this.readers.forEach_(_, (_, rd) => {
			if (rd) rd.stop(_, arg);
		});
	}

	/// * `reader = group.dequeue()`  
	///   Dequeues values in the order in which they are delivered by the readers.
	///   Returns a stream on which other operations may be chained.
	dequeue() {
		interface Result {
			i: number;
			e: any;
			v: T;
			next: () => void;
		}
		const results: Result[] = [];
		var alive = this.readers.length;
		var resume: (err: any, val: T) => void;
		this.readers.forEach((stream, i) => {
			const next = () => {
				if (alive === 0) return;
					_.run(_ => stream.read(_), (e, v) => {
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
		return new Reader(_.cast(function read(cb) {
			if (alive <= 0) return cb(null), void 0;
			const res = results.shift();
			if (res) {
				if (res.next) res.next();
				return cb(res.e, res.v);
			} else {
				resume = cb;
			}
		}), null, this);
	}
	/// * `reader = group.rr()`  
	///   Dequeues values in round robin fashion.
	///   Returns a stream on which other operations may be chained.
	rr() {
		interface Entry {
			i: number;
			stream: Reader<T>;
			read: (_: _) => T; 
		}
		const entry = (stream: Reader<T>, i: number) => ({
			i: i,
			stream: stream,
			read: _.future(_ => stream.read(_)),
		});
		const q = this.readers.map(entry);
		return new Reader(function(_) {
			var elt: Entry;
			while (elt = q.shift()) {
				var val = elt.read(_);
				if (val !== undefined) {
					q.push(entry(elt.stream, elt.i));
					return val;
				}
			}
			return undefined;
		}, null, this);
	}

	/// * `reader = group.join(fn, thisObj)`  
	///   Combines the values read from the readers to produce a single value.
	///   `fn` is called as `fn(_, values)` where `values` is the set of values produced by 
	///   all the readers that are still active.  
	///   `fn` returns the value which will be read from the joined stream. `fn` _must_ also reset to `undefined` the `values` entries
	///   that it has consumed. The next `read(_)` on the joined stream will fetch these values. 
	///   Note that the length of the `values` array will decrease every time an input stream is exhausted.
	///   Returns a stream on which other operations may be chained.
	join(fn: (_: _, values: T[]) => T, thisObj?: any) {
		thisObj = thisObj !== undefined ? thisObj : this;

		var last = 0; // index of last value read by default fn 
		if (!fn) fn = ((_, values) => {
			var i = last; 
			do {
				i = (i + 1) % values.length;
				var v = values[i];
				if (v !== undefined) {
					values[i] = undefined;
					last = i;
					return v;
				}
			} while (i !== last);
		});

		const values: T[] = [];
		var active = this.readers.length;
		var done = false;
		var reply: (err?: any, val?: T) => void;
		const joinerCb = (err: any, val: T) => {
			if (err || val === undefined) {
				done = true;
				return reply(err, val);
			}
			// be careful with re-entrancy
			const rep = reply;
			reply = null;
			rep(null, val);
		};
		const callbacks = this.readers.map((reader, i) => ((err: any, data: T) => {
			if (active === 0) return reply();
			if (err) {
				done = true;
				return reply(err);
			}
			values[i] = data;
			if (data === undefined) {
				this.readers[i] = null;
				if (--active === 0) return reply();
			}
			const vals = values.filter((val) => val !== undefined);
			if (vals.length === active) {
				fn.call(thisObj, joinerCb, values);
			}
		}));

		const refill = () => {
			var count = 0;
			this.readers.forEach((rd, j) => {
				if (rd && values[j] === undefined) {
					count++;
					_.run(_ => rd.read(_), callbacks[j]);
				}
			});
			if (count === 0) throw new Error("bad joiner: must pick and reset at least one value");
		}
		return new Reader(_.cast(function read(cb) {
			if (done) {
				cb();
				return;
			}
			reply = cb;
			refill();
		}), null, this);
	}
}
