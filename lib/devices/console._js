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
/// `var ezs = require('ez-streams');`
/// 
/// * `ezs.devices.console.log`  
/// * `ezs.devices.console.info`  
/// * `ezs.devices.console.warn`  
/// * `ezs.devices.console.errors`  
///   EZ writers for console 
module.exports = {
	log: consoleWriter("log"),
	info: consoleWriter("info"),
	warn: consoleWriter("warn"),
	error: consoleWriter("error"),
};