"use strict";
/// !doc
/// ## JSON mappers
/// 
/// `var ez = require("ez-streams")`  
/// 

module.exports = {
	/// * `mapper = ez.mappers.json.parse()`  
	///   returns a mapper that parses JSON string
	parse: function() {
		return function(_, data) {
			return JSON.parse(data);
		}
	},
	/// * `mapper = ez.mappers.json.stringify()`  
	///   returns a mapper that converts objects to JSON
	stringify: function() {
		return function(_, data) {
			return JSON.stringify(data);
		}
	},
}