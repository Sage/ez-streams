/// !doc
/// ## helpers for binary streams
/// 
/// `const ez = require("ez-streams")`  
import { _ } from "streamline-runtime";
import { Reader as BaseReader } from "../reader";
import { Writer as BaseWriter } from "../writer";

const NUMBERS: [string, number][] = [//
['Int8', 1], ['UInt8', 1], //
['Int16', 2], ['UInt16', 2], //
['Int32', 4], ['UInt32', 4], //
['Float', 4], ['Double', 8]];

/// 
/// ----
/// 
/// * `reader = ez.helpers.binary.reader(reader, options)`  
///   Wraps a raw buffer reader and returns a reader with additional API to handle binary streams.  
///   By default the reader is configured as big endian.  
///   You can configure it as little endian by setting the `endian` option to `"little"`.
export interface ReaderOptions {
	endian?: 'big' | 'little';
}
export class Reader extends BaseReader<Buffer> {
	reader: BaseReader<Buffer>;
	options: ReaderOptions;
	pos: number;
	buf: Buffer;
	constructor(reader: BaseReader<Buffer>, options: ReaderOptions) {
		/// 
		/// * `buf = reader.read(_, len)`  
		///   returns the `len` next bytes of the stream.  
		///   returns a buffer of length `len`, except at the end of the stream.  
		///   The last chunk of the stream may have less than `len` bytes and afterwards the call
		///   returns `undefined`.  
		///   If the `len` parameter is omitted, the call returns the next available chunk of data.
		// peekOnly is internal and not documented
		super(function read(_) { return this.readData(_); });
		this.reader = reader;
		this.options = options;
		this.pos = 0;
		this.buf = new Buffer(0);
		// override read for compat
		this.read = this.readData;
	}
	readData(_: _, len?: number, peekOnly?: boolean): Buffer {
		if (len === undefined) {
			if (this.pos < this.buf.length) return this.readData(_, this.buf.length - this.pos);
			else {
				this.buf = this.reader.read(_);
				this.pos = this.buf && !peekOnly ? this.buf.length : 0;
				return this.buf;
			}
		}
		const l = this.ensure(_, len);
		if (l === 0 && len > 0) return undefined;
		const result = this.buf.slice(this.pos, this.pos + l);
		if (!peekOnly) this.pos += l;
		return result;
	}

	// internal API
	ensure(_: _, len: number) {
		if (this.buf === undefined) return 0;
		if (this.pos + len <= this.buf.length) return len;
		var got = this.buf.length - this.pos;
		const bufs = got ? [this.buf.slice(this.pos)] : [];
		this.pos = 0;
		while (got < len) {
			var buf = this.reader.read(_);
			if (buf === undefined) {
				if (bufs.length === 0) return 0;
				else break;
			}
			bufs.push(buf);
			got += buf.length;
		}
		this.buf = Buffer.concat(bufs);
		return Math.min(this.buf.length, len);
	}

	/// 
	/// * `buf = reader.peek(_, len)`  
	///   Same as `read` but does not advance the read pointer.  
	///   Another `read` would read the same data again.
	peek(_: _, len: number) {
		return this.readData(_, len, true);
	}

	/// 
	/// * `reader.unread(len)`  
	///   Unread the last `len` bytes read.  
	///   `len` cannot exceed the size of the last read.
	unread(len: number) {
		if (!(len <= this.pos)) throw new Error("invalid unread: expected <= " + this.pos + ", got " + len);
		this.pos -= len;
	}
}
/// 
/// * `val = reader.readInt8(_)`  
/// * `val = reader.readUInt8(_)`  
/// * `val = reader.readInt16(_)`  
/// * `val = reader.readUInt16(_)`  
/// * `val = reader.readInt32(_)`  
/// * `val = reader.readUInt32(_)`  
/// * `val = reader.readFloat(_)`  
/// * `val = reader.readDouble(_)`  
///   Specialized readers for numbers.
/// 
/// * `val = reader.peekInt8(_)`  
/// * `val = reader.peekUInt8(_)`  
/// * `val = reader.peekInt16(_)`  
/// * `val = reader.peekUInt16(_)`  
/// * `val = reader.peekInt32(_)`  
/// * `val = reader.peekUInt32(_)`  
/// * `val = reader.peekFloat(_)`  
/// * `val = reader.peekDouble(_)`  
///   Specialized peekers for numbers.
function numberReader(name: string, len: number, peekOnly?: boolean) {
	return function(_: _) {
		const got = this.ensure(_, len);
		if (got === 0) return undefined;
		if (got < len) throw new Error("unexpected EOF: expected " + len + ", got " + got);
		const result = this.buf[name](this.pos);
		if (!peekOnly) this.pos += len;
		return result;
	};
}

