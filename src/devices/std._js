"use strict";

const streams = require('../node-wrappers');

/// !doc
/// ## EZ wrappers for standard I/O streams
/// 
/// `const ez = require('ez-streams');`
/// 
/// * `reader = ez.devices.std.in(encoding)`  
/// * `writer = ez.devices.std.out(encoding)`  
/// * `writer = ez.devices.std.err(encoding)`  
module.exports = {
	in : (encoding) => {
		const st = new streams.ReadableStream(streams.stream2Wrapper(process.stdin), {});
		st.setEncoding(encoding);
		//process.stdin.resume();
		return st;
	},
	out: (encoding) => new streams.WritableStream(process.stdout, {
		encoding: encoding,
	}),
	err: (encoding) => new streams.WritableStream(process.stderr, {
		encoding: encoding,
	}),
};