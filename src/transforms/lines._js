"use strict";
/// !doc
/// ## Stream transform for line-oriented text streams
/// 
/// `const ez = require("ez-streams")`  
/// 
module.exports = {
	/// * `transform = ez.transforms.lines.parser(options)`  
	///   creates a parser transform.
	///   `options` is reserved for future use.
	parser: function(options) {
		options = options || {};

		function clean(line) {
			return (!options.sep && line[line.length - 1] === '\r') ? line.substring(0, line.length - 1) : line;
		}
		return (_, reader, writer) => {
			var remain = "";
			reader.forEach(_, (_, chunk) => {
				if (Buffer.isBuffer(chunk)) chunk = chunk.toString(options.encoding || 'utf8');
				const lines = chunk.split(options.sep || '\n');
				if (lines.length > 1) {
					writer.write(_, clean(remain + lines[0]));
					for (var i = 1; i < lines.length - 1; i++) writer.write(_, clean(lines[i]));
					remain = lines[i];
				} else {
					remain += lines[0];
				}
			});
			if (remain) writer.write(_, remain);
		};
	},

	/// * `transform = ez.transforms.lines.formatter(options)`  
	///   creates a formatter transform.
	///   `options.eol` defines the line separator. It is set to `\n` by default.
	///   `options.extra` indicates if an extra line separator must be emitted or not at the end. It is false by default.
	formatter: (options) => {
		options = options || {};
		const eol = options.eol || '\n';
		return (_, reader, writer) => {
			if (options.extra) {
				reader.forEach(_, (_, line) => {
					writer.write(_, line + eol);
				});
			} else {
				reader.forEach(_, (_, line, i) => {
					writer.write(_, i > 0 ? eol + line : line);
				});
			}
		}
	},
};