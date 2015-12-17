"use strict";

// This script rebuilds the lib/builtins-*.js files
"use strict";
var fsp = require('path');
var compile = require('streamline-helpers').compileSync;
function options(runtime) {
	return {
		plugins: ['streamline'],
		runtime: runtime,
	};
}

['callbacks', 'fibers', 'generators'].forEach(function(runtime) {
	compile(fsp.join(__dirname, 'src'), fsp.join(__dirname, 'lib', runtime), options(runtime));
});
['callbacks', 'fibers'].forEach(function(runtime) {
	compile(fsp.join(__dirname, 'test'), fsp.join(__dirname, 'test-' + runtime), options(runtime));
});
