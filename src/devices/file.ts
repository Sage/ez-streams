import * as fs from 'fs';
import { _ } from 'streamline-runtime';
import * as node from './node';
import * as generic from './generic';
import { Reader } from '../reader';
import { Writer } from '../writer';

/// !doc
/// ## File based EZ streams
/// 
/// `const ez = require('ez-streams');`
/// 
export const text = {
	/// * `reader = ez.devices.file.text.reader(path, encoding)`  
	///   creates an EZ reader that reads from a text file.    
	///   `encoding` is optional. It defaults to `'utf8'`.  
	reader(path: string, encoding?: string): Reader<string> {
		return node.reader(fs.createReadStream(path, {
			encoding: encoding || 'utf8'
		}));
	},
	/// * `writer = ez.devices.file.text.writer(path, encoding)`  
	///   creates an EZ writer that writes to a text file.    
	///   `encoding` is optional. It defaults to `'utf8'`.  
	writer(path: string, encoding?: string): Writer<string> {
		return node.writer(fs.createWriteStream(path, {
			encoding: encoding || 'utf8'
		}));
	}
}

export const binary = {
	/// * `reader = ez.devices.file.binary.reader(path)`  
	///   creates an EZ reader that reads from a binary file.    
	reader(path: string): Reader<Buffer> {
		return node.reader(fs.createReadStream(path));
	},
	/// * `writer = ez.devices.file.binary.writer(path)`  
	///   creates an EZ writer that writes to a binary file.    
	writer(path: string): Writer<Buffer> {
		return node.writer(fs.createWriteStream(path));
	}
}

/// * `reader = ez.devices.file.list(path, options)`  
///   `reader = ez.devices.file.list(path, recurse, accept)`  
///   creates a reader that enumerates (recursively) directories and files.  
///   Returns the entries as `{ path: path, name: name, depth: depth, stat: stat }` objects.  
///   Two `options` may be specified: `recurse` and `accept`.  
///   If `recurse` is falsy, only the entries immediately under `path` are returned.  
///   If `recurse` is truthy, entries at all levels (including the root entry) are returned.  
///   If `recurse` is `"postorder"`, directories are returned after their children.  
///   `accept` is an optional function which will be called as `accept(_, entry)` and 
///   will control whether files or subdirectories will be included in the stream or not.  
export interface ListOptions {
	recurse?: boolean | 'preorder' | 'postorder';
	accept?: (_: _, entry: ListEntry) => boolean;
}

export interface ListEntry {
	path: string;
	name: string;
	depth: number;
	stat: fs.Stats;
}

export function list(path: string, options?: ListOptions) {
	var recurse: boolean | 'preorder' | 'postorder', accept: ((_: _, entry: ListEntry) => boolean) | undefined;
	if (options && typeof options === 'object') {
		recurse = options.recurse || false;
		accept = options.accept;
	} else {
		recurse = arguments[1];
		accept = arguments[2];			
	}
	const postorder = recurse === 'postorder';
	return generic.empty.reader.transform((_, reader, writer) => {
		function process(_: _, p: string, name: string, depth: number) {
			const stat = fs.stat(p, _);
			const entry = {
				path: p,
				name: name,
				depth: depth,
				stat: stat,
			};
			if (accept && !accept(_, entry)) return;
			if ((recurse || depth === 1) && !postorder) writer.write(_, entry);
			if ((recurse || depth === 0) && stat.isDirectory()) fs.readdir(p, _).forEach_(_, (_, pp) => {
				process(_, p + '/' + pp, pp, depth + 1);
			});
			if ((recurse || depth === 1) && postorder) writer.write(_, entry);
		}
		process(_, path, path.substring(path.lastIndexOf('/') + 1), 0);
	});
}