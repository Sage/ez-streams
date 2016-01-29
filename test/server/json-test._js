"use strict";
QUnit.module(module.id);
const ez = require('../..');
const file = ez.devices.file;
const jsonTrans = ez.transforms.json;

const inputFile = require('os').tmpdir() + '/jsonInput.json';
const outputFile = require('os').tmpdir() + '/jsonOutput.json';
const fs = require('fs');
const string = ez.devices.string;

const mixedData = '[' + //
'{ "firstName": "Jimy", "lastName": "Hendrix" },' + //
'\n { "firstName": "Jim", "lastName": "Morrison" },' + //
'\n"\\\"escape\\ttest",' + //
'\n"people are strange", 27, null,' + //
'\n { "firstName": "Janis", ' + //
'\n    "lastName": "Joplin" },' + //
'\n[1,2, 3, ' + //
'\n 5, 8, 13],' + //
'\n true]';

function nodeStream(_, text) {
	fs.writeFile(inputFile, text, "utf8", _);
	return file.text.reader(inputFile);
}

asyncTest("empty", 1, (_) => {
	const stream = nodeStream(_, '[]').transform(jsonTrans.parser());
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("mixed data with node node stream", 9, (_) => {
	const stream = nodeStream(_, mixedData);
	const expected = JSON.parse(mixedData);
	stream.transform(jsonTrans.parser()).forEach(_, function(_, elt, i) {
		deepEqual(elt, expected[i], expected[i]);
	});
	start();
});

asyncTest("fragmented read", 9, (_) => {
	const stream = string.reader(mixedData, 2).transform(jsonTrans.parser());
	const expected = JSON.parse(mixedData);
	stream.forEach(_, function(_, elt, i) {
		deepEqual(elt, expected[i], expected[i]);
	});
	start();
});

asyncTest("binary input", 9, (_) => {
	const stream = ez.devices.buffer.reader(new Buffer(mixedData, 'utf8')).transform(jsonTrans.parser());
	const expected = JSON.parse(mixedData);
	stream.forEach(_, function(_, elt, i) {
		deepEqual(elt, expected[i], expected[i]);
	});
	start();
});

asyncTest("roundtrip", 11, (_) => {
	const writer = string.writer();
	nodeStream(_, mixedData).transform(jsonTrans.parser()).map(function(_, elt) {
		return (elt && elt.lastName) ? elt.lastName : elt;
	}).transform(jsonTrans.formatter()).pipe(_, writer);
	const result = JSON.parse(writer.toString());
	const expected = JSON.parse(mixedData).map(function(elt) {
		return (elt && elt.lastName) ? elt.lastName : elt;
	});
	ok(Array.isArray(result), "isArray");
	equal(result.length, expected.length, "length=" + result.length)
	result.forEach(function(elt, i) {
		deepEqual(result[i], elt, elt);
	});
	start();
});
