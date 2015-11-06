"use strict";

var fs = require('fs');
var fsp = require('path');

if (/[\\\/]test-fibers$/.test(__dirname) && /^4\./.test(process.versions.v8)) {
	console.error("skip fibers test on node 4.x for now (fibers fails on travis CI)")
	process.exit(0);
}

var tests = [];
['common', 'server'].forEach(function(subdir) {
	var root = fsp.join(__dirname, subdir);
	fs.readdirSync(root).filter(function(file) {
		return /\.js$/.test(file);
	}).forEach(function(file) {
		return tests.push(fsp.join(root, file));
	});	
});

var testrunner = require("qunit");

testrunner.run({
	code: fsp.join(__dirname, 'loader.js'),
    tests: tests,
    maxBlockDuration: 10 * 1000,
}, function(err) {
	if (err) throw err;
});
