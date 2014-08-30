"use strict";

var generic = require('./generic');
try {
	// test ES6-generators silently with eval (require always outputs a message if error)
	eval("(function*(){})"); 
} catch (ex) { return; }
var galaxy = require('galaxy');

module.exports = {
	/// !doc
	/// ## Stream constructors for galaxy
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.galaxy.reader(readStar)`  
	///   creates an EZ reader from a given `readStar()` function*.
	reader: function(read) {
		return generic.reader(galaxy.unstar(read, -1));
	},

	/// * `writer = ez.devices.galaxy.writer(write)`  
	///   creates an ES writer from a given `write(_, val)` function.
	writer: function(write) {
		return generic.writer(galaxy.unstar(write, -1));
	},
};