"use strict";
var ezs = require("ez-streams");

var numberReader = function(n) {
	var i = 0;
	return ezs.devices.generic.reader(function read(_) {
		if (i < n) return i++;
		else return undefined;
	});
};

console.log("pi~=" + 4 * numberReader(10000).filter(function(_, n) {
	return n % 2; // keep only odd numbers
}).map(function(_, n) {
	return n % 4 === 1 ? 1 / n : -1 / n;
}).reduce(_, function(_, res, val) {
	return res + val;
}, 0));
