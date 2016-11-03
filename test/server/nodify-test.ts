/// <reference path="../../node_modules/retyped-qunit-tsd-ambient/qunit.d.ts" />
declare function asyncTest(name: string, expected: number, test: (_: _) => any): any;

import { _ } from "streamline-runtime";
import * as ez from "../..";

QUnit.module(module.id);

const sample = __dirname + '/../../test/fixtures/rss-sample.xml';
const zlib = require('zlib');

asyncTest("gzip roundtrip", 1, (_) => {
	const sampleReader1 = ez.devices.file.text.reader(sample);
	var sampleReader2 = ez.devices.file.text.reader(sample);
	const stringify = ez.mappers.convert.stringify();
	const cutter = ez.transforms.cut.transform(10);
	const out = require('fs').createWriteStream(__dirname + '/../../test/fixtures/rss-sample.zip');
	sampleReader2 = sampleReader2.nodeTransform(zlib.createGzip()).nodeTransform(zlib.createGunzip()).map(stringify);
	const cmp = sampleReader1.transform(cutter).compare(_, sampleReader2.transform(cutter));
	equal(cmp, 0);
	start();
});
asyncTest("writer nodify", 1, (_) => {
	const sampleReader1 = ez.devices.file.text.reader(sample);
	const sampleReader2 = ez.devices.file.text.reader(sample);
	const dest = ez.devices.string.writer();
	const expected = sampleReader2.toArray(_).join('');
	const piped = sampleReader1.nodify().pipe(dest.nodify());
	piped.on('finish', function () {
		equal(dest.toString(), expected);
		start();
	});
});
