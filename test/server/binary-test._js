"use strict";
QUnit.module(module.id);

var ez = require("ez-streams");
var TESTBUF = new Buffer([1, 4, 9, 16, 25, 36, 49, 64, 81, 100]);

function eqbuf(b1, b2) {
	equals(b1.toString('hex'), b2.toString('hex'));
}

asyncTest("roundtrip", 13, function(_) {
	var dst = ez.devices.buffer.writer();
	var writer = ez.helpers.binary.writer(dst, { bufsize: 3 });
	writer.write(_, TESTBUF);
	writer.writeInt8(_, 1);
	writer.writeInt16(_, 2);
	writer.writeInt32(_, 3);
	writer.writeFloat(_, 0.5);
	writer.writeDouble(_, 0.125);
	writer.writeInt8(_, 5);
	writer.write(_);
	var result = dst.toBuffer();

	var src = ez.devices.buffer.reader(result).transform(ez.transforms.cut(5));
	var reader = ez.helpers.binary.reader(src);
	eqbuf(reader.read(_, 7), TESTBUF.slice(0, 7), 'read 7');
	reader.unread(3);
	eqbuf(reader.peek(_, 5), TESTBUF.slice(4, 9), 'unread 3 then peek 5');
	eqbuf(reader.read(_, 6), TESTBUF.slice(4), 'read 6');
	equals(reader.readInt8(_), 1, 'int8 roundtrip');
	equals(reader.peekInt16(_), 2, 'int16 roundtrip (peek)');
	equals(reader.readInt16(_), 2, 'int16 roundtrip');
	equals(reader.readInt32(_), 3, 'int32 roundtrip');
	equals(reader.readFloat(_), 0.5, 'float roundtrip');
	equals(reader.peekDouble(_), 0.125, 'double roundtrip (peek)');
	equals(reader.readDouble(_), 0.125, 'double roundtrip');
	reader.unreadDouble();
	equals(reader.readDouble(_), 0.125, 'double roundtrip (after unread)');
	equals(reader.readInt8(_), 5, 'int8 roundtrip again');
	equals(reader.read(_), undefined, 'EOF roundtrip');
	start();
});
