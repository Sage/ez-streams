"use strict";

var generic = require('./generic');
var stopException = require('../stop-exception');

var lastId = 0;

module.exports = {
	/// !doc
	/// ## Special device that transforms a writer into a reader
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `uturn = ez.devices.uturn.create()`  
	///   creates a uturn device.  
	///   The device has two properties: a `uturn.writer` to which you can write,   
	///   and a `uturn.reader` from which you can read.  
	create: function() {
		var xcb, xerr, xval, state = 0, done = false, stopArgs;
		var debugId = ++lastId;
		var bouncer = function(st) {
			return _(function(cb, val) {
				//console.error(debugId + ": UTURN1: " + (st === 1 ? "READING" : "WRITING " + val));
				setImmediate(function() {
					//console.error(debugId + ": UTURN2: " + (st === 1 ? "READING" : "WRITING " + val));
					if (st === -1 && val === undefined) done = true;
					if (stopArgs) {
						//console.error(debugId + ": UTURN AFTER STOP: st=" + st + ', stopArgs=' + stopArgs);
						if (st === 1) {
							if (stopArgs[0] && stopArgs[0] !== true) return cb(stopArgs[0]);
							else return cb(null, undefined);
						} else {
							return cb(stopException.make(stopArgs[0]));
						}
					}
					if (xerr) return cb(xerr);
					if (state === st) return cb(new Error(st === 1 ? "already reading" : "already writing"));
					if (state === -st) {
						// reverse operation pending
						state = 0;
						try {
							xcb(null, val);
						} catch (e) {
							xerr = xerr || e;
						}
						cb(xerr, xval);
						xval = undefined;
						xcb = null;
					} else if (done) {
						// state === 0 - nothing pending but read or write after eof
						cb(xerr, xval);
					} else {
						// state === 0 - nothing pending
						xval = val;
						xcb = cb;
						state = st;
					}			
				});
			}, 0);
		};
		var end = function(err) {
			//console.error(debugId + ": UTURN: end, done=" + done + ", xcb=" + typeof xcb + ", done=" + done);
			setImmediate(function() {
				if (done) return;
				xerr = xerr || err;
				done = true;
				if (state !== 0) {
					state = 0;
					xcb(xerr);
					xcb = null;
				}
			});
		};

		function flush() {
			if (xcb) xcb(xerr, xval);
			xcb = null;
		}

		var readStop = function(arg) {
			//console.error(debugId + ": UTURN READ STOP: arg=" + arg + ", xcb=" + typeof xcb + ", done=" + done);
			if (done) return;
			done = true;
			stopArgs = [arg];

			if (state === 1) {
				// read is pending - cancel it - may happen when we propagate stop
				xval = undefined;
				state = 0;
				setImmediate(flush);
			}
			if (state === -1) {
				xval = stopArgs;
				state = 0;
				setImmediate(flush);
			}
		};

		var writeStop = function(arg) {
			//console.error(debugId + ": UTURN WRITE STOP: arg=" + arg + ", xcb=" + typeof xcb + ", done=" + done);
			if (done) return;
			done = true;
			stopArgs = [arg];

			if (state === -1) throw new Error("cannot stop while write is pending");
			if (state === 1) {
				if (arg && arg !== true) xerr = xerr || arg;
				xval = undefined;
				state = 0;
				setImmediate(flush);
			}
		}

		return {
			reader: generic.reader(bouncer(1), readStop),
			writer: generic.writer(bouncer(-1), writeStop),
			end: end,
		};
	},
};