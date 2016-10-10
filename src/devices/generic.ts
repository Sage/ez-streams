"use strict";
import { _ } from 'streamline-runtime';
import { Reader } from '../reader';
import { Writer } from '../writer';

/// ## Special streams
/// 
/// * `ez.devices.generic.empty`  
///   The empty stream. `empty.read(_)` returns `undefined`.
///   It is also a null sink. It just discards anything you would write to it.
export const empty = {
	reader: new Reader(function(this: Reader<any>, _: _) {}),
	writer: new Writer(function(this: Writer<any>, _: _, value: any) {}),
};

/// !doc
/// ## Generic stream constructors
/// 
/// `import * as ez from 'ez-streams'`
/// 
/// * `reader = ez.devices.generic.reader(read[, stop])`  
///   creates an EZ reader from a given `read(_)` function and an optional `stop(_, [arg])` function.
export function reader<T>(read: (_: _) => T, stop?: (_: _, arg?: any) => void) {
	return new Reader(read, stop);
}

/// * `writer = ez.devices.generic.writer(write)`  
///   creates an ES writer from a given `write(_, val)` function.
export function writer<T>(write: (_:_, value: T) => void, stop?: (_: _, arg?: any) => void) {
	return new Writer(write, stop);
}
