"use strict";

var generic = require('./generic');

/// !doc
/// ## EZ wrappers for mysql
/// 
/// `var ez = require('ez-streams');`
/// 
module.exports = {
	/// * `reader = ez.devices.mysql.reader(connection, query)`   
	reader: function(connection, query) {
		var received = [], error, callback, done;
		var low = 0, high = 2;

		// handle the pause/resume dance
		var paused = false;
		function push(record) {
			received.push(record);
			if (received.length === high) {
				connection.pause();
				paused = true;
			}
		}
		function shift() {
			if (received.length === low + 1) {
				paused = false;
				connection.resume();
			}
			return received.shift();
		}

		// override release because we need to destroy if connection is released before the end of the reader
		// would be nice to have an API to abort the query without destroying the connection
		var release = connection.release;
		connection.release = function() {
			if (paused) this.destroy();
			else release.call(this);
		}

		function send(err, result) {
			//console.log("SEND err=" + err + ", result=" + result);
			var cb = callback;
			callback = null;
			if (cb) cb(err, result);
			else {
				error = error || err;
				if (result) push(result);
				else done = true;
			}
		}
		function sendResult(result) {
			return send(null, result);
		}
		var reader = generic.reader(_(function(cb) {
			if (error) return cb(error);
			if (received.length) return cb(null, shift());
			if (done) return cb();
			callback = cb;
		}, 0));
		reader.context = {};
		query.on('error', send).on('result', sendResult).on('end', sendResult).on('fields', function(fields) {
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