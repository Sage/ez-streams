/// <reference path="../../node_modules/retyped-qunit-tsd-ambient/qunit.d.ts" />
declare function asyncTest(name: string, expected: number, test: (_: _) => any): any;

import { _ } from "streamline-runtime";
import * as ez from "../..";

QUnit.module(module.id);

const buffer = ez.devices.buffer;
const multipart = ez.transforms.multipart

const boundary = "-- my boundary --";

function headers(subType: string) {
		return {
			"content-type": "multipart/" + subType + ";atb1=val1; boundary=" + boundary + "; atb2=val2",
		};
	}

type Part = {
	headers: { [key: string]: string };
	body: string;
};

function testStream() {
	const parts = [{
		headers: {
			A: "VA1",
			B: "VB1",
			"Content-Type": "text/plain",
		},
		body: "C1",
	}, {
		headers: {
			"content-type": "text/plain",
			A: "VA2",
			B: "VB2"
		},
		body: "C2",
	}];

	function formatPart(part: Part) {
		return Object.keys(part.headers).map(function(name) {
			return name + ': ' + part.headers[name]
		}).join('\n') + '\n\n' + boundary + '\n' + part.body + '\n' + boundary + '\n';
	}
	return buffer.reader(new Buffer(parts.map(formatPart).join(''), "binary"));
}

asyncTest('basic multipart/mixed', 13, (_) => {
	const source = testStream();
	const stream = source.transform(multipart.parser(headers("mixed")));
	var part = stream.read(_);
	ok(part != null, "part != null");
	strictEqual(part.headers.a, "VA1", "header A");
	strictEqual(part.headers.b, "VB1", "header B");
	strictEqual(part.headers["content-type"], "text/plain", "content-type");
	var r = part.read(_);
	strictEqual(r.toString('binary'), 'C1', 'body C1');
	r = part.read(_);
	strictEqual(r, undefined, "end of part 1");

	part = stream.read(_);
	ok(part != null, "part != null");
	strictEqual(part.headers.a, "VA2", "header A");
	strictEqual(part.headers.b, "VB2", "header B");
	strictEqual(part.headers["content-type"], "text/plain", "content-type");
	r = part.read(_);
	strictEqual(r.toString('binary'), 'C2', 'body C2');
	r = part.read(_);
	strictEqual(r, undefined, "end of part 2");

	part = stream.read(_);
	equal(part, undefined, "read next part returns undefined");
	start();
});

asyncTest('multipart/mixed roundtrip', 2, (_) => {
	const heads = headers("mixed");
	const source = testStream();
	const writer = buffer.writer();
	source.transform(multipart.parser(heads)).transform(multipart.formatter(heads)).pipe(_, writer);
	const result = writer.toBuffer();
	strictEqual(result.length, 158);
	const writer2 = buffer.writer();
	buffer.reader(result).transform(multipart.parser(heads)).transform(multipart.formatter(heads)).pipe(_, writer2);
	strictEqual(result.toString("binary"), writer2.toBuffer().toString("binary"));
	start();
});