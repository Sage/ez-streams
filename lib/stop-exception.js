"use strict";

// don't subclass Error because we don't want the overhead of a stack capture
function StopException(arg) {
	this.arg = arg; 
}

StopException.message = "stream stopped";
StopException.stack = StopException.message + "\n\t<no stack trace>"

exports.isStopException = function(ex) {
	return ex instanceof StopException;
}

exports.make = function(arg) {
	return (!arg || arg === true) ? new StopException(arg) : arg;
}