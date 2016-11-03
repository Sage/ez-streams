"use strict";

// don't subclass Error because we don't want the overhead of a stack capture
class StopException {
	arg: any;
	constructor(arg: any) {
		this.arg = arg;
	}
	get message() {
		return "stream stopped";
	}
	get stack() {
		return "stream stopped\n\t<no stack trace>";
	}
}


export function unwrap(ex: any) { return ex instanceof StopException ? ex.arg : ex; }

export function make(arg: any) { return (!arg || arg === true) ? new StopException(arg) : arg; }
