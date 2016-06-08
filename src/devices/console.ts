import { _ } from "streamline-runtime";
import * as generic from './generic';

function consoleWriter(fn: (message: string) => void) {
	return generic.writer(function(_:_, value: any) {
		if (value !== undefined) fn(value);
		return this;
	});
}

/// !doc
/// ## Console EZ streams
/// 
/// `const ez = require('ez-streams');`
/// 
/// * `ez.devices.console.log`  
/// * `ez.devices.console.info`  
/// * `ez.devices.console.warn`  
/// * `ez.devices.console.errors`  
///   EZ writers for console 
export const log = consoleWriter(console.log);
export const info = consoleWriter(console.info);
export const warn = consoleWriter(console.warn);
export const error = consoleWriter(console.error);
