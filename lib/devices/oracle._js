"use strict";

var generic = require('./generic');

/// !doc
/// ## EZ wrappers for oracle
/// 
/// `var ez = require('ez-streams');`
/// 
module.exports = {
	/// * `reader = ez.devices.oracle.reader(cursor)`  
	reader: function(rd) {
		return generic.reader(function(_) {
			var row = rd.nextRow(_);
			return row == null ? undefined : row;
		});
	},
	/// * `writer = ez.devices.oracle.writer(statement)`  
	writer: function(statement) {
		return generic.writer(function(_, row) {
			if (row === undefined) return;
			statement.execute(row, _);
		});
	},
};