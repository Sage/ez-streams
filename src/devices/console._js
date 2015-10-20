"use strict";

var generic = require('./generic');

function consoleWriter(name) {
	return generic.writer(function(_, value) {
		if (value !== undefined) console[name](value);
	});
}

/// !doc
/// ## Console EZ streams
/// 
/// `var ez = require('ez-streams');`
/// 
/// * `ez.devices.console.log`  
/// * `ez.devices.console.info`  
/// * `ez.devices.console.warn`  
/// * `ez.devices.console.errors`  
///   EZ writers for console 
module.exports = {
	log: consoleWriter("log"),
	info: consoleWriter("info"),
	warn: consoleWriter("warn"),
	error: consoleWriter("error"),
};