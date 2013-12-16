"use strict";
/// !doc
/// ## Stream transform for CSV files
/// 
/// `var ezs = require("ez-streams")`  
/// 

var lines = require('./lines');

module.exports = {
	/// * `transform = ezs.transforms.csv.parser(options)`  
	///   creates a parser transform. The following options can be set:  
	///   - `sep`: the field separator, comma by default 
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
	/// * `transform = ezs.transforms.csv.formatter(options)`  
	///   creates a formatter transform. The following options can be set:  
	///   - `sep`: the field separator, comma by default 
	///   - `eol`: the end of line marker (`\n`  or `\r\n`)  
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