"use strict";

const node = require('./node');
const generic = require('./generic');
const lineParser = require('../transforms/lines').parser();
const stringify = require('../mappers/convert').stringify();

const EventEmitter = require('events');

// Child process stdout and stderr don't implement the streams2 API correctly. Their read() method always retuns null!
// So, I handle them in flowing mode (streams1) and I create a small wrapper which re-exposes them as streams2.
function stream2Wrapper(stream1) {
	var chunks = [];
	var stream2 = new EventEmitter();
	stream1.on('data', chunk => {
		chunks.push(chunk);
		stream1.pause();
		stream2.emit('readable');
	});
	stream1.on('end', () => {
		chunks.push(null);
		stream2.emit('readable');
	});
	stream1.on('error', err => {
		stream2.emit('error', err);
	});
	stream2.read = function() {
		var data = chunks.shift();
		if (chunks.length === 0) stream1.resume();
		return data;
	}
	return stream2;
}

module.exports = {
	/// !doc
	/// ## EZ Stream wrappers for node child processes
	/// 
	/// `const ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.child_process.reader(proc, options)`  
	///   wraps a node.js child process as an EZ reader.  
	///   For a full description of the options, see `ReadableStream` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	reader: function(proc, options) {
		options = options || {};
		var err, closeCb, closed;
		proc.on('close', (ec) => {
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
		proc.on('error', (e) => {
			err = err || e;
		});
		var stdout = node.reader(stream2Wrapper(proc.stdout), options);
		var stderr = node.reader(stream2Wrapper(proc.stderr), options);
		// node does not send close event if we remove all listeners on stdin and stdout
		// so we disable the stop methods and we call stop explicitly after the close.
		const stops = [stdout.stop.bind(stdout), stderr.stop.bind(stderr)];
		stdout.stop = stderr.stop = (_) => {};
		function stopStreams(_, arg) {
			stops.forEach_(_, (_, stop) => {
				stop(_, arg);
			});
		}
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
		const rd = stdout.join(stderr);
		return generic.reader(function read(_) {
			if (err) throw err;
			const data = rd.read(_);
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
				stopStreams(_);
			}
		}, stopStreams);
	},
	/// * `writer = ez.devices.child_process.writer(proc, options)`  
	///   wraps a node.js child process as an EZ writer.  
	///   For a full description of the options, see `WritableStream` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	writer: function(proc, options) {
		return node.writer(proc.stdin, options);
	},
};
