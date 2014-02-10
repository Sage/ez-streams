"use strict";

var generic = require('./generic');

/// !doc
/// ## EZ wrappers for oracle
/// 
/// `var ez = require('ez-streams');`
/// 
module.exports = {
	/// * `reader = ez.devices.oracle.reader(cursor)`  
	reader: function(connection, sql, args) {
		var rd = connection.reader(sql, args);
		return generic.reader(function(_) {
			var row = rd && rd.nextRow(~_);
			return row == null ? (rd = undefined) : row;
		});
	},
	/// * `writer = ez.devices.oracle.writer(statement)`  
	writer: function(connection, sql) {
		var statement = connection.prepare(sql);
		return generic.writer(function(_, row) {
			if (row === undefined) {
				statement = null; 
				return;
			} else if (statement) {
				statement.execute(row, ~_);
			}
		});
	},
};