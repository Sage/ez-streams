"use strict";

var fs = require("fs");
var node = require("./node");

module.exports = {
	text: {
		reader: function(path, encoding) {
			return node.reader(fs.createReadStream(path, {
				encoding: encoding || 'utf8'
			}));
		},
		writer: function(path, encoding) {
			return node.writer(fs.createWriteStream(path, {
				encoding: encoding || 'utf8'
			}));
		},
	},
	binary: {
		reader: function(path) {
			return node.reader(fs.createReadStream(path));
		},
		writer: function(path, encoding) {
			return node.writer(fs.createWriteStream(path));
		},

	}
}