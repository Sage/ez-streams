"use strict";

var api = require('../api');

var empty = {
	read: function(_) {},
	write: function(_, value) {},
};

api.decorate(empty);

module.exports = {
	/// ## Synthetic stream constructors
	/// 
	/// * `st = base.reader(read)`  
	///   creates a readable stream from a given read(_) function.
	reader: function(read) {
		return Object.create(empty, {
			read: {
				value: read
			},
		});
	},

	/// * `st = base.writer(write)`  
	///   creates a writable stream from a given write(_) function.
	///   `obj` must have a `write(_)` method
	writer: function(write) {
		return Object.create(empty, {
			write: {
				value: write
			},
		});
	},

	/// ## Special streams
	/// 
	/// * `streams.empty`  
	///   The empty stream. `empty.read(_)` returns `undefined`.
	///   It is also a null sink. You can write to it but nothing happens
	empty: empty,
};