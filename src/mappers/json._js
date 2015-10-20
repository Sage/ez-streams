"use strict";
/// !doc
/// ## JSON mappers
/// 
/// `var ez = require("ez-streams")`  
/// 

module.exports = {
	/// * `mapper = ez.mappers.json.parse()`  
	///   returns a mapper that parses JSON string.  
	///   It assumes that the stream has already been split on boundaries that delimit valid JSON strings,
	///   with an optional separator at the end.
	parse: function(options) {
		options = options || {};
		var sep = options.sep == null ? ',' : options.sep;
		return function(_, data) {
			if (data === '') return;
			// remove trailing separator, if any
			if (sep && data.substring(data.length - sep.length) === sep) data = data.substring(0, data.length - sep.length);
			return JSON.parse(data);
		}
	},
	/// * `mapper = ez.mappers.json.stringify()`  
	///   returns a mapper that converts objects to JSON.
	///   You can use a the `sep` option to specify a separator that will be added at the end of every item.
	///   By default, `sep` is `,\n`.
	stringify: function(options) {
		options = options || {};
		var sep = options.sep == null ? ',\n' : options.sep;
		return function(_, data) {
			return JSON.stringify(data, options.replacer, options.space) + sep;
		}
	},
}