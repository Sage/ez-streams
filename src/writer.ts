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
/// ## EZ Streams core writer API
/// 
/// `const ez = require("ez-streams")`  
/// 
import { _ } from "streamline-runtime";
import { Reader } from "./reader";
import * as nodeStream from "stream";

export class Writer<T> {
	write: (_: _, value?: T) => Writer<T>;
	ended: boolean;
	constructor(write: (_: _, value: T) => Writer<T>, stop?: (_: _, arg?: any) => Writer<T>) {
		if (typeof write !== 'function') throw new Error("invalid writer.write: " + (write && typeof write));
		this.ended = false;
		this.write = function(_, data) {
			if (data === undefined) {
				if (!this.ended) write.call(this, _);
				this.ended = true;
			} else {
				if (this.ended) throw new Error("invalid attempt to write after end");
				write.call(this, _, data);
			}
			return this;
		};
		if (stop) this.stop = stop;
	}


	/// 
	/// * `writer = writer.writeAll(_, val)`  
	///   writes `val` and ends the writer
	writeAll(_: _, val: T) {
		this.write(_, val);
		this.write(_, undefined);
		return this;
	};

	/// 
	/// * `writer = writer.stop(_, err)`  
	///   stops the writer.  
	///   by default arg is silently ignored
	stop(_: _, arg?: any) : Writer<T> {
		this.write(_, undefined);
		return this;
	};

	/// 
	/// * `writer = writer.end()`  
	///   ends the writer - compatiblity call (errors won't be thrown to caller)
	end() {
		if (arguments.length > 0) throw new Error("invalid end call: " + arguments.length + " arg(s)");
		_.run(_ => this.write(_, undefined));
		return this;
	};

	/// * `writer = writer.pre.action(fn)`  
	///   returns another writer which applies `action(fn)` before writing to the original writer.  
	///   `action` may be any chainable action from the reader API: `map`, `filter`, `transform`, ...  
	get pre() : Pre<T> {
		return new Pre(this);
	}

	/// * `stream = writer.nodify()`  
	///   converts the writer into a native node Writable stream.  
	nodify() {
		const self = this;
		const stream = new nodeStream.Writable();
		stream._write = function(chunk, encoding, done) {
			if (chunk && encoding && encoding !== 'buffer') chunk = chunk.toString(encoding);
			_.run(_ => self.write(_, chunk), err => {
				if (err) return stream.emit('error', err);
				done();
			});
		}
		// override end to emit undefined marker
		const end = stream.end;
		// ES2015 does not let us override method directly but we do it!
		// This is fishy. Clean up later (should do it from end event).
		// also very fragile because of optional args.
		const anyStream: any = stream;
		anyStream.end = function(chunk: any, encoding?: string, cb?: (err: any, val?: any) => any) {
			end.call(stream, chunk, encoding, (err: any) => {
				if (err) return stream.emit('error', err);
				cb = cb || ((err) => {});
				_.run(_ => self.write(_, undefined), cb);
			});
		};
		return stream;
	}
};

export function create<T>(write: (_: _, value: T) => Writer<T>, stop?: (_: _, arg?: any) => Writer<T>) {
	return new Writer(write, stop);
}

/// * `ez.writer.decorate(proto)`  
///   Adds the EZ streams writer API to an object. 
///   Usually the object is a prototype but it may be any object with a `write(_, data)` method.  
///   You do not need to call this function if you create your readers with
///   the `ez.devices` modules.   
///   Returns `proto` for convenience.
// compat API - don't export in TS
exports.decorate = function(proto: any) {
	const writerProto: any = Writer.prototype;
	Object.getOwnPropertyNames(Writer.prototype).forEach(k => {
		// compare with == is important here!
		if (k == 'constructor') return;
		if (k == 'pre') {
			Object.defineProperty(proto, k, {
				get() { return new Pre(this); }
			});
		} else {
			proto[k] = writerProto[k];
		}
	});
	return proto;
}

function createUturn() {

}

export class Pre<T> {
	writer: Writer<T>;
	constructor(writer: Writer<T>) {
		if (typeof writer.write !== 'function') throw new Error("invalid pre writer: " + require('sys').inspect(writer));
		this.writer = writer;
	}
}

// add reader methods to Pre.prototype
// fragile but we'll fix later
process.nextTick(() => {
	const preProto: any = Pre.prototype;
	const api: any = Reader.prototype;
	[
		'map',
		'reduce',
		'tee',
		'dup',
		'concat',
		'transform',
		'filter', 
		'until',
		'while',
		'limit',
		'skip',
		'parallel',
		'peekable',
		'buffer',
		'join',
		'nodeTransform'
	].forEach((name) => {
		preProto[name] = function(arg: any) {
			const uturn = require('./devices/uturn').create();
			uturn.reader[name](arg).pipe(uturn.end, this.writer);
			return uturn.writer;
		}
	});
})
