"use strict";
/// !doc
/// ## Encoding mappers
/// 
/// `var ez = require("ez-streams")`  
/// 

module.exports = {
	/// * `mapper = ez.mappers.convert.stringify(encoding)`  
	///   returns a mapper that converts to string
	stringify: function(encoding) {
		encoding = encoding || 'utf8';
		return function(_, data) {
			return data.toString(encoding);
		}
	},
	/// * `mapper = ez.mappers.convert.bufferify(encoding)`  
	///   returns a mapper that converts to buffer
	bufferify: function(encoding) {
		encoding = encoding || 'utf8';
		return function(_, data) {
			return new Buffer(data, encoding);
		}
	},
}