import * as DevArray from './devices/array';
import * as DevBuffer from './devices/buffer';
import * as DevChildProcess from './devices/child_process';
import * as DevConsole from './devices/console';
import * as DevFile from './devices/file';
import * as DevGeneric from './devices/generic';
import * as DevHttp from './devices/http';
import * as DevQueue from './devices/queue';
import * as DevNet from './devices/net';
import * as DevNode from './devices/node';
import * as DevStd from './devices/std';
import * as DevString from './devices/string';
import * as DevUturn from './devices/uturn';

export const devices = {
	array: DevArray,
	buffer: DevBuffer,
	child_process: DevChildProcess,
	console: DevConsole,
	file: DevFile,
	generic: DevGeneric,
	http: DevHttp,
	net: DevNet,
	node: DevNode,
	queue: DevQueue,
	std: DevStd,
	string: DevString,
	uturn: DevUturn,
};

import * as HelpBinary from './helpers/binary';

export const helpers = {
	binary: HelpBinary,
}

import * as MapConvert from './mappers/convert';
import * as MapJson from './mappers/json';

export const mappers = {
	convert: MapConvert,
	json: MapJson,
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
import * as EzStopException from './stop-exception';
import * as EzReader from './reader';
import * as EzWriter from './writer';
import EzFactory from './factory';

export const predicate = EzPredicate;
export const factory = EzFactory;

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
function anyfy(x: any) { return x; }
var readerHack: any = reader;
readerHack.create = EzReader.create;
readerHack.decorate = anyfy(EzReader).decorate;

var writerHack: any = writer;
writerHack.create = EzWriter.create;
writerHack.decorate = anyfy(EzWriter).decorate;

var transformHack: any = transforms.cut.transform;
transforms.cut = transformHack;
transforms.cut.transform = transformHack;

var queueHack: any = devices.queue.create;
devices.queue = queueHack;
devices.queue.create = queueHack;
