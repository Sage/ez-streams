"use strict";

var generic = require('./generic');

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
		var xcb, xerr, xval, state = 0, done = false;
		var bouncer = function(st) {
			return _(function(cb, val) {
				setImmediate(function() {
					if (st === -1 && val === undefined) done = true;
					if (xerr) return cb(xerr);
					if (state === st) return cb(new Error(st === 1 ? "already reading" : "already writing"));
					if (state === -st) {
						// reverse operation pending
						try {
							xcb(null, val);
						} catch (e) {
							xerr = xerr || e;
						}
						cb(xerr, xval);
						xval = undefined;
						state = 0;
					} else if (st === 1 && done) {
						// state === 0 - nothing pending but read after eof
						cb(xerr);
					} else {
						// state === 0 - nothing pending
						xval = val;
						xcb = cb;
						state = st;
					}			
				});
			}, 0);
		};
		return {
			reader: generic.reader(bouncer(1)),
			writer: generic.writer(bouncer(-1)),
		};
	},
};