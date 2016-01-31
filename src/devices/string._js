"use strict";

const readerApi = require('../reader');
const writerApi = require('../writer');
const nextTick = require('../util').nextTick;

module.exports = {
	/// !doc
	/// ## In-memory string streams
	/// 
	/// `const ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.string.reader(text, options)`  
	///   creates an EZ reader that reads its chunks from `text`.  
	///   `reader.read(_)` will return the chunks asynchronously by default.  
	///   You can force synchronous delivery by setting `options.sync` to `true`.
	///   The default chunk size is 1024. You can override it by passing 
	///   a `chunkSize` option.
	reader: (text, options) => {
		if (typeof options === "number") options = {
			chunkSize: options
		};
		else options = options || {};
		const chunkSize = options.chunkSize || 1024;
		var pos = 0;
		return readerApi.decorate({
			read: function(_) {
				if (!options.sync) nextTick(_);
				if (pos >= text.length) return;
				const len = typeof chunkSize === "function" ? chunkSize() : chunkSize;
				const s = text.substring(pos, pos + len);
				pos += len;
				return s;
			},
		});
	},
	/// * `writer = ez.devices.string.writer(options)`  
	///   creates an EZ writer that collects strings into a text buffer.  
	///   `writer.write(_, data)` will write asynchronously by default.  
	///   You can force synchronous write by setting `options.sync` to `true`.
	///   `writer.toString()` returns the internal text buffer into which the 
	///   strings have been collected.
	writer: (options) => {
		options = options || {};
		var buf = "";
		return writerApi.decorate({
			write: function(_, data) {
				if (!options.sync) nextTick(_);
				if (data === undefined) return;
				buf += data;
			},
			toString: function() {
				return buf;
			},
		});
	},
};