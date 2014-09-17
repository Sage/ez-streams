"use strict";
QUnit.module(module.id);

var ez = require("ez-streams");

asyncTest("roundtrip", 7, function(_) {
	var dst = ez.devices.buffer.writer();
	var writer = ez.helpers.binary.writer(dst, { bufsize: 3 });
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
	equals(reader.readInt8(_), 1, 'int8 roundtrip');
	equals(reader.readInt16(_), 2, 'int16 roundtrip');
	equals(reader.readInt32(_), 3, 'int32 roundtrip');
	equals(reader.readFloat(_), 0.5, 'float roundtrip');
	equals(reader.readDouble(_), 0.125, 'double roundtrip');
	equals(reader.readInt8(_), 5, 'int8 roundtrip again');
	equals(reader.read(_), undefined, 'EOF roundtrip');
	start();
});
