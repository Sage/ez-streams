"use strict";
QUnit.module(module.id);

var ez = require("ez-streams");

asyncTest("put (lossy)", 7, function(_) {
	var queue = ez.devices.queue({
		max: 4
	});
	for (var i = 0; i < 6; i++) {
		var queued = queue.put(i);
		ok(queued === (i < 4), "put return value: " + queued);
	}
	queue.end();
	var result = queue.reader.toArray(_);
	equal(result.join(','), "0,1,2,3", 'partial queue contents ok');
	start();
});

asyncTest("write (lossless)", 1, function(_) {
	var queue = ez.devices.queue({
		max: 4
	});
	var writeTask = (function(_) {
		for (var i = 0; i < 6; i++) queue.write(_, i);
		queue.write(_);
	})(!_);
	var readTask = (function(_) {
		return queue.reader.toArray(_);
	})(!_);

	writeTask(_);
	equal(readTask(_).join(','), "0,1,2,3,4,5", 'full queue contents ok');
	start();
});