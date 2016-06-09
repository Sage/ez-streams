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
export const factory = require('./factory');

export type Reader<T> = EzReader.Reader<T>;
export type CompareOptions<T> = EzReader.CompareOptions<T>;
export type ParallelOptions = EzReader.ParallelOptions;
export type Writer<T> = EzWriter.Writer<T>;

export function reader(arg: string | any[] | Buffer) : Reader<any> {
	if (typeof arg === 'string') {
		const f = factory(arg);
		let reader: Reader<any>;
		return devices.generic.reader(function read(_) {
			if (!reader) reader = f.reader(_);
			return reader.read(_);
		}, function stop(_, arg) {
			if (!reader) reader = f.reader(_);
			return reader.stop(_, arg);
		})
	} else if (Array.isArray(arg)) {
		return devices.array.reader(arg);
	} else if (Buffer.isBuffer(arg)) {
		return devices.buffer.reader(arg);
	} else {
		throw new Error(`invalid argument ${ arg && typeof arg }`);
	}
}
export function writer(arg: string | any[] | Buffer) : Writer<any> {
	if (typeof arg === 'string') {
		const f = factory(arg);
		let writer: Writer<any>;
		const wrapper = devices.generic.writer(function write(_, val) {
			if (!writer) writer = f.writer(_);
			return writer.write(_, val);
		}, function stop(_, arg) {
			if (!writer) writer = f.writer(_);
			return writer.stop(_, arg);
		});
		Object.defineProperty(wrapper, 'result', {
			get: () => {
				const anyWriter: any = writer;
				return anyWriter.result;
			}
		});
		return wrapper;
	} else if (Array.isArray(arg)) {
		return devices.array.writer(arg);
	} else if (Buffer.isBuffer(arg)) {
		return devices.buffer.writer(arg);
	} else {
		throw new Error(`invalid argument ${ arg && typeof arg }`);
	}	
}

// compatibility hacks
var readerHack: any = reader;
readerHack.create = EzReader.create;

var writerHack: any = writer;
writerHack.create = EzWriter.create;

var transformHack: any = transforms.cut.transform;
transforms.cut = transformHack;
transforms.cut.transform = transformHack;

var queueHack: any = devices.queue.create;
devices.queue = queueHack;
devices.queue.create = queueHack;
