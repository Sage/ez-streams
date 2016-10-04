/// <reference path="../../node_modules/retyped-qunit-tsd-ambient/qunit.d.ts" />
declare function asyncTest(name: string, expected: number, test: (_: _) => any): any;

import { _ } from "streamline-runtime";
import * as ez from "../..";

import * as cp from "child_process";
import * as fsp from "path";
import * as os from "os";

QUnit.module(module.id);

asyncTest("echo ok", 1, (_) => {
    if (os.type() === 'Windows_NT') {
        ok("Ignore on Windows");
    } else {
        const proc = cp.spawn('echo', ['hello\nworld']);
        const got = ez.devices.child_process.reader(proc).toArray(_);
        deepEqual(got, ['hello', 'world']);
    }
	start();
});

asyncTest("bad command", 1, (_) => {
	const proc = cp.spawn(fsp.join(__dirname, 'foobar.zoo'), ['2']);
	try {
		const got = ez.devices.child_process.reader(proc).toArray(_);
		ok(false);
	} catch (ex) {
		ok(ex.code < 0); // -1 on node 0.10 but -2 on 0.12
	}
	start();
});

asyncTest("exit 2", 1, (_) => {
	const cmd = 'exit2' + (os.type() === 'Windows_NT' ? '.cmd' : '.sh');
	const proc = cp.spawn(fsp.join(__dirname, '../../test/fixtures', cmd), ['2']);
	try {
		const got = ez.devices.child_process.reader(proc).toArray(_);
		ok(false);
	} catch (ex) {
		equal(ex.code, 2);
	}
	start();
});