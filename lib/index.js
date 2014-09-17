"use strict";
var fs = require('fs');

if (!require.extensions['._js']) require('streamline').register({
	cache: true
});

function requireDir(path) {
	return fs.readdirSync(__dirname + '/' + path).reduce(function(r, name) {
		var match = /^(.*)\._?js$/.exec(name);
		if (match) r[match[1]] = require('./' + path + '/' + match[1]);
		return r;
	}, {});
}

module.exports = {
	reader: require('./reader'),
	writer: require('./writer'),
	devices: requireDir('devices'),
	mappers: requireDir('mappers'),
	transforms: requireDir('transforms'),
	helpers: requireDir('helpers'),
};