"use strict";
QUnit.module(module.id);
var ez = require("ez-streams");
var sample = __dirname + '/../fixtures/rss-sample.xml';
var zlib = require('zlib');

asyncTest("gzip roundtrip", 1, function(_) {
	var sampleReader1 = ez.devices.file.text.reader(sample);
	var sampleReader2 = ez.devices.file.text.reader(sample);
	var stringify = ez.mappers.convert.stringify();
	var cutter = ez.transforms.cut(10);
	var out = require('fs').createWriteStream(__dirname + '/../fixtures/rss-sample.zip');
	sampleReader2 = sampleReader2.nodeTransform(zlib.createGzip()).nodeTransform(zlib.createGunzip()).map(stringify);
	var cmp = sampleReader1.transform(cutter).compare(_, sampleReader2.transform(cutter));
	equal(cmp, 0);
	start();
});
asyncTest("writer nodify", 1, function(_) {
	var sampleReader1 = ez.devices.file.text.reader(sample);
	var sampleReader2 = ez.devices.file.text.reader(sample);
	var dest = ez.devices.string.writer();
	var expected = sampleReader2.toArray(_).join('');
	var piped = sampleReader1.nodify().pipe(dest.nodify());
	piped.on('finish', function() {
		equal(dest.toString(), expected);
		start();
	});
});
