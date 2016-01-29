"use strict";
QUnit.module(module.id);
var ez = require("../..");
var csv = ez.transforms.csv;
var string = ez.devices.string;

var legends = 'firstName,lastName,gender,dob\n' + //
	'Jimi,Hendrix,M,27-11-1942\n' + //
	'Janis,Joplin,F,19-01-1943\n' + //
	'Jim,Morrison,M,08-12-1943\n' + //
	'Kurt,Cobain,M,20-02-1967\n';

asyncTest("roundtrip", 1, function(_) {
	var sink = string.writer();
	string.reader(legends).transform(csv.parser()).transform(csv.formatter()).pipe(_, sink);
	equal(sink.toString(), legends);
	start();
});

asyncTest("binary input", 1, function(_) {
	var sink = string.writer();
	ez.devices.buffer.reader(new Buffer(legends, 'utf8')).transform(csv.parser()).transform(csv.formatter()).pipe(_, sink);
	equal(sink.toString(), legends);
	start();
});
