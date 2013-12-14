"use strict";
var fs = require('fs');

function requireDir(path) {
	return fs.readdirSync(__dirname + '/' + path).reduce(function(r, name) {
		var match = /^(.*)\._?js$/.exec(name);
		if (match) r[match[1]] = require('./' + path + '/' + match[1]);
		return r;
	}, {});
}

module.exports = {
	api: require('./api'),
	devices: requireDir('devices'),
	transforms: requireDir('transforms'),
};