"use strict";
const fs = require('fs');
const fsp = require('path');

function requireDir(dir) {
	return fs.readdirSync(dir).reduce((r, name) => {
		const path = fsp.join(dir, name);
		if (fs.statSync(path).isDirectory()) {
			r[name] = requireDir(path);
		} else {
			const match = /^(.*)\._?js$/.exec(name);
			if (match) r[match[1]] = require(fsp.join(dir, match[1]));
		}
		return r;
	}, {});
}

module.exports = requireDir(__dirname);