/// * `val = reader.unreadInt8()`  
/// * `val = reader.unreadUInt8()`  
/// * `val = reader.unreadInt16()`  
/// * `val = reader.unreadUInt16()`  
/// * `val = reader.unreadInt32()`  
/// * `val = reader.unreadUInt32()`  
/// * `val = reader.unreadFloat()`  
/// * `val = reader.unreadDouble()`  
///   Specialized unreaders for numbers.
function numberUnreader(len: number) {
	return function() {
		return this.unread(len);
	};
}

/// 
/// ----
/// 
/// * `writer = ez.helpers.binary.writer(writer, options)`  
///   Wraps a raw buffer writer and returns a writer with additional API to handle binary streams.
///   By default the writer is configured as big endian.  
///   You can configure it as little endian by setting the `endian` option to `"little"`.  
///   The `bufSize` option controls the size of the intermediate buffer.
export interface WriterOptions {
	endian?: 'big' | 'little';
	bufSize?: number;
}

export class Writer extends BaseWriter<Buffer> {
	writer: BaseWriter<Buffer>;
	options: WriterOptions;
	pos: number;
	buf: Buffer;
	constructor(writer: BaseWriter<Buffer>, options?: WriterOptions) {
		super(function write(_: _, buf: Buffer) {
			this.writeDate(_, buf);
			return this;
		});
		options = options || {};
		this.writer = writer;
		this.options = options;
		this.pos = 0;
		this.buf = new Buffer(options.bufSize > 0 ? options.bufSize : 16384);
	}
		

	/// 
	/// * `writer.flush(_)`  
	///   Flushes the buffer to the wrapped writer.
	flush(_: _) {
		if (this.pos > 0) this.writer.write(_, this.buf.slice(0, this.pos));
		// reallocate the buffer because existing buffer belongs to this.writer now.
		this.buf = new Buffer(this.buf.length);	
		this.pos = 0;
	}

	// internal call
	ensure(_: _, len: number) {
		if (this.pos + len > this.buf.length) {
			this.flush(_);
			if (len > this.buf.length) this.buf = new Buffer(len);
		}
	}

	/// 
	/// * `writer.write(_, buf)`  
	///   Writes `buf`.  
	///   Note: writes are buffered.  
	///   Use the `flush(_)` call if you need to flush before the end of the stream.
	writeDate(_: _, buf: Buffer) {
		if (buf === undefined || buf.length > this.buf.length) {
			this.flush(_);
			this.writer.write(_, buf);
		} else {
			this.ensure(_, buf.length);
			buf.copy(this.buf, this.pos);
			this.pos += buf.length;
		}
	}
}

/// 
/// * `writer.writeInt8(_, val)`  
/// * `writer.writeUInt8(_, val)`  
/// * `writer.writeInt16(_, val)`  
/// * `writer.writeUInt16(_, val)`  
/// * `writer.writeInt32(_, val)`  
/// * `writer.writeUInt32(_, val)`  
/// * `writer.writeFloat(_, val)`  
/// * `writer.writeDouble(_, val)`  
///   Specialized writers for numbers.
function numberWriter(name: string, len: number) {
	return function(_: _, val: number) {
		this.ensure(_, len);
		this.buf[name](val, this.pos);
		this.pos += len;
	};
}

NUMBERS.forEach(function(pair) {
	const len = pair[1];
	const names = len > 1 ? [pair[0] + 'BE', pair[0] + 'LE'] : [pair[0]];
	const readerProto: any = Reader.prototype;
	const writerProto: any = Writer.prototype;
	names.forEach(function(name) {
		readerProto['read' + name] = numberReader('read' + name, len, false);
		readerProto['peek' + name] = numberReader('read' + name, len, true);
		readerProto['unread' + name] = numberUnreader(len);
		writerProto['write' + name] = numberWriter('write' + name, len);
	});
});

function makeEndian(base: Function, verbs: string[], suffix: string) {
	const construct = function() {
		base.apply(this, arguments);
	}
	construct.prototype = Object.create(base.prototype);
	NUMBERS.slice(1).forEach(function(pair) {
		verbs.forEach(function(verb) {
			construct.prototype[verb + pair[0]] = base.prototype[verb + pair[0] + suffix];
		});
	});
	return construct;
}

// TODO: add ambient definitions for all generated methods
require('../reader').decorate(Reader.prototype);
require('../writer').decorate(Writer.prototype);
const ReaderLE = makeEndian(Reader, ['read', 'peek', 'unread'], 'LE');
const ReaderBE = makeEndian(Reader, ['read', 'peek', 'unread'], 'BE');
const WriterLE = makeEndian(Writer, ['write'], 'LE');
const WriterBE = makeEndian(Writer, ['write'], 'BE');

// Documentation above, next to the constructor
export function reader(reader: BaseReader<Buffer>, options?: ReaderOptions) : Reader {
	options = options || {};
	const constr: any = options.endian === 'little' ? ReaderLE : ReaderBE;
	return new constr(reader, options);
}

export function	writer(writer: BaseWriter<Buffer>, options?: WriterOptions) : Writer {
	options = options || {};
	const constr: any = options.endian === 'little' ? WriterLE : WriterBE;
	return new constr(writer, options);
}