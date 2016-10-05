/// <reference path="../../node_modules/retyped-qunit-tsd-ambient/qunit.d.ts" />
declare function asyncTest(name: string, expected: number, test: (_: _) => any): any;

import { _ } from "streamline-runtime";
import * as ez from "../..";

QUnit.module(module.id);

interface TestReader extends ez.Reader<number> {
	stoppedReason?: {
		at: number;
		arg: any;
	}
}

//interface TestReader extends ez.reader.Reader<number> 
function numbers(limit: number) : TestReader {
	var i = 0;
	return ez.devices.generic.reader(function read(_) {
		if (this.stoppedReason) throw new Error("attempt to read after stop: " + i);
		return i >= limit ? undefined : i++;
	}, function stop(_, arg) {
		this.stoppedReason = {
			at: i,
			arg: arg,
		};
	}) as TestReader;
}

asyncTest("explicit stop", 2, (_) => {
	const source = numbers(100);
	var result = ''
	for (var i = 0; i < 5; i++) result += source.read(_);
	source.stop(_);
	strictEqual(result, "01234");
	strictEqual(source.stoppedReason && source.stoppedReason.at, 5);
	start();
});

asyncTest("explicit stop with err", 2, (_) => {
	const source = numbers(100);
	var result = ''
	for (var i = 0; i < 5; i++) result += source.read(_);
	const err = new Error("testing");
	source.stop(_, err);
	strictEqual(result, "01234");
	strictEqual(source.stoppedReason && source.stoppedReason.arg, err);
	start();
});

// limit exercises transform
asyncTest("limit stops", 2, (_) => {
	var source = numbers(100);
	const result = source.skip(2).limit(5).toArray(_).join(',');
	strictEqual(result, '2,3,4,5,6');
	ok(source.stoppedReason, 'stopped');
	start();
});

asyncTest("concat stops", 4, (_) => {
	const source1 = numbers(5);
	const source2 = numbers(5);
	const source3 = numbers(5);
	const result = source1.concat([source2, source3]).limit(7).toArray(_).join(',');
	strictEqual(result, '0,1,2,3,4,0,1');
	ok(!source1.stoppedReason, 'source1 not stopped');
	ok(source2.stoppedReason, 'source2 stopped');
	ok(source3.stoppedReason, 'source3 stopped');
	start();
});

asyncTest("dup stops on 0 and continues on 1", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = _.future(_ => dups[0].limit(2).toArray(_));
	const altF = _.future(_ => dups[1].toArray(_));
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2,3,4');
	ok(!source.stoppedReason, 'source not stopped');
	start();
});

asyncTest("dup stops on 1 and continues on 0", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = _.future(_ => dups[1].limit(2).toArray(_));
	const altF = _.future(_ => dups[0].toArray(_));
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2,3,4');
	ok(!source.stoppedReason, 'source not stopped');
	start();
});

asyncTest("dup stops both silently from 0", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = _.future(_ => dups[0].limit(2, true).toArray(_));
	const altF = _.future(_ => dups[1].toArray(_));
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2'); // 2 is already queued when we hit limit
	ok(source.stoppedReason, 'source stopped');
	start();
});

asyncTest("dup stops both silently from 1", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = _.future(_ => dups[1].limit(2, true).toArray(_));
	const altF = _.future(_ => dups[0].toArray(_));
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2'); // 2 is already queued when we hit limit
	ok(source.stoppedReason, 'source stopped');
	start();
});

asyncTest("dup stops with error from 0", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = _.future(_ => dups[0].limit(2, new Error("testing")).toArray(_));
	const altF = _.future(_ => dups[1].toArray(_));
	const result = resultF(_).join();
	try {
		const alt = altF(_).join();
		ok(false, "altF did not throw");
	} catch (ex) {
		strictEqual(ex.message, "testing");
	}
	strictEqual(result, '0,1');
	ok(source.stoppedReason, 'source stopped');
	start();
});

asyncTest("dup stops with error from 1", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = _.future(_ => dups[1].limit(2, new Error("testing")).toArray(_));
	const altF = _.future(_ => dups[0].toArray(_));
	const result = resultF(_).join();
	try {
		const alt = altF(_).join();
		ok(false, "altF did not throw");
	} catch (ex) {
		strictEqual(ex.message, "testing");
	}
	strictEqual(result, '0,1');
	ok(source.stoppedReason, 'source stopped');
	start();
});

asyncTest("dup stops 0 first, 1 later", 3, (_) => {
	const source = numbers(10);
	const dups = source.dup();
	const resultF = _.future(_ => dups[0].limit(2).toArray(_));
	const altF = _.future(_ => dups[1].limit(5).toArray(_));
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2,3,4');
	ok(source.stoppedReason, 'source stopped');
	start();
});

asyncTest("dup stops 1 first, 0 later", 3, (_) => {
	const source = numbers(10);
	const dups = source.dup();
	const resultF = _.future(_ => dups[1].limit(2).toArray(_));
	const altF = _.future(_ => dups[0].limit(5).toArray(_));
	const result = resultF(_).join();
	const alt = altF(_).join();
	setTimeout(_, 0);
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2,3,4');
	ok(source.stoppedReason, 'source stopped');
	start();
});

asyncTest("pre", 2, (_) => {
	const source = numbers(10);
	const target = ez.devices.array.writer();
	source.pipe(_, target.pre.limit(5));
	strictEqual(target.toArray().join(), '0,1,2,3,4');
	ok(source.stoppedReason, 'source stopped');
	start();
});


