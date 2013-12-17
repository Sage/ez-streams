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
/// `var ez = require("ez-streams")`  
/// 
module.exports = {
	/// * `transform = ez.transforms.json.parser(options)`  
	///   creates a parser transform. The following options can be set:  
	///   - `unbounded`: use _unbounded_ format  
	///   - `reviver`: reviver function which is passed to [JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
	parser: function(options) {
		options = options || {};

		return function(_, reader, writer) {
			var pos = 0,
				chunk = reader.read(_),
				beg, collected = "",
				line = 1,
				depth = 1,
				quoted = false,
				escape = false,
				ch;

			function error(msg) {
				throw new Error(line + ": " + msg + " near " + (chunk ? chunk.substring(pos, pos + 20) : "<EOF>"));
			}

			function peekch(_) {
				if (!chunk) return undefined;
				if (pos >= chunk.length) {
					if (beg !== undefined) {
						collected += chunk.substring(beg);
						beg = 0;
					}
					chunk = reader.read(_);
					if (!chunk) return undefined;
					pos = 0;
				}
				return chunk[pos];
			}

			function skipSpaces(_) {
				var ch;
				while ((ch = peekch(_)) !== undefined && /^\s/.test(ch)) {
					line += ch === '\n';
					pos++;
				}
				return ch;
			}


			function flush(_) {
				collected += chunk.substring(beg, pos);
				var val = JSON.parse(collected, options.reviver);
				writer.write(_, val);
				beg = undefined;
				collected = "";
			}

			ch = skipSpaces(_);
			if (!options.unbounded) {
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
						if (depth === 1 && options.unbounded && beg === undefined) return;
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
							if (options.unbounded) throw error("unexpected ]");
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
						if (/^\s/.test(ch)) line += (ch === '\n');
						else if (depth === 1 && beg === undefined) beg = pos;
					}
				}
				pos++;
			}
		};
	},

	/// * `transform = ez.transforms.json.formatter(options)`  
	///   creates a formatter transform. The following options can be set:  
	///   - `unbounded`: use _unbounded_ format  
	///   - `replacer`: replacer function which is passed to [JSON.stringify](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
	///   - `space`: space formatting directive which is passed to JSON.stringify.
	formatter: function(options) {
		options = options || {};
		return function(_, reader, writer) {
			if (!options.unbounded) writer.write(_, '[');
			reader.forEach(_, function(_, obj, i) {
				if (i > 0) writer.write(_, ',\n');
				writer.write(_, JSON.stringify(obj, options.replacer, options.space));
			});
			writer.write(_, options.unbounded ? ',' : ']');
			writer.write(_);
		}
	},
};