"use strict";

var std = require('ez-streams').devices.std;

std.in('utf8').map(function(cb, line) {
	switch (process.argv[2]) {
		case '-u': return cb(null, line.toUpperCase());
		case '-l': return cb(null, line.toLowerCase());
		default: return cb(null, line);
	}
}).pipe(function(err) { if (err) throw err; }, std.out('utf8'))