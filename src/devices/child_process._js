"use strict";

var node = require('./node');
var generic = require('./generic');
var lineParser = require('../transforms/lines').parser();
var stringify = require('../mappers/convert').stringify();

module.exports = {
	/// !doc
	/// ## EZ Stream wrappers for node child processes
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.child_process.reader(proc, options)`  
	///   wraps a node.js child process as an EZ reader.  
	///   For a full description of the options, see `ReadableStream` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	reader: function(proc, options) {
		options = options || {};
		var err, closeCb, closed;
		proc.on('close', function(ec) {
			closed = true;
			if (ec === -1) {
				proc.stdout.emit('end');
				proc.stderr.emit('end');
			}
			if (ec && !(options.acceptCode && options.acceptCode(ec))) {
				err = new Error("process exited with code:" + ec);
				err.code = ec;
			}
			if (closeCb)
				closeCb(err);
			closeCb = null;
		});
		proc.on('error', function(e) {
			err = err || e;
		});
		var stdout = node.reader(proc.stdout, options);
		var stderr = node.reader(proc.stderr, options);
		if (options.encoding !== 'buffer') {
			stdout = stdout.map(stringify).transform(lineParser);
			stderr = stderr.map(stringify).transform(lineParser);
		}
		if (options.dataHandler) stdout = options.dataHandler(stdout);
		if (options.errorHandler) stderr = options.errorHandler(stderr);
		if (options.errorPrefix || options.errorThrow) stderr = stderr.map(function(_, data) {
			if (options.errorThrow) throw new Error((options.errorPrefix || "") + data);
			return options.errorPrefix + data;
		});
		var rd = stdout.join(stderr);
		return generic.reader(function read(_) {
			if (err) throw err;
			var data = rd.read(_);
			if (data !== undefined) return data;
			// reached end of stream - worry about close event now.
			if (closed) {
				// already got close event
				if (err) throw err;
				return undefined;
			} else {
				// wait for the close event
				(function(cb) {
					closeCb = cb;
				})(_);
			}
		}, function stop(_, arg) {
			stdout.stop(_, arg);
			stderr.stop(_, arg);
		});
	},
	/// * `writer = ez.devices.child_process.writer(proc, options)`  
	///   wraps a node.js child process as an EZ writer.  
	///   For a full description of the options, see `WritableStream` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	writer: function(proc, options) {
		return node.writer(proc.stdin, options);
	},
};
