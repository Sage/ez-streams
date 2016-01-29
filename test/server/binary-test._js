"use strict";
QUnit.module(module.id);

const ez = require("../..");
const TESTBUF = new Buffer([1, 4, 9, 16, 25, 36, 49, 64, 81, 100]);

function eqbuf(b1, b2, msg) {
	equal(b1.toString('hex'), b2.toString('hex'), msg);
}

asyncTest("roundtrip", 52, (_) => {
	[1, 4, 11, 1000].forEach_(_, function(_, size) {
		const dst = ez.devices.buffer.writer();
		const writer = ez.helpers.binary.writer(dst, {
			bufSize: size
		});
		writer.write(_, TESTBUF);
		writer.writeInt8(_, 1);
		writer.writeInt16(_, 2);
		writer.writeInt32(_, 3);
		writer.writeFloat(_, 0.5);
		writer.writeDouble(_, 0.125);
		writer.writeInt8(_, 5);
		writer.write(_);
		const result = dst.toBuffer();

		const src = ez.devices.buffer.reader(result).transform(ez.transforms.cut(5));
		const reader = ez.helpers.binary.reader(src);
		eqbuf(reader.read(_, 7), TESTBUF.slice(0, 7), 'read 7 (size=' + size + ')');
		reader.unread(3);
		eqbuf(reader.peek(_, 5), TESTBUF.slice(4, 9), 'unread 3 then peek 5');
		eqbuf(reader.read(_, 6), TESTBUF.slice(4), 'read 6');
		equal(reader.readInt8(_), 1, 'int8 roundtrip');
		equal(reader.peekInt16(_), 2, 'int16 roundtrip (peek)');
		equal(reader.readInt16(_), 2, 'int16 roundtrip');
		equal(reader.readInt32(_), 3, 'int32 roundtrip');
		equal(reader.readFloat(_), 0.5, 'float roundtrip');
		equal(reader.peekDouble(_), 0.125, 'double roundtrip (peek)');
		equal(reader.readDouble(_), 0.125, 'double roundtrip');
		reader.unreadDouble();
		equal(reader.readDouble(_), 0.125, 'double roundtrip (after unread)');
		equal(reader.readInt8(_), 5, 'int8 roundtrip again');
		equal(reader.read(_), undefined, 'EOF roundtrip');
	})
	start();
});