"use strict";
var fs = require("fs");
var ez = require('ez-streams');

function bench(_, name, fn) {
	var max = 1;
	while (true) {
		var t0 = Date.now();
		var result = fn(_, max);
		if (result !== dummy(_, max - 1)) throw new Error(name + ": bad result: " + result);
		var dt = (Date.now() - t0);
		if (dt > 100) {
			dt = Math.round(dt * 1000 * 1000 / max);
			var s = dt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			console.log(name + "\t" + s + " ns");
			return;
		}
		max *= 2;
	}
}

function dummy(_, i) {
	return 3 * i;
}

function myReader(max) {
	var i = 0;
	return ez.devices.generic.reader(function read(_) {
		return i++ < max ? dummy(_, i - 1) : undefined;
	});
}

var benches = {
	'streamline dummy loop': {
		fn: function(_, max) {
			var result;
			for (var i = 0; i < max; i++) result = dummy(_, i);
			return result;
		},
		time: 2
	},
	'streamline bound dummy loop': {
		fn: function(_, max) {
			var result;
			for (var i = 0; i < max; i++) result = [dummy][0](_, i);
			return result;
		},
		time: 24
	},
	'callbacks loop nextTick': {
		fn: function(cb, max) {
			var i = 0;

			function next() {
				if (++i < max) process.nextTick(next);
				else dummy(cb, i - 1);
			}
			next();
		},
		time: 24
	},
	'streamline loop nextTick': {
		fn: function(_, max) {
			var i = 0;
			for (var i = 0; i < max; i++) process.nextTick(_);
			return dummy(_, i - 1);
		},
		time: 681
	},
	'reader with read loop': {
		fn: function(_, max) {
			var rd = myReader(max * 2);
			var result;
			for (var i = 0; i < max; i++) result = rd.read(_);
			return result;
		},
		time: 10
	},
	'reader with limit': {
		fn: function(_, max) {
			var result;
			myReader(max * 2).limit(max).forEach(_, function(_, val) {
				result = val;
			});
			return result;
		},
		time: 3326
	},
	'reader with filter': {
		fn: function(_, max) {
			var result;
			myReader(max).filter((_) => true).forEach(_, function(_, val) {
				result = val;
			});
			return result;
		},
		time: 1735
	},
	'reader with limit and filter': {
		fn: function(_, max) {
			var result;
			myReader(max * 2).limit(max).filter((_) => true).forEach(_, function(_, val) {
				result = val;
			});
			return result;
		},
		time: 3724
	},
};

Object.keys(benches).forEach_(_, function(_, name) {
	bench(_, name, benches[name].fn)
});