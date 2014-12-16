"use strict";
QUnit.module(module.id);
var cp = require('child_process');
var ez = require('../..');
var fsp = require('path');

asyncTest("echo ok", 1, function(_) {
	var proc = cp.spawn('echo', ['hello\nworld']);
	var got = ez.devices.child_process.reader(proc).toArray(_);
	deepEqual(got, ['hello', 'world']);
	start();
});

asyncTest("bad command", 1, function(_) {
	var proc = cp.spawn(fsp.join(__dirname, 'foobar.zoo'), ['2']);
	try {
		var got = ez.devices.child_process.reader(proc).toArray(_);
		ok(false);
	} catch (ex) {
		equal(ex.code, -1);
	}
	start();
});

asyncTest("exit 2", 1, function(_) {
	var proc = cp.spawn(fsp.join(__dirname, '../fixtures/exit2.sh'), ['2']);
	try {
		var got = ez.devices.child_process.reader(proc).toArray(_);
		ok(false);
	} catch (ex) {
		equal(ex.code, 2);
	}
	start();
});