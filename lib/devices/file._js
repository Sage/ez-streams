"use strict";

var fs = require("fs");
var node = require("./node");

module.exports = {
	/// !doc
	/// ## File based ES streams
	/// 
	/// `var ezs = require('ez-streams');`
	/// 
	text: {
		/// * `reader = ezs.devices.file.text.reader(path, encoding)`  
		///   creates an EZ reader that reads from a text file.    
		///   `encoding` is optional. It defaults to `'utf8'`.  
		reader: function(path, encoding) {
			return node.reader(fs.createReadStream(path, {
				encoding: encoding || 'utf8'
			}));
		},
		/// * `writer = ezs.devices.file.text.writer(path, encoding)`  
		///   creates an EZ writer that writes to a text file.    
		///   `encoding` is optional. It defaults to `'utf8'`.  
		writer: function(path, encoding) {
			return node.writer(fs.createWriteStream(path, {
				encoding: encoding || 'utf8'
			}));
		},
	},
	binary: {
		/// * `reader = ezs.devices.file.binary.reader(path)`  
		///   creates an EZ reader that reads from a binary file.    
		reader: function(path) {
			return node.reader(fs.createReadStream(path));
		},
		/// * `writer = ezs.devices.file.binary.writer(path)`  
		///   creates an EZ writer that writes to a binary file.    
		writer: function(path, encoding) {
			return node.writer(fs.createWriteStream(path));
		},

	}
}