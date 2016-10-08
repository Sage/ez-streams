"use strict";
/// !doc
/// ## Stream transform for CSV files
/// 
/// `import * as ez from 'ez-streams'`  
/// 
import { _ } from "streamline-runtime";
import { Reader } from "../reader";
import { Writer } from "../writer";
import * as lines from './lines';

/// * `transform = ez.transforms.csv.parser(options)`  
///   creates a parser transform. The following options can be set:  
///   - `sep`: the field separator, comma by default 
export interface ParserOptions {
	sep?: string;
	encoding?: string;
}

export function parser(options?: ParserOptions) {
	const opts = options || {};
	const sep = opts.sep || ',';
	return (_: _, reader: Reader<string | Buffer>, writer: Writer<any>) => {
		const rd = reader.transform(lines.parser());
		const keys = (rd.read(_) || '').split(sep);
		rd.forEach(_, (_, line) => {
			// ignore empty line (we get one at the end if file is terminated by newline)
			if (line.length === 0) return;
			const values = line.split(sep);
			const obj: any = {};
			keys.forEach((key, i) => {
				obj[key] = values[i];
			});
			writer.write(_, obj);
		});
	};
}
/// * `transform = ez.transforms.csv.formatter(options)`  
///   creates a formatter transform. The following options can be set:  
///   - `sep`: the field separator, comma by default 
///   - `eol`: the end of line marker (`\n`  or `\r\n`)  
export interface FormatterOptions {
	sep?: string;
	eol?: string;
}
export function formatter(options?: FormatterOptions) {
	const opts = options || {};
	const sep = opts.sep || ',';
	const eol = opts.eol || '\n';
	return (_: _, reader: Reader<any>, writer: Writer<string>) => {
		var obj = reader.read(_);
		if (!obj) return;
		const keys = Object.keys(obj);
		writer.write(_, keys.join(sep) + eol);
		do {
			var values = keys.map((key) => obj[key]);
			writer.write(_, values.join(sep) + eol);
		} while ((obj = reader.read(_)) !== undefined);
	};
}
