"use strict";

var generic = require('./generic');

/// !doc
/// ## EZ wrappers for mysql
/// 
/// `var ez = require('ez-streams');`
/// 
module.exports = {
	/// * `reader = ez.devices.mysql.reader(cursor)`  
	reader: function(connection, query) {
		var received = [], error, callback, done;
		var low = 0, high = 2;
		function push(record) {
			received.push(record);
			if (received.length === high) connection.pause();
		}
		function pop() {
			if (received.length === low + 1) connection.resume();
			return pop();
		}
		function send(err, result) {
			var cb = callback;
			callback = null;
			if (cb) cb(err, result);
			else {
				error = error || err;
				if (result) push(result);
				else done = true;
			}
		}
		var reader = generic.reader(_(function(cb) {
			if (error) return cb(error);
			if (received.length) return cb(null, received.shift());
			if (done) return cb();
			callback = cb;
		}, 0));
		reader.context = {};
		query.on('error', send).on('result', send).on('end', send).on('fields', function(fields) {
			reader.context.fields = fields;
		});
		return reader;
	},
	/// * `writer = ez.devices.mysql.writer(connection, tableName)`  
	writer: function(connection, tableName, keys) {
		var sql, done;
		return generic.writer(function(_, obj) {
			if (obj === undefined) done = true;
			if (!done) {
				if (!keys) keys = Object.keys(obj);
				if (!sql) {
					sql = 'insert into `' + tableName + '` ' + //
					"(" + keys.map(function(s) {
						return '`' + s + '`';
					}) + ") " + //
					"VALUES (" + keys.map(function(s, i) {
						return "?";
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