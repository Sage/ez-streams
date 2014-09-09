"use strict";

var node = require('./node');

module.exports = {
	/// !doc
	/// ## EZ Stream wrappers for node child processes
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.child_process.reader(proc, options)`  
	///   wraps a node.js child process as an EZ reader.  
	///   For a full description of the options, see `ReadableStream` in
	///   https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
	reader: function(proc, options) {
		var stdout = node.reader(proc.stdout, options);
		var stderr = node.reader(proc.stderr, options);
		if (options.dataHandler) stdout = options.dataHandler(stdout);
		if (options.errorHandler) stderr = options.errorHandler(stderr);
		if (options.errorPrefix || options.errorThrow) stderr = stderr.map(function(_, data) {
			if (options.errorThrow) throw new Error((options.errorPrefix || "") + data);
			return options.errorPrefix + data;
		});
		return stdout.join(stderr);
	},
	/// * `writer = ez.devices.child_process.writer(proc, options)`  
	///   wraps a node.js child process as an EZ writer.  
	///   For a full description of the options, see `WritableStream` in
	///   https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
	writer: function(proc, options) {
		return node.writer(proc.stdin, options);
	},
};
