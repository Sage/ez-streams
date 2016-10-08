"use strict";
/// !doc
/// ## JSON mappers
/// 
/// `import * as ez from 'ez-streams'`  
/// 

import { _ } from 'streamline-runtime';

/// * `mapper = ez.mappers.json.parse()`  
///   returns a mapper that parses JSON string.  
///   It assumes that the stream has already been split on boundaries that delimit valid JSON strings,
///   with an optional separator at the end.
export interface ParseOptions {
	sep?: string;
	encoding?: string;
}

export function parse(options?: ParseOptions) {
	const opts = options || {};
	const sep = opts.sep == null ? ',' : opts.sep;
	return (_: _, data: string | Buffer) => {
		var str: string;
		if (Buffer.isBuffer(data)) str = data.toString(opts.encoding || 'utf8');
		else str = data;
		if (str === '') return;
		// remove trailing separator, if any
		if (sep && str.substring(str.length - sep.length) === sep) str = str.substring(0, str.length - sep.length);
		return JSON.parse(str);
	}
}
/// * `mapper = ez.mappers.json.stringify()`  
///   returns a mapper that converts objects to JSON.
///   You can use a the `sep` option to specify a separator that will be added at the end of every item.
///   By default, `sep` is `,\n`.
export interface FormatterOptions {
	sep?: string;
	replacer?: (key: string, value: any) => any;
	space?: string;
}

export function stringify(options?: FormatterOptions) {
	const opts = options || {};
	const sep = opts.sep == null ? ',\n' : opts.sep;
	return (_: _, data: any) => {
		return JSON.stringify(data, opts.replacer, opts.space) + sep;
	}
}