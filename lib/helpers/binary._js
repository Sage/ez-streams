"use strict";
/// !doc
/// ## helpers for binary streams
/// 
/// `var ez = require("ez-streams")`  
/// 

var NUMBERS = [['Int8', 1], ['Int16', 2], ['Int32', 4], ['Float', 4], ['Double', 8]];


function Reader(reader, options) {
	this.reader = reader;
	this.options = options;
	this.pos = 0;
	this.buf = new Buffer(0);
}

function Writer(writer, options) {
	this.writer = writer;
	this.options = options;
	this.pos = 0;
	this.buf = new Buffer(options.bufSize > 0 ? options.bufSize : 1024);
}

Reader.prototype.ensure = function(_, len) {
	if (this.buf === undefined) return false;
	if (this.pos + len <= this.buf.length) return len;
	var got = this.buf.length - this.pos;
	var bufs = got ? [this.buf.slice(this.pos)] : [];
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

Reader.prototype.read = function(_, len) {
	if (len === undefined) {
		if (this.pos < this.buf.length) return this.read(_, this.buf.length - this.pos);
		else {
			this.buf = this.reader.read(_);
			this.pos = this.buf ? this.buf.length : 0;
			return this.buf;
		}
	}
	var l = this.ensure(_, len);
	if (l === 0 && len > 0) return undefined;
	var result = this.buf.slice(this.pos, this.pos + l);
	this.pos += l;
	return result;
}

function intReader(name, len) {
	return function(_) {
		var got = this.ensure(_, len);
		if (got === 0) return undefined;
		if (got < len) throw new Error("unexpected EOF: expected " + len + ", got " + got);
		var result = this.buf[name](this.pos);
		this.pos += len;
		return result;
	};
}

Writer.prototype.flush = function(_) {
	this.writer.write(_, this.buf.slice(0, this.pos));
	this.pos = 0;
}

Writer.prototype.ensure = function(_, len) {
	if (this.pos + len > this.buf.length) {
		this.flush(_);
		if (len > this.buf.length) this.buf = new Buffer(len);
	}
}

Writer.prototype.write = function(_, buf) {
	if (buf === undefined || buf.length > this.buf.length) {
		this.flush(_);
		this.writer.write(_, buf);
	} else {
		this.ensure(_, buf.length);
		buf.copy(this.buf, 0);
		this.pos = buf.length;
	}
}

function intWriter(name, len) {
	return function(_, val) {
		this.ensure(_, len);
		this.buf[name](val, this.pos);
		this.pos += len;
	};
}

NUMBERS.forEach(function(pair) {
	var len = pair[1];
	var names = len > 1 ? [pair[0] + 'BE', pair[0] + 'LE'] : [pair[0]];
	names.forEach(function(name) {
		Reader.prototype['read' + name] = intReader('read' + name, len);
		Reader.prototype['readU' + name] = intReader('readU' + name, len);
		Writer.prototype['write' + name] = intWriter('write' + name, len);
		Writer.prototype['writeU' + name] = intWriter('writeU' + name, len);
	});
});

function makeEndian(base, verb, suffix) {
	var construct = function() {
		base.apply(this, arguments);
	}
	construct.prototype = Object.create(base.prototype);
	NUMBERS.slice(1).forEach(function(pair) {
		construct.prototype[verb + pair[0]] = base.prototype[verb + pair[0] + suffix];
		construct.prototype[verb + 'U' + pair[0]] = base.prototype[verb + 'U' + pair[0] + suffix];
	});
	return construct;
}

var ReaderLE = makeEndian(Reader, 'read', 'LE');
var ReaderBE = makeEndian(Reader, 'read', 'BE');
var WriterLE = makeEndian(Writer, 'write', 'LE');
var WriterBE = makeEndian(Writer, 'write', 'BE');

module.exports = {
	/// * `mapper = ez.mappers.convert.stringify(encoding)`  
	///   returns a mapper that converts to string
	reader: function(reader, options) {
		options = options || {};
		return new (options.endian === 'little' ? ReaderLE : ReaderBE)(reader, options);
	},
	/// * `mapper = ez.mappers.convert.bufferify(encoding)`  
	///   returns a mapper that converts to buffer
	writer: function(writer, options) {
		options = options || {};
		return new (options.endian === 'little' ? WriterLE : WriterBE)(writer, options);
	},
}