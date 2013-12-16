"use strict";

var streams = require('streamline-streams');

///   Wrappers for standard streams
/// * `std.in(encoding)`  
/// * `std.out(encoding)`  
/// * `std.err(encoding)`  
module.exports = { in : function(encoding) {
		var st = new streams.ReadableStream(process.stdin, {
			ez: true
		});
		st.setEncoding(encoding);
		process.stdin.resume();
		return st;
	},
	out: function(encoding) {
		return new streams.WritableStream(process.stdout, {
			encoding: encoding,
			ez: true,
		});
	},
	err: function(encoding) {
		return new streams.WritableStream(process.stderr, {
			encoding: encoding,
			ez: true,
		});
	},
};