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
/// `var ez = require("ez-streams")`  
/// 
var streams = require('./node-wrappers');
var flows = require('streamline-runtime').flows;

var Decorated = function Decorated(write, stop) {
	this.ended = false;
	var self = this;
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
};

function Pre(writer) {
	this.writer = writer;
}

// add reader methods to Pre.prototype
!function() {
	var api = require('./reader').decorate({});
	Object.keys(api).forEach(function(name) {
		// skip reducers
		if (/^[^\()]*\(_/.test(api[name].toString())) return;
		// skip calls that don't return a reader
		if (/^(fork|nodify)$/.test(name)) return;
		Pre.prototype[name] = function(fn) {
			var uturn = require('./devices/uturn').create();
			uturn.reader[name](fn).pipe(uturn.end, this.writer);
			return uturn.writer;
		}
	});
}();

/// * `ez.writer.decorate(proto)`  
///   Adds the EZ streams writer API to an object. 
///   Usually the object is a prototype but it may be any object with a `write(_, data)` method.  
///   You do not need to call this function if you create your readers with
///   the `ez.devices` modules.   
///   Returns `proto` for convenience.
exports.decorate = function(proto) {
	/// 
	/// * `writer = writer.writeAll(_, val)`  
	///   writes `val` and ends the writer
	proto.writeAll = function(_, val) {
		this.write(_, val);
		this.write(_);
		return this;
	};

	/// 
	/// * `writer = writer.stop(err)`  
	///   stops the writer.  
	///   by default err is silently ignored
	proto.stop = function(err) {
		this.end();
		return this;
	};

	/// 
	/// * `writer = writer.end()`  
	///   ends the writer - compatiblity call (errors won't be thrown to caller)
	proto.end = function() {
		if (arguments.length > 0) throw new Error("invalid end call: " + arguments.length + " arg(s)");
		this.write(function(err) {
			if (err) throw err;
		});
		return this;
	};

	/// * `writer = writer.pre.action(fn)`  
	///   returns another writer which applies `action(fn)` before writing to the original writer.  
	///   `action` may be any chainable action from the reader API: `map`, `filter`, `transform`, ...  
	Object.defineProperty(proto, 'pre', {
		get: function() {
			return new Pre(this);
		},
	});

	/// * `stream = writer.nodify()`  
	///   converts the writer into a native node Writable stream.  
	proto.nodify = function() {
		var self = this;
		var stream = new (require('stream').Writable)();
		stream._write = function(chunk, encoding, done) {
			if (chunk && encoding && encoding !== 'buffer') chunk = chunk.toString(encoding);
			self.write(function(err) {
				if (err) return stream.emit('error', err);
				done();
			}, chunk);
		}
		// override end to emit undefined marker
		var end = stream.end;
		stream.end = function(chunk, encoding, cb) {
			end.call(stream, chunk, encoding, function(err) {
				if (err) return stream.emit('error', err);
				cb = cb || function(err) {};
				self.write(cb);
			});
		};
		return stream;
	};

	return proto;
};

exports.decorate(Decorated.prototype);

exports.create = function(write, stop) {
	return new Decorated(write, stop);
}
