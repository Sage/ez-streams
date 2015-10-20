"use strict";

var readerApi = require('../reader');
var writerApi = require('../writer');

module.exports = {
	/// !doc
	/// ## In-memory buffer streams
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.buffer.reader(buffer, options)`  
	///   creates an EZ reader that reads its entries from `buffer`.  
	///   `reader.read(_)` will return its entries asynchronously by default.  
	///   You can force synchronous delivery by setting `options.sync` to `true`.
	///   The default chunk size is 1024. You can override it by passing 
	///   a `chunkSize` option.
	reader: function(buffer, options) {
		if (typeof options === "number") options = {
			chunkSize: options
		};
		else options = options || {};
		var chunkSize = options.chunkSize || 1024;
		var pos = 0;
		return readerApi.decorate({
			read: function(_) {
				if (!options.sync) setImmediate(_);
				if (pos >= buffer.length) return;
				var len = typeof chunkSize === "function" ? chunkSize() : chunkSize;
				var s = buffer.slice(pos, pos + len);
				pos += len;
				return s;
			},
		});
	},
	/// * `writer = ez.devices.buffer.writer(options)`  
	///   creates an EZ writer that collects data into an buffer.  
	///   `writer.write(_, data)` will write asynchronously by default.  
	///   You can force synchronous write by setting `options.sync` to `true`.
	///   `writer.toBuffer()` returns the internal buffer into which the 
	///   chunks have been collected.
	writer: function(options) {
		options = options || {};
		var chunks = [];
		return writerApi.decorate({
			write: function(_, data) {
				if (!options.sync) setImmediate(_);
				if (data !== undefined) chunks.push(data);
			},
			toBuffer: function() {
				return Buffer.concat(chunks);
			},
		});
	},
};