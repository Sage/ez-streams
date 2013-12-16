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
	reader: function(emitter, options) {
		return new streams.ReadableStream(emitter, fixOptions(options));
	},
	writer: function(emitter, options) {
		return new streams.WritableStream(emitter, fixOptions(options));
	},
	fixOptions: fixOptions,
};