import { Reader } from '../reader';
import { Writer } from '../writer';
const streams = require('../node-wrappers');

/// !doc
/// ## EZ wrappers for standard I/O streams
/// 
/// `const ez = require('ez-streams');`
/// 
/// * `reader = ez.devices.std.in(encoding)`  
/// * `writer = ez.devices.std.out(encoding)`  
/// * `writer = ez.devices.std.err(encoding)`  
export const input: Input = function(encoding?: string) {
	const st = new streams.ReadableStream(process.stdin, {});
	st.setEncoding(encoding);
	process.stdin.resume();
	return st;
}

export const output: Output = function(encoding?: string) {
	return new streams.WritableStream(process.stdout, {
		encoding: encoding,
	});
}

export const error: Output = function(encoding?: string) {
	return new streams.WritableStream(process.stderr, {
		encoding: encoding,
	});
}

export interface Input {
	(encoding: string): Reader<string>;
	(): Reader<Buffer>;
}
export interface Output {
	(encoding: string): Writer<string>;
	(): Writer<Buffer>;
}

// compat API (cannot export 'in' to TS because reserved word)
exports.in = input;
exports.out = output;
exports.err = error;
