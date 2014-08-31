"use strict";

var fs = require("fs");
var node = require("./node");
var generic = require("./generic");

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

	},
	/// * `reader = ez.devices.file.list(path, options)`  
	///   creates a reader that enumerates (recursively) directories and files.  
	///   Returns the entries as { path: path, name: name, depth: depth, stat: stat } objects.  
	///   options may be an accept function which will be called as `accept(_, entry)` and 
	///   will control whether files or subdirectories will be included in the list or not.  
	list: function(path, options) {
		options = options || {};
		var accept = typeof options === 'function' ? options : options.accept;
		return generic.empty.reader.transform(function(_, reader, writer) {
			function process(_, p, name, depth) {
				var stat = fs.stat(p, ~_);
				var entry = {
					path: p,
					name: name,
					depth: depth,
					stat: stat,
				};
				if (accept && !accept(_, entry)) return;
				writer.write(_, entry);
				if (stat.isDirectory()) fs.readdir(p, _).forEach_(_, function(_, pp) {
					process(_, p + '/' + pp, pp, depth + 1);
				});
			}
			process(_, path, path.substring(path.lastIndexOf('/') + 1), 0);
		});
	},
}