/// !doc
/// ## EZ Stream wrappers for node child processes
/// 
/// `const ez = require('ez-streams');`
/// 
import { _ } from 'streamline-runtime';
import { Reader } from '../reader';
import { Writer } from '../writer';
import * as generic from './generic';
import { parser as linesParser } from '../transforms/lines';
import * as node from './node';
import { stringify } from '../mappers/convert';

/// * `reader = ez.devices.child_process.reader(proc, options)`  
///   wraps a node.js child process as an EZ reader.  
///   For a full description of the options, see `ReadableStream` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
export interface ReaderOptions {
	acceptCode?: (code: number) => boolean;
	encoding?: string;
	dataHandler?: (reader: Reader<string | Buffer>) => Reader<string | Buffer>;
	errorHandler?: (reader: Reader<string | Buffer>) => Reader<string | Buffer>;
	errorPrefix?: string;
	errorThrow?: boolean;
}

export function reader(proc: NodeJS.Process, options?: ReaderOptions) {
	var opts = options || {};
	var err: NodeJS.ErrnoException, closeCb: ((err: Error) => void) | null, closed: boolean;
	proc.on('close', (ec: number) => {
		closed = true;
		if (ec === -1) {
			proc.stdout.emit('end');
			proc.stderr.emit('end');
		}
		if (ec && !(opts.acceptCode && opts.acceptCode(ec))) {
			err = new Error("process exited with code:" + ec);
			err.errno = ec;
			// compat code
			var anyErr: any = err;
			anyErr.code = ec;
		}
		if (closeCb)
			closeCb(err);
		closeCb = null;
	});
	proc.on('error', (e: NodeJS.ErrnoException) => {
		err = err || e;
	});
	var stdout: Reader<string | Buffer> = node.reader(proc.stdout, opts);
	var stderr: Reader<string | Buffer> = node.reader(proc.stderr, opts);
	// node does not send close event if we remove all listeners on stdin and stdout
	// so we disable the stop methods and we call stop explicitly after the close.
	const stops = [stdout.stop.bind(stdout), stderr.stop.bind(stderr)];
	stdout.stop = stderr.stop = (_: _) => {};
	function stopStreams(_:_, arg?: any) {
		stops.forEach_(_, (_, stop) => {
			stop(_, arg);
		});
	}
	if (opts.encoding !== 'buffer') {
		stdout = stdout.map(stringify()).transform(linesParser());
		stderr = stderr.map(stringify()).transform(linesParser());
	}
	if (opts.dataHandler) stdout = opts.dataHandler(stdout);
	if (opts.errorHandler) stderr = opts.errorHandler(stderr);
	if (opts.errorPrefix || opts.errorThrow) stderr = stderr.map(function(_, data) {
		if (opts.errorThrow) throw new Error((opts.errorPrefix || "") + data);
		return opts.errorPrefix + data;
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
			_.cast(function(cb) {
				closeCb = cb;
			})(_);
			stopStreams(_);
		}
	}, stopStreams);
}
/// * `writer = ez.devices.child_process.writer(proc, options)`  
///   wraps a node.js child process as an EZ writer.  
///   For a full description of the options, see `WritableStream` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 

export function writer(proc: NodeJS.Process, options: node.NodeWriterOptions) {
	return node.writer(proc.stdin, options);
}
