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
			var obj = rd.nextRow(_);
			return obj == null ? undefined : obj;
		});
	},
	/// * `writer = ez.devices.oracle.writer(connection, tableName)`  
	writer: function(connection, tableName, keys) {
		var sql, done;
		return generic.writer(function(_, obj) {
			if (obj === undefined) done = true;
			if (!done) {
				if (!keys) keys = Object.keys(obj);
				if (!sql) {
					sql = 'insert into "' + tableName + '" ' + //
					"(" + keys.map(function(s) {
						return '"' + s + '"';
					}) + ") " + //
					"VALUES (" + keys.map(function(s, i) {
						return ":" + (i + 1);
					}) + ")";
				}
				var values = keys.map(function(k) {
					return obj[k];
				});
				connection.execute(sql, values, _);
			}
		});
	},
};