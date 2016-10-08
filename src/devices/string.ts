import { _ } from 'streamline-runtime';
import { Reader } from '../reader';
import { Writer } from '../writer';
import { nextTick } from '../util';

/// !doc
/// ## In-memory string streams
/// 
/// `import * as ez from 'ez-streams'`
/// 

export interface Options {
	sync?: boolean;
	chunkSize?: number | (() => number);
}

export class StringWriter extends Writer<string> {
	buf: string;
	constructor(options: Options) {
		super((_: _, value: string) => {
			if (!options.sync) nextTick(_);
			if (value !== undefined) this.buf += value;
			return this;
		});
		this.buf = '';
	}
	toString() {
		return this.buf;
	}
	get result() {
		return this.buf;
	}
}


/// * `reader = ez.devices.string.reader(text, options)`  
///   creates an EZ reader that reads its chunks from `text`.  
///   `reader.read(_)` will return the chunks asynchronously by default.  
///   You can force synchronous delivery by setting `options.sync` to `true`.
///   The default chunk size is 1024. You can override it by passing 
///   a `chunkSize` option.
export function reader(text: string, options?: Options | number) {
	var opts: Options;
	if (typeof options === "number") {
		opts = {
			chunkSize: options
		};
	}
	else opts = options || {};
	const chunkSize = opts.chunkSize || 1024;
	var pos = 0;
	return new Reader(function read(_) {
		if (!opts.sync) nextTick(_);
		if (pos >= text.length) return;
		const len = typeof chunkSize === "function" ? chunkSize() : chunkSize;
		const s = text.substring(pos, pos + len);
		pos += len;
		return s;
	});
}
/// * `writer = ez.devices.string.writer(options)`  
///   creates an EZ writer that collects strings into a text buffer.  
///   `writer.write(_, data)` will write asynchronously by default.  
///   You can force synchronous write by setting `options.sync` to `true`.
///   `writer.toString()` returns the internal text buffer into which the 
///   strings have been collected.
export function writer(options?: Options) {
	return new StringWriter(options || {});
}

export function factory(url: string) {
	return {
		/// * `reader = factory.reader(_)`  
		reader: (_: _) => {
			return module.exports.reader(url.substring(url.indexOf(':') + 1));
		},
		/// * `writer = factory.writer(_)`  
		writer: (_: _) => {
			return module.exports.writer();
		},
	};
}