import { _ } from 'streamline-runtime';
import { Reader } from '../reader';
import { Writer } from '../writer';
import { nextTick } from '../util';

export interface Options {
	sync?: boolean;
	chunkSize?: number | (() => number);
}

export class BufferWriter extends Writer<Buffer> {
	chunks: Buffer[];
	constructor(options: Options) {
		super((_: _, data: Buffer) => {
			if (!options.sync) nextTick(_);
			if (data !== undefined) this.chunks.push(data);
			return this;
		});
		this.chunks = [];
	}
	toBuffer() {
		return Buffer.concat(this.chunks);
	}
	get result() {
		return this.toBuffer();
	}
}


/// !doc
/// ## In-memory buffer streams
/// 
/// `const ez = require('ez-streams');`
/// 
/// * `reader = ez.devices.buffer.reader(buffer, options)`  
///   creates an EZ reader that reads its entries from `buffer`.  
///   `reader.read(_)` will return its entries asynchronously by default.  
///   You can force synchronous delivery by setting `options.sync` to `true`.
///   The default chunk size is 1024. You can override it by passing 
///   a `chunkSize` option.
export function reader(buffer: Buffer, options?: Options | number) {
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
		if (pos >= buffer.length) return;
		const len = typeof chunkSize === "function" ? chunkSize() : chunkSize;
		const s = buffer.slice(pos, pos + len);
		pos += len;
		return s;
	});
}
/// * `writer = ez.devices.buffer.writer(options)`  
///   creates an EZ writer that collects data into an buffer.  
///   `writer.write(_, data)` will write asynchronously by default.  
///   You can force synchronous write by setting `options.sync` to `true`.
///   `writer.toBuffer()` returns the internal buffer into which the 
///   chunks have been collected.
export function writer(options?: Options) {
	return new BufferWriter(options || {});
}
