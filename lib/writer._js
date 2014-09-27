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
var streams = require('streamline-streams/lib/streams');
var flows = require('streamline/lib/util/flows');

var Decorated = function Decorated(write) {
	this.write = write;
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
			uturn.reader[name](fn).pipe(_ >> uturn.end, this.writer);
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
	// * `writer = writer.pre.action(fn)`  
	//   returns another writer which applies `action(fn)` before writing to the original writer.  
	//   `action` may be any chainable action from the reader API: `map`, `filter`, `transform`, ...  
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
				self.write(_ >> cb);
			});
		};
		return stream;
	};

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
	exports.decorate = hooks.writer.decorate(exports.decorate);
	Decorated = hooks.writer.construct(Decorated);
}();


exports.decorate(Decorated.prototype);

exports.create = function(write) {
	return new Decorated(write);
}
