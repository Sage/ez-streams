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

function Decorated(write) {
	this.write = write;
};

/// * `ez.writer.decorate(proto)`  
///   Adds the EZ streams writer API to an object. 
///   Usually the object is a prototype but it may be any object with a `write(_, data)` method.  
///   You do not need to call this function if you create your readers with
///   the `ez.devices` modules.   
///   Returns `proto` for convenience.
exports.decorate = function(proto) {
	/// * `writer = writer.premap(fn, thisObj)`  
	///   Similar to `map` on arrays.  
	///   The `fn` function is called as `fn(_, elt, i)`.  
	///   Returns another writer on which other operations may be chained.
	proto.premap = function(fn, thisObj) {
		thisObj = thisObj !== undefined ? thisObj : this;
		var self = this;
		var count = 0;
		return new Decorated(function(_, val) {
			if (val !== undefined) val = fn.call(thisObj, _, val, count++);
			self.write(_, val);
		});
	};
	return proto;
};

exports.decorate(Decorated.prototype);
