"use strict";

var streams = require('streamline-streams');
var output = require('ez-streams').devices.console.log;

function numbers() {
	var i = 0;
	return streams.reader(function read(_) {
		return i++;
	});
}

function wait(_, val) {
	setTimeout(~_, 1000);
	return val;
}

function pow(n) {
	return function(_, val) {
		return Math.pow(val, n);
	}
}

function minJoiner(_, values) {
	var min = Math.min.apply(null, values);
	values.forEach(function(val, i) {
		if (val == min) values[i] = undefined;
	});
	return min;
}

//numbers().map(pow(2)).join(numbers().map(pow(3)).limit(4)).rr().map(wait).limit(20).pipe(_, streams.console.log);

/*numbers().fork([
	function(source) { return source.map(pow(2)).limit(4); },
	function(source) { return source.map(pow(3)); },
]).rr().map(wait).limit(30).pipe(_, streams.console.log);*/

numbers().parallelize(5, function(source) {
	return source.map(pow(2)).map(wait);
}).limit(30).pipe(_, output);