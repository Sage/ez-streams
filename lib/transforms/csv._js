"use strict";

var lines = require('./lines');

module.exports = {
	parser: function(options) {
		var options = options || {};
		options.sep = options.sep || ',';
		return function(_, reader, writer) {
			reader = reader.transform(lines.parser());
			var keys = reader.read(_).split(options.sep);
			reader.forEach(_, function(_, line) {
				// ignore empty line (we get one at the end if file is terminated by newline)
				if (line.length === 0) return;
				var values = line.split(options.sep);
				var obj = {};
				keys.forEach(function(key, i) {
					obj[key] = values[i];
				});
				writer.write(_, obj);
			});
		};
	},
	formatter: function(options) {
		var options = options || {};
		options.sep = options.sep || ',';
		options.eol = options.eol || '\n';
		return function(_, reader, writer) {
			var obj = reader.read(_);
			if (!obj) return;
			var keys = Object.keys(obj);
			writer.write(_, keys.join(options.sep) + options.eol);
			do {
				var values = keys.map(function(key) {
					return obj[key]
				});
				writer.write(_, values.join(options.sep) + options.eol);
			} while ((obj = reader.read(_)) !== undefined);
		};
	},
}