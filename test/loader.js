"use strict";
// install streamline hooks (only if files are not precompiled)
if (/[\\\/]test$/.test(__dirname)) require('streamline').register();

// patch asyncTest because streamline test function needs a callback.
var original = global.asyncTest;
global.asyncTest = function(name, expect, fn) {
	if (typeof expect === 'function') {
		fn = expect;
		expect = null;
	}
	original(name, expect, function() {
		fn(function(err) {
			if (err) throw err;
		});
	});
}