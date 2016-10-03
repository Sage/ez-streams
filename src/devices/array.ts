import { _ } from 'streamline-runtime';
import { Reader } from '../reader';
import { Writer } from '../writer';
import { nextTick } from '../util';

export interface Options {
	sync?: boolean;
}

export class ArrayWriter<T> extends Writer<T> {
	values: T[];
	constructor(options: Options) {
		super(function(_: _, value: T) {
			if (!options.sync) nextTick(_);
			if (value !== undefined) this.values.push(value);
			return this;
		});
		this.values = [];
	}
	toArray() : T[] {
		return this.values;
	}
	get result() : T[] {
		return this.values;
	}
}

/// !doc
/// ## Array readers and writers
/// 
/// `const ez = require('ez-streams');`
/// 
/// * `reader = ez.devices.array.reader(array, options)`  
///   creates an EZ reader that reads its entries from `array`.  
///   `reader.read(_)` will return its entries asynchronously by default.  
///   You can force synchronous delivery by setting `options.sync` to `true`.
export function reader<T>(array: T[], options?: Options) {
	var opts = options || {};
	const values = array.slice(0);
	return new Reader(function(_) {
		if (!opts.sync) nextTick(_);
		return values.shift();
	});
}

/// * `writer = ez.devices.array.writer(options)`  
///   creates an EZ writer that collects its entries into an array.  
///   `writer.write(_, value)` will write asynchronously by default.  
///   You can force synchronous write by setting `options.sync` to `true`.
///   `writer.toArray()` returns the internal array into which the 
///   entries have been collected.
export function writer<T>(options?: Options) {
	var opts = options || {};
	return new ArrayWriter(opts);
};