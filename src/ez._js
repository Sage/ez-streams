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

const api = requireDir(__dirname);

const ez = function(arg) {
	return ez.reader(arg);
};
Object.assign(ez, api);

ez.reader = function(arg) {
	if (typeof arg === 'string') {
		const f = api.factory(arg);
		let reader;
		return api.devices.generic.reader(function read(_) {
			if (!reader) reader = f.reader(_);
			return reader.read(_);
		}, function stop(_, arg) {
			if (!reader) reader = f.reader(_);
			return reader.stop(_, arg);
		})
	} else if (Array.isArray(arg)) {
		return api.devices.array.reader(arg);
	} else if (Buffer.isBuffer(arg)) {
		return api.devices.buffer.reader(arg);
	} else {
		throw new Error(`invalid argument ${ arg && typeof arg }`);
	}
}
Object.assign(ez.reader, api.reader);

ez.writer = function(arg) {
	if (typeof arg === 'string') {
		const f = api.factory(arg);
		let writer;
		const wrapper = api.devices.generic.writer(function write(_, val) {
			if (!writer) writer = f.writer(_);
			return writer.write(_, val);
		}, function stop(_, arg) {
			if (!writer) writer = f.writer(_);
			return writer.stop(_, arg);
		});
		Object.defineProperty(wrapper, 'result', {
			get: () => writer.result,
		});
		return wrapper;
	} else if (Array.isArray(arg)) {
		return api.devices.array.writer(arg);
	} else if (Buffer.isBuffer(arg)) {
		return api.devices.buffer.writer(arg);
	} else {
		throw new Error(`invalid argument ${ arg && typeof arg }`);
	}	
}
Object.assign(ez.writer, api.writer);

module.exports = ez;
