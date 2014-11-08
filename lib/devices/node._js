"use strict";

/// 
/// ## Native node.js streams
/// 
var streams = require('../node-wrappers');

require('../reader').decorate(streams.ReadableStream.prototype);
require('../writer').decorate(streams.WritableStream.prototype);

function fixOptions(options) {
	if (typeof options === "string") options = {
		encoding: options,
	};
	options = options || {};
	return options;
}

module.exports = {
	/// !doc
	/// ## EZ Stream wrappers for native node streams
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.node.reader(stream, options)`  
	///   wraps a node.js stream as an EZ reader.  
	///   For a full description of the options, see `ReadableStream` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	reader: function(emitter, options) {
		options = fixOptions(options);
		var reader = new streams.ReadableStream(emitter, options);
		if (options.encoding) reader.setEncoding(options.encoding);
		return reader.reader;
	},
	/// * `writer = ez.devices.node.writer(stream, options)`  
	///   wraps a node.js stream as an EZ writer.  
	///   For a full description of the options, see `WritableStream` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	writer: function(emitter, options) {
		var writer = new streams.WritableStream(emitter, fixOptions(options));
		return writer.writer;
	},
	fixOptions: fixOptions,
};