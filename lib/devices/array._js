"use strict";

var api = require('../api');

module.exports = {
	reader: function(array, options) {
		if (!options) options = {};
		var values = array.slice(0);
		var stream = {
			read: function(_) {
				if (!options.sync) setImmediate(~_);
				return values.shift();
			}
		}
		return api.decorate(stream);
	}, 
	writer: function(options) {
		if (!options) options = {};
		var values = [];
		return {
			write: function(_, value) {
				if (!options.sync) setImmediate(~_);
				if (value !== undefined) values.push(value);
			},
			toArray: function() {
				return values;
			},
		}
	},
};
