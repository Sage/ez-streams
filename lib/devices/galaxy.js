"use strict";

var generic = require('./generic');
try {
	// test ES6-generators silently with eval (require always outputs a message if error)
	eval("(function*(){})"); 
} catch (ex) { return; }
var galaxy = require('galaxy');

// not supported in streamline fast modes
if (/-fast$/.test(require('streamline/lib/globals').runtime)) return;

module.exports = {
	/// !doc
	/// ## Stream constructors for galaxy
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.galaxy.reader(readStar[, stop])`  
	///   creates an EZ reader from a given `readStar()` function* and an optional `stop([arg])` function.
	reader: function(read, stop) {
		return generic.reader(galaxy.unstar(read, -1), stop);
	},

	/// * `writer = ez.devices.galaxy.writer(write)`  
	///   creates an ES writer from a given `write(_, val)` function.
	writer: function(write) {
		return generic.writer(galaxy.unstar(write, -1));
	},
};