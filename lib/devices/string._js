"use strict";

var api = require('../api');

module.exports = {
	reader: function(text, options) {
		if (typeof options === "number") options = {
			chunkSize: options
		};
		else options = options || {};
		var chunkSize = options.chunkSize || 1024;
		var pos = 0;
		var stream = {
			read: function(_) {
				if (!options.sync) setImmediate(~_);
				if (pos >= text.length) return;
				var len = typeof chunkSize === "function" ? chunkSize() : chunkSize;
				var s = text.substring(pos, pos + len);
				pos += len;
				return s;
			},
		};
		return api.decorate(stream);
	},
	writer: function(options) {
		options = options || {};
		var buf = "";
		return {
			write: function(_, data) {
				if (!options.sync) setImmediate(~_);
				if (data === undefined) return;
				buf += data;
			},
			toString: function() {
				return buf;
			},
		};
	},
};