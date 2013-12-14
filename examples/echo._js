"use strict";

var std = require('ez-streams').devices.std;

std.in('utf8').map(function(_, line) {
	switch (process.argv[2]) {
		case '-u': return line.toUpperCase();
		case '-l': return line.toLowerCase();
		default: return line;
	}
}).pipe(_, std.out('utf8'))