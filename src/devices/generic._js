"use strict";

var empty = {
	reader: require('../reader').create(function(_) {}),
	writer: require('../writer').create(function(_, value) {}),
};

module.exports = {
	/// !doc
	/// ## Generic stream constructors
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.generic.reader(read[, stop])`  
	///   creates an EZ reader from a given `read(_)` function and an optional `stop(_, [arg])` function.
	reader: function(read, stop) {
		return require('../reader').create(read, stop);
	},

	/// * `writer = ez.devices.generic.writer(write)`  
	///   creates an ES writer from a given `write(_, val)` function.
	writer: function(write, stop) {
		return require('../writer').create(write, stop);
	},

	/// ## Special streams
	/// 
	/// * `ez.devices.generic.empty`  
	///   The empty stream. `empty.read(_)` returns `undefined`.
	///   It is also a null sink. It just discards anything you would write to it.
	empty: empty,
};