"use strict";

var api = require('../api');

module.exports = {
	reader: function(buffer, options) {
		if (typeof options === "number") options = {
			chunkSize: options
		};
		else options = options || {};
		var chunkSize = options.chunkSize || 1024;
		var pos = 0;
		var stream = {
			read: function(_) {
				if (!options.sync) setImmediate(~_);
				if (pos >= buffer.length) return;
				var len = typeof chunkSize === "function" ? chunkSize() : chunkSize;
				var s = buffer.slice(pos, pos + len);
				pos += len;
				return s;
			},
		};
		return api.decorate(stream);
	},
	writer: function(options) {
		options = options || {};
		var chunks = [];
		return {
			write: function(_, data) {
				if (!options.sync) setImmediate(~_);
				if (data !== undefined) chunks.push(data);
			},
			toBuffer: function() {
				return Buffer.concat(chunks);
			},
		};
	},
};