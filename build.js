"use strict";

// This script rebuilds the lib/builtins-*.js files
// It is run before publishing to NPM.
// You must npm install babel and babel-plugin-streamline before running it.
var babel = require('babel-core');
require('babel-plugin-streamline');
var fs = require('fs');
var fsp = require('path');

var dirMode = parseInt('777', 8);

function mkdirs(dir) {
	if (fs.existsSync(dir)) return;
	mkdirs(fsp.join(dir, '..'));
	fs.mkdirSync(dir, dirMode);
}

function transform(src, dir, dst, map, runtime) {
	var babelOptions = {
		plugins: ['streamline'],
		whitelist: [],
		blacklist: [],
		extra: {
			streamline: {
				runtime: runtime,
				verbose: true,
			},
		},
	};
	if (runtime === 'callbacks') babelOptions.whitelist.push('regenerator');
	else babelOptions.blacklist.push('regenerator');
	babelOptions.filename = src;
	babelOptions.sourceFileName = src;
	babelOptions.sourceMaps = true;
	var source = fs.readFileSync(src, 'utf8');
	var transformed =  babel.transform(source, babelOptions);
	var code = transformed.code + '\n//# sourceMappingURL=' + map;
	console.error("creating", fsp.join(dir, dst));
	fs.writeFileSync(fsp.join(dir, dst), code, 'utf8');
	fs.writeFileSync(fsp.join(dir, map), JSON.stringify(transformed.map, null, '\t'), 'utf8');
}

function build(src, dst, runtime) {
	fs.readdirSync(src).forEach(function(name) {
		var path = fsp.join(src, name);
		var stat = fs.statSync(path);
		mkdirs(dst);
		if (stat.isDirectory()) {
			var sub = fsp.join(dst, name);
			build(path, sub, runtime);
		} else if (/\._?js$/.test(name)) {
			transform(path, 
				dst,
				name.replace('._js', '.js'), 
				name.replace(/\._?js$/, '.map'),
				runtime);			
		}
	});
}

['callbacks', 'fibers', 'generators'].forEach(function(runtime) {
	build(fsp.join(__dirname, 'src'), fsp.join(__dirname, 'lib', runtime), runtime);
});
['callbacks', 'fibers'].forEach(function(runtime) {
	build(fsp.join(__dirname, 'test'), fsp.join(__dirname, 'test-' + runtime), runtime);
});
