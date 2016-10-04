"use strict";
/// !doc
/// ## Stream transform for line-oriented text streams
/// 
/// `const ez = require("ez-streams")`  
/// 
/// * `transform = ez.transforms.lines.parser(options)`  
///   creates a parser transform.
///   `options` is reserved for future use.
import { _ } from "streamline-runtime";
import { Reader } from "../reader";
import { Writer } from "../writer";

export interface ParserOptions {
	sep?: string;
	encoding?: string;
}

export function parser(options?: ParserOptions): (_: _, reader: Reader<string | Buffer>, writer: Writer<string>) => void {
	const opts = options || {};

	function clean(line: string) {
		return (!opts.sep && line[line.length - 1] === '\r') ? line.substring(0, line.length - 1) : line;
	}
	return (_: _, reader: Reader<string | Buffer>, writer: Writer<string>) => {
		var remain = "";
		reader.forEach(_, (_, chunk) => {
			var str: string;
			if (typeof chunk === 'string') str = chunk;
			else if (Buffer.isBuffer(chunk)) str = chunk.toString(opts.encoding || 'utf8');
			else if (chunk === undefined) return;
			else throw new Error("bad input: " + typeof chunk);
			const lines = str.split(opts.sep || '\n');
			if (lines.length > 1) {
				writer.write(_, clean(remain + lines[0]));
				for (var i = 1; i < lines.length - 1; i++) writer.write(_, clean(lines[i]));
				remain = lines[i];
			} else {
				remain += lines[0];
			}
		});
		if (remain) writer.write(_, remain);
	};
}

/// * `transform = ez.transforms.lines.formatter(options)`  
///   creates a formatter transform.
///   `options.eol` defines the line separator. It is set to `\n` by default.
///   `options.extra` indicates if an extra line separator must be emitted or not at the end. It is false by default.
export interface FormatterOptions {
	eol?: string;
	extra?: boolean;
}

export function formatter(options: FormatterOptions) {
	options = options || {};
	const eol = options.eol || '\n';
	return (_: _, reader: Reader<string>, writer: Writer<string>) => {
		if (options.extra) {
			reader.forEach(_, (_, line) => {
				writer.write(_, line + eol);
			});
		} else {
			reader.forEach(_, (_, line, i) => {
				writer.write(_, i > 0 ? eol + line : line);
			});
		}
	}
}