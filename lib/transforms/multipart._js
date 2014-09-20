"use strict";
/// !doc
/// ## Stream transform for MIME multipart
/// 
/// `var ez = require("ez-streams")`  
/// 
var generic = require('../devices/generic');
var flows = require('streamline/lib/util/flows');

function parseContentType(contentType) {
	if (!contentType) throw new Error("content-type missing");
	var match = /^multipart\/([\w\-]*)/.exec(contentType);
	if (!match) return null;
	var subType = match[1];
	var atbs = contentType.split(/\s*;\s*/).reduce(function(r, s) {
		var kv = s.split(/\s*=\s*/);
		r[kv[0]] = kv[1];
		return r;
	}, {});
	return {
		subType: subType,
		boundary: atbs.boundary,
	}
}

module.exports = {
	/// * `transform = ez.transforms.multipart.parser(options)`  
	///   Creates a parser transform.
	///   The content type, which includes the boundary,
	///   is passed via `options['content-type']`.
	parser: function(options) {
		var ct = parseContentType(options && options["content-type"]);
		var boundary = ct.boundary;
		if (!boundary) throw new Error("multipart boundary missing");

		return function(_, reader, writer) {
			reader = reader.peekable();
			var handshake = flows.handshake();
			while (true) {
				var buf = reader.read(_, 2048);
				if (!buf || !buf.length) return;
				var str = buf.toString("binary");
				var i = str.indexOf(boundary);
				if (i < 0) throw new Error("boundary not found");
				var lines = str.substring(0, i).split(/\r?\n/);
				var headers = lines.slice(0, lines.length - 2).reduce(function(h, l) {
					var kv = l.split(/\s*:\s*/);
					h[kv[0].toLowerCase()] = kv[1];
					return h;
				}, {});
				i = str.indexOf('\n', i);
				reader.unread(buf.slice(i + 1));

				var read = function(_) {
						var len = Math.max(boundary.length, 256);
						var buf = reader.read(_, 32 * len);
						if (!buf || !buf.length) {
							handshake.notify();
							return;
						}
						// would be nice if Buffer had an indexOf. Would avoid a conversion to string.
						// I could use node-buffertools but it introduces a dependency on a binary module.
						var s = buf.toString("binary");
						var i = s.indexOf(boundary);
						if (i === 0) {
							var j = s.indexOf('\n', boundary.length);
							if (j < 0) throw new Error("newline missing after boundary");
							reader.unread(buf.slice(j + 1));
							handshake.notify();
							return undefined;
						} else if (i > 0) {
							var j = s.lastIndexOf('\n', i);
							if (s[j - 1] === '\r') j--;
							reader.unread(buf.slice(i));
							return buf.slice(0, j);
						} else {
							reader.unread(buf.slice(31 * len));
							return buf.slice(0, 31 * len);
						}
					};
				var partReader = generic.reader(read);
				partReader.headers = headers;
				writer.write(_, partReader);
				handshake.wait(_);
			}
		};
	},

	/// * `transform = ez.transforms.multipart.formatter(options)`  
	///   Creates a formatter transform.
	///   The content type, which includes the boundary,
	///   is passed via `options['content-type']`.
	formatter: function(options) {
		var ct = parseContentType(options && options["content-type"]);
		var boundary = ct.boundary;
		if (!boundary) throw new Error("multipart boundary missing");

		return function(_, reader, writer) {
			var part;
			while ((part = reader.read(_)) !== undefined) {
				if (!part.headers) throw new Error("part does not have headers");
				Object.keys(part.headers).forEach_(_, function(_, key) {
					writer.write(_, new Buffer(key + ": " + part.headers[key] + "\n", "binary"));
				});
				writer.write(_, new Buffer("\n" + boundary + "\n"));
				// cannot use pipe because pipe writes undefined at end.
				part.forEach(_, function(_, data) {
					writer.write(_, data);
				});
				writer.write(_, new Buffer("\n" + boundary + "\n"));
			}
		}
	},
};