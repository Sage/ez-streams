"use strict";
/// !doc
/// ## Encoding mappers
/// 
/// `const ez = require("ez-streams")`  
/// 

module.exports = {
	/// * `mapper = ez.mappers.convert.stringify(encoding)`  
	///   returns a mapper that converts to string
	stringify: (encoding) => {
		encoding = encoding || 'utf8';
		return (_, data) => {
			return data.toString(encoding);
		}
	},
	/// * `mapper = ez.mappers.convert.bufferify(encoding)`  
	///   returns a mapper that converts to buffer
	bufferify: (encoding) => {
		encoding = encoding || 'utf8';
		return (_, data) => {
			return new Buffer(data, encoding);
		}
	},
}