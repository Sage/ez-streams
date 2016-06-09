"use strict";

// This script rebuilds the lib/builtins-*.js files
var fs = require('fs');
var fsp = require('path');
var compile = require('streamline-helpers').compileSync;
function options(runtime) {
	return {
		plugins: ['flow-comments', 'transform-class-properties', 'streamline'],
		runtime: runtime,
	};
}
/*
['callbacks', 'fibers', 'generators'].forEach(function(runtime) {
	compile(fsp.join(__dirname, 'src'), fsp.join(__dirname, 'lib', runtime), options(runtime));
});
['callbacks', 'fibers'].forEach(function(runtime) {
	compile(fsp.join(__dirname, 'test'), fsp.join(__dirname, 'test-' + runtime), options(runtime));
});
*/
try {
	var ts = require('typescript');
} catch (ex) {
	console.error("WARNING: skipping typescript compilation");
}

function listFiles(dir, result) {
	fs.readdirSync(dir).forEach(function(name) {
		var sub = fsp.join(dir, name);
		if (fs.statSync(sub).isDirectory()) listFiles(sub, result);
		else if (/\.ts$/.test(name)) result.push(sub);
	});
	return result;
}

function tsCompile() {
	var typingsDir = fsp.join(__dirname, 'typings');
	var srcDir = fsp.join(__dirname, 'src');
	var outDir = fsp.join(__dirname, 'out');
    var program = ts.createProgram(listFiles(srcDir, listFiles(typingsDir, [])), {
		target: ts.ScriptTarget.ES2015,
		module: ts.ModuleKind.CommonJS,
		moduleResolution: ts.ModuleResolutionKind.NodeJs,
		declaration: true,
		outDir: outDir,
	});
    var emitResult = program.emit();
    var allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

    allDiagnostics.forEach(function(diagnostic)  {
		if (diagnostic.file) {
			var loc = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
			var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
			console.log(diagnostic.file.fileName + ':' + (loc.line + 1) + ':' + (loc.character + 1) + ': ' + message);
		} else {
			console.log(diagnostic.messageText);
		}
    });
	
	if (emitResult.emitSkipped) {
	    console.log("Typescript compilation failed. Exiting...");
		process.exit(1);
	}
	console.log("Typescript compilation succeeded.");
}

if (ts) tsCompile();

function dtsCompile() {
	var dts = require('dts-bundle');
	var dtsOutput = __dirname + '/ez-streams.d.ts';

	var result = dts.bundle({
		name: 'ez-streams',
		main: __dirname + '/out/ez.d.ts',
		out: dtsOutput,
	});
	if (!result.emitted) {
	    console.log("DTS generation failed. Exiting...");
		process.exit(1);		
	}
	console.log("created " + dtsOutput);	
}

if (ts) dtsCompile();
