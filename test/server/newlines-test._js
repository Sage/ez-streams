"use strict";
QUnit.module(module.id);
var ez = require("../..");
var lines = ez.transforms.lines;
var file = ez.devices.file;

var inputFile = require('os').tmpdir() + '/jsonInput.json';
var outputFile = require('os').tmpdir() + '/jsonOutput.json';
var fs = require('fs');
var string = ez.devices.string;

function nodeStream(_, text) {
	fs.writeFile(inputFile, text, "utf8", _);
	return file.text.reader(inputFile);
}

asyncTest("empty", 1, function(_) {
	var stream = nodeStream(_, '').transform(lines.parser());
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("non empty line", 2, function(_) {
	var stream = nodeStream(_, 'a').transform(lines.parser());
	strictEqual(stream.read(_), 'a', "a");
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("only newline", 2, function(_) {
	var stream = nodeStream(_, '\n').transform(lines.parser());
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("mixed", 5, function(_) {
	var stream = nodeStream(_, 'abc\n\ndef\nghi').transform(lines.parser());
	strictEqual(stream.read(_), 'abc', 'abc');
	strictEqual(stream.read(_), '', "empty line");
	strictEqual(stream.read(_), 'def', 'def');
	strictEqual(stream.read(_), 'ghi', 'ghi');
	strictEqual(stream.read(_), undefined, "undefined");
	start();
});

asyncTest("roundtrip", 1, function(_) {
	var writer = string.writer();
	var text = 'abc\n\ndef\nghi';
	string.reader(text, 2).transform(lines.parser()).transform(lines.formatter()).pipe(_, writer);
	strictEqual(writer.toString(), text, text);
	start();
});
