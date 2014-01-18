"use strict";

var generic = require('./generic');

/// !doc
/// ## EZ wrappers for mongodb
/// 
/// `var ez = require('ez-streams');`
/// 
module.exports = {
	/// * `reader = ez.devices.mongodb.reader(cursor)`  
	reader: function(cursor) {
		return generic.reader(function(_) {
			var obj = cursor.nextObject(_);
			return obj == null ? undefined : obj;
		});
	},
	/// * `writer = ez.devices.mongodb.writer(collection)`  
	writer: function(collection) {
		var done;
		return generic.writer(function(_, obj) {
			if (obj === undefined) done = true;
			if (!done) collection.insert(obj, _);
		});
	},
};