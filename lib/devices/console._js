"use strict";

var generic = require('./generic');

function consoleWriter(name) {
	return generic.writer(function(_, value) {
		if (value !== undefined) console[name](value);
	});
}

/// * `console.log`  
/// * `console.info`  
/// * `console.warn`  
/// * `console.errors`  
///   Writable streams for console 
module.exports = {
	log: consoleWriter("log"),
	info: consoleWriter("info"),
	warn: consoleWriter("warn"),
	error: consoleWriter("error"),
};