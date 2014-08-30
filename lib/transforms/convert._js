"use strict";
/// !doc
/// ## Encoding mappers
/// 
/// `var ez = require("ez-streams")`  
/// 

var lines = require('./lines');

module.exports = {
	/// * `mapper = ez.transforms.convert.toString(encoding)`  
	///   returns a mapper that converts to string
	toString: function(encoding) {
		encoding = encoding || 'utf8';
		return function(_, data) {
			return data.toString(encoding);
		}
	},
	/// * `mapper = ez.transforms.convert.toBuffer(encoding)`  
	///   returns a mapper that converts to buffer
	toBuffer: function(encoding) {
		encoding = encoding || 'utf8';
		return function(_, data) {
			return new Buffer(data, encoding);
		}
	},
}