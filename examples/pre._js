"use strict";

var std = require('ez-streams').devices.std;

function upper(_, str) {
	return str.toUpperCase();
}

var out = std.out('utf8').pre('map', upper);

std.in('utf8').pipe(_, out);