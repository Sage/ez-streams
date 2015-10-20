"use strict";
/// !doc
/// ## Transform to cut string and binary streams
/// 
/// `var ez = require("ez-streams")`  
/// 
/// * `transform = ez.transforms.cut(options)`  
///   cuts a string or binary stream in chunks of equal size  
module.exports = function(options) {
	var options = options || {};
	var size = typeof options === 'number' ? options : options.size;
	return function(_, reader, writer) {
		if (!size) return reader.pipe(_, writer);
		var data = reader.read(_);
		while (data !== undefined) {
			if (data.length < size) {
				var d = reader.read(_);
				if (d === undefined) {
					if (data.length > 0) writer.write(_, data);
					data = d;
				} else {
					if (typeof data === 'string') data += d;
					else if (Buffer.isBuffer(data)) data = Buffer.concat([data, d]);
					else if (Array.isArray(data)) data = data.concat(d);
					else throw new Error("Cannot cut: bad data type: " + typeof data);
				}
			} else {
				writer.write(_, data.slice(0, size));
				data = data.slice(size);
			}
		}
	};
};