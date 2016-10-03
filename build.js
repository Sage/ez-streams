"use strict";

// This script rebuilds the lib/builtins-*.js files
var fs = require('fs');
var fsp = require('path');
var helpers = require('streamline-helpers');
function options(runtime, isTest) {
	return {
		plugins: ['transform-flow-comments', 'transform-class-properties', 'streamline'],
		runtime: runtime,
		isTest: isTest,
	};
}

['callbacks', 'fibers', 'generators'].forEach(function(runtime) {
	helpers.compileSync(fsp.join(__dirname, 'src'), fsp.join(__dirname, 'lib', runtime), options(runtime));
});
['callbacks', 'fibers'].forEach(function(runtime) {
	helpers.compileSync(fsp.join(__dirname, 'test'), fsp.join(__dirname, 'test-' + runtime), options(runtime, true));
});

helpers.compileTypescript({
	name: 'ez-streams',
	root: __dirname,
	main: 'out/ez.d.ts',
	dts: 'ez-streams.d.ts',
});