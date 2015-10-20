"use strict";

var streams = require('../node-wrappers');

/// !doc
/// ## EZ wrappers for standard I/O streams
/// 
/// `var ez = require('ez-streams');`
/// 
/// * `reader = ez.devices.std.in(encoding)`  
/// * `writer = ez.devices.std.out(encoding)`  
/// * `writer = ez.devices.std.err(encoding)`  
module.exports = { in : function(encoding) {
		var st = new streams.ReadableStream(process.stdin, {});
		st.setEncoding(encoding);
		process.stdin.resume();
		return st;
	},
	out: function(encoding) {
		return new streams.WritableStream(process.stdout, {
			encoding: encoding,
		});
	},
	err: function(encoding) {
		return new streams.WritableStream(process.stderr, {
			encoding: encoding,
		});
	},
};