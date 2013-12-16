"use strict";

/// 
/// ## Native node.js streams
/// 
var streams = require('streamline-streams/lib/streams');
var api = require('../api');

api.decorate(streams.ReadableStream.prototype);

function fixOptions(options) {
	options = options || {};
	options.ez = true;
	return options;
}

module.exports = {
	/// !doc
	/// ## EZ Stream wrappers for native node streams
	/// 
	/// `var ezs = require('ez-streams');`
	/// 
	/// * `reader = ezs.devices.node.reader(stream, options)`  
	///   wraps a node.js stream as an EZ reader.  
	///   For a full description of the options, see `ReadableStream` in
	///   https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
	reader: function(emitter, options) {
		return new streams.ReadableStream(emitter, fixOptions(options));
	},
	/// * `writer = ezs.devices.node.writer(stream, options)`  
	///   wraps a node.js stream as an EZ writer.  
	///   For a full description of the options, see `WritableStream` in
	///   https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
	writer: function(emitter, options) {
		return new streams.WritableStream(emitter, fixOptions(options));
	},
	fixOptions: fixOptions,
};