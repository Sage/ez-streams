"use strict";

const readerApi = require('../reader');
const writerApi = require('../writer');

module.exports = {
	/// !doc
	/// ## Array readers and writers
	/// 
	/// `const ez = require('ez-streams');`
	/// 
	/// * `reader = ez.devices.array.reader(array, options)`  
	///   creates an EZ reader that reads its entries from `array`.  
	///   `reader.read(_)` will return its entries asynchronously by default.  
	///   You can force synchronous delivery by setting `options.sync` to `true`.
	reader: (array, options) => {
		if (!options) options = {};
		const values = array.slice(0);
		return readerApi.decorate({
			read: function(_) {
				if (!options.sync) setImmediate(_);
				return values.shift();
			}
		});
	},
	/// * `writer = ez.devices.array.writer(options)`  
	///   creates an EZ writer that collects its entries into an array.  
	///   `writer.write(_, value)` will write asynchronously by default.  
	///   You can force synchronous write by setting `options.sync` to `true`.
	///   `writer.toArray()` returns the internal array into which the 
	///   entries have been collected.
	writer: (options) => {
		if (!options) options = {};
		const values = [];
		return writerApi.decorate({
			write: function(_, value) {
				if (!options.sync) setImmediate(_);
				if (value !== undefined) values.push(value);
			},
			toArray: function() {
				return values;
			},
		});
	},
};