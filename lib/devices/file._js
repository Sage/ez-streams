"use strict";

var fs = require("fs");
var node = require("./node");

module.exports = {
	/// !doc
	/// ## File based EZ streams
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	text: {
		/// * `reader = ez.devices.file.text.reader(path, encoding)`  
		///   creates an EZ reader that reads from a text file.    
		///   `encoding` is optional. It defaults to `'utf8'`.  
		reader: function(path, encoding) {
			return node.reader(fs.createReadStream(path, {
				encoding: encoding || 'utf8'
			}));
		},
		/// * `writer = ez.devices.file.text.writer(path, encoding)`  
		///   creates an EZ writer that writes to a text file.    
		///   `encoding` is optional. It defaults to `'utf8'`.  
		writer: function(path, encoding) {
			return node.writer(fs.createWriteStream(path, {
				encoding: encoding || 'utf8'
			}));
		},
	},
	binary: {
		/// * `reader = ez.devices.file.binary.reader(path)`  
		///   creates an EZ reader that reads from a binary file.    
		reader: function(path) {
			return node.reader(fs.createReadStream(path));
		},
		/// * `writer = ez.devices.file.binary.writer(path)`  
		///   creates an EZ writer that writes to a binary file.    
		writer: function(path, encoding) {
			return node.writer(fs.createWriteStream(path));
		},

	}
}