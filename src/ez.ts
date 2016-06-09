"use strict";
/*
const fs = require('fs');
const fsp = require('path');

const extend = Object.assign || function(dst, src) { // we don't need complete babel polyfill, only this one
	Object.keys(src).forEach(k => dst[k] = src[k]);
	return dst;
}

function requireDir(dir) {
	return fs.readdirSync(dir).reduce((r, name) => {
		const path = fsp.join(dir, name);
		if (fs.statSync(path).isDirectory()) {
			r[name] = requireDir(path);
		} else {
			const match = /^(.*)\._?[jt]s$/.exec(name);
			if (match) r[match[1]] = require(fsp.join(dir, match[1]));
		}
		return r;
	}, {});
}

const api = requireDir(__dirname);

const ez = function(arg) {
	return ez.reader(arg);
};
extend(ez, api);
*/
import * as DevArray from './devices/array';
import * as DevBuffer from './devices/buffer';
import * as DevConsole from './devices/console';
import * as DevGeneric from './devices/generic';
import * as DevQueue from './devices/queue';
import * as DevString from './devices/string';

export const devices = {
	array: DevArray,
	buffer: DevBuffer,
	child_process: require('./devices/child_process'),
	console: DevConsole,
	file: require('./devices/file'),
	generic: DevGeneric,
	http: require('./devices/http'),
	net: require('./devices/net'),
	node: require('./devices/node'),
	queue: DevQueue,
	std: require('./devices/std'),
	string: DevString,
	uturn: require('./devices/uturn'),
};

import * as HelpBinary from './helpers/binary';

export const helpers = {
	binary: HelpBinary,
}

export const mappers = {
	convert: require('./mappers/convert'),
	json: require('./mappers/json'),
}

import * as TransCsv from './transforms/csv';
import * as TransCut from './transforms/cut';
import * as TransJson from './transforms/json';
import * as TransLines from './transforms/lines';
import * as TransMultipart from './transforms/multipart';
import * as TransXml from './transforms/xml';

export const transforms = {
	csv: TransCsv,
	cut: TransCut,
	json: TransJson,
	lines: TransLines,
	multipart: TransMultipart,
	xml: TransXml,
}

import * as EzPredicate from './predicate';
import * as EzReader from './reader';
import * as EzStopException from './stop-exception';
import * as EzWriter from './writer';

export const predicate = EzPredicate;
export const reader = EzReader;
export const writer = EzWriter;
/*
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
extend(ez.reader, api.reader);

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
extend(ez.writer, api.writer);

module.exports = ez;
*/