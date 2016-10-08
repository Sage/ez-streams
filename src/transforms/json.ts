"use strict";
/// !doc
/// Stream transform for simple JSON streams
/// 
/// ## "Simple" JSON streams
/// 
/// A _simple JSON stream_ is a text stream with the following format:
/// 
/// * the stream starts with `[` and ends with `]`
/// * items are serialized in JSON format and separated by commas
/// 
/// In other words, the whole stream is just a valid JSON array.
/// 
/// There is no special constraint on spaces or line breaks, nor on items. Items are usually objects but they may also be simple values, arrays or even nulls. Items may or may not be separated by lines. Any valid JSON array is a valid _simple JSON stream_.
/// 
/// For example the following is a valid simple JSON stream:
/// 
/// ``` json
/// [{ "firstName": "Jimy", "lastName": "Hendrix" },
///  { "firstName": "Jim", "lastName": "Morrison" },
///  "people are strange", 27, null,
///  { "firstName": "Janis", 
///    "lastName": "Joplin" },
///  [1, 2, 3, 
///   5, 8, 13],
///  true]
///  ```
/// 
/// ## Unbounded streams
/// 
/// Sometimes it is preferable to omit the `[` and `]` delimiters and to systematically append a comma after every entry, even after the last one. For example this is a better format for log files as it makes it easy to append entries.
/// 
/// This alternate format can be obtained by passing an `unbounded: true` option when creating the reader or the writer.
/// 
/// Here is an example of a normal, _bounded_, simple JSON stream:
/// 
/// ```
/// [{ "firstName": "Jimy", "lastName": "Hendrix" },
///  { "firstName": "Jim", "lastName": "Morrison" },
///  { "firstName": "Janis", "lastName": "Joplin" }]
/// ```
/// 
/// and the corresponding _unbounded_ stream:
/// 
/// ```
/// { "firstName": "Jimy", "lastName": "Hendrix" },
/// { "firstName": "Jim", "lastName": "Morrison" },
/// { "firstName": "Janis", "lastName": "Joplin" },
/// ```
/// 
/// ## API
/// 
/// `import * as ez from 'ez-streams'`  
/// 
import { _ } from "streamline-runtime";
import { Reader } from "../reader";
import { Writer } from "../writer";
/// * `transform = ez.transforms.json.parser(options)`  
///   creates a parser transform. The following options can be set:  
///   - `unbounded`: use _unbounded_ format  
///   - `reviver`: reviver function which is passed to [JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
export interface ParserOptions {
	size?: number;
	encoding?: string;
	reviver?:  (key: any, value: any) => any;
	unbounded?: boolean;
}

export function parser(options?: ParserOptions) {
	const opts = options || {};

	return (_: _, reader: Reader<string | Buffer>, writer: Writer<any>) => {
		function read(_: _) {
			const data = reader.read(_);
			return Buffer.isBuffer(data) ? data.toString(opts.encoding || 'utf8') : data;
		}
		var pos = 0,
			chunk = read(_),
			beg: number | undefined, collected = "",
			line = 1,
			depth = 1,
			quoted = false,
			escape = false,
			ch: string | undefined;

		function error(msg: string) {
			throw new Error(line + ": " + msg + " near " + (chunk ? chunk.substring(pos, pos + 20) : "<EOF>"));
		}

		function peekch(_: _) {
			if (!chunk) return undefined;
			if (pos >= chunk.length) {
				if (beg !== undefined) {
					collected += chunk.substring(beg);
					beg = 0;
				}
				chunk = read(_);
				if (!chunk) return undefined;
				pos = 0;
			}
			return chunk[pos];
		}

		function skipSpaces(_: _) {
			var ch: string | undefined;
			while ((ch = peekch(_)) !== undefined && /^\s/.test(ch)) {
				line += ch === '\n' ? 1 : 0;
				pos++;
			}
			return ch;
		}


		function flush(_: _) {
			if (chunk === undefined || beg === undefined) return;
			collected += chunk.substring(beg, pos);
			const val = JSON.parse(collected, opts.reviver);
			writer.write(_, val);
			beg = undefined;
			collected = "";
		}

		ch = skipSpaces(_);
		if (!opts.unbounded) {
			if (ch !== '[') throw error("expected [, got " + ch);
			pos++;
		} else {
			if (ch === undefined) return;
		}

		while (true) {
			ch = peekch(_);
			if (escape) {
				escape = false;
			} else if (quoted) {
				if (ch === '\\') escape = true;
				else if (ch === '"') {
					quoted = false;
				}
			} else {
				switch (ch) {
				case undefined:
					if (depth === 1 && opts.unbounded && beg === undefined) return;
					else throw error("unexpected EOF");
				case '"':
					if (depth === 1 && beg === undefined) beg = pos;
					quoted = true;
					break;
				case '{':
				case '[':
					if (depth === 1 && beg === undefined) beg = pos;
					depth++;
					break;
				case '}':
					depth--;
					if (depth === 0) throw error("unexpected }");
					break;
				case ']':
					depth--;
					if (depth === 0) {
						if (opts.unbounded) throw error("unexpected ]");
						if (beg !== undefined) flush(_);
						return;
					}
					break;
				case ',':
					if (depth === 1) {
						if (beg === undefined) throw error("unexpected comma");
						flush(_);
					}
					break;
				default:
					if (/^\s/.test(ch)) line += (ch === '\n') ? 1 : 0;
					else if (depth === 1 && beg === undefined) beg = pos;
				}
			}
			pos++;
		}
	}
}

/// * `transform = ez.transforms.json.formatter(options)`  
///   creates a formatter transform. The following options can be set:  
///   - `unbounded`: use _unbounded_ format  
///   - `replacer`: replacer function which is passed to [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
///   - `space`: space formatting directive which is passed to JSON.stringify.
export interface FormatterOptions {
	unbounded?: boolean;
	replacer?: (key: string, value: any) => any;
	space?: string;
}

export function formatter(options?: FormatterOptions) {
	const opts = options || {};
	return (_: _, reader: Reader<any>, writer: Writer<string>) => {
		if (!opts.unbounded) writer.write(_, '[');
		reader.forEach(_, (_, obj, i) => {
			if (i > 0) writer.write(_, ',\n');
			writer.write(_, JSON.stringify(obj, opts.replacer, opts.space));
		});
		writer.write(_, opts.unbounded ? ',' : ']');
		writer.write(_, undefined);
	}
}