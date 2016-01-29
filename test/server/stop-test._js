"use strict";
QUnit.module(module.id);

const ez = require("../..");

function numbers(limit) {
	var i = 0;
	return ez.devices.generic.reader(function read(_) {
		if (this.stopped) throw new Error("attempt to read after stop: " + i);
		return i >= limit ? undefined : i++;
	}, function stop(_, arg) {
		this.stopped = {
			at: i,
			arg: arg,
		};
	});
}

asyncTest("explicit stop", 2, (_) => {
	const source = numbers(100);
	var result = ''
	for (var i = 0; i < 5; i++) result += source.read(_);
	source.stop(_);
	strictEqual(result, "01234");
	strictEqual(source.stopped && source.stopped.at, 5);
	start();
});

asyncTest("explicit stop with err", 2, (_) => {
	const source = numbers(100);
	var result = ''
	for (var i = 0; i < 5; i++) result += source.read(_);
	const err = new Error("testing");
	source.stop(_, err);
	strictEqual(result, "01234");
	strictEqual(source.stopped && source.stopped.arg, err);
	start();
});

// limit exercises transform
asyncTest("limit stops", 2, (_) => {
	var source = numbers(100);
	const result = source.skip(2).limit(5).toArray(_).join(',');
	strictEqual(result, '2,3,4,5,6');
	ok(source.stopped, 'stopped');
	start();
});

asyncTest("concat stops", 4, (_) => {
	const source1 = numbers(5);
	const source2 = numbers(5);
	const source3 = numbers(5);
	const result = source1.concat([source2, source3]).limit(7).toArray(_).join(',');
	strictEqual(result, '0,1,2,3,4,0,1');
	ok(!source1.stopped, 'source1 not stopped');
	ok(source2.stopped, 'source2 stopped');
	ok(source3.stopped, 'source3 stopped');
	start();
});

asyncTest("dup stops on 0 and continues on 1", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = dups[0].limit(2).toArray(!_);
	const altF = dups[1].toArray(!_);
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2,3,4');
	ok(!source.stopped, 'source not stopped');
	start();
});

asyncTest("dup stops on 1 and continues on 0", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = dups[1].limit(2).toArray(!_);
	const altF = dups[0].toArray(!_);
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2,3,4');
	ok(!source.stopped, 'source not stopped');
	start();
});

asyncTest("dup stops both silently from 0", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = dups[0].limit(2, true).toArray(!_);
	const altF = dups[1].toArray(!_);
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2'); // 2 is already queued when we hit limit
	ok(source.stopped, 'source stopped');
	start();
});

asyncTest("dup stops both silently from 1", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = dups[1].limit(2, true).toArray(!_);
	const altF = dups[0].toArray(!_);
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2'); // 2 is already queued when we hit limit
	ok(source.stopped, 'source stopped');
	start();
});

asyncTest("dup stops with error from 0", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = dups[0].limit(2, new Error("testing")).toArray(!_);
	const altF = dups[1].toArray(!_);
	const result = resultF(_).join();
	try {
		const alt = altF(_).join();
		ok(false, "altF did not throw");
	} catch (ex) {
		strictEqual(ex.message, "testing");
	}
	strictEqual(result, '0,1');
	ok(source.stopped, 'source stopped');
	start();
});

asyncTest("dup stops with error from 1", 3, (_) => {
	const source = numbers(5);
	const dups = source.dup();
	const resultF = dups[1].limit(2, new Error("testing")).toArray(!_);
	const altF = dups[0].toArray(!_);
	const result = resultF(_).join();
	try {
		const alt = altF(_).join();
		ok(false, "altF did not throw");
	} catch (ex) {
		strictEqual(ex.message, "testing");
	}
	strictEqual(result, '0,1');
	ok(source.stopped, 'source stopped');
	start();
});

asyncTest("dup stops 0 first, 1 later", 3, (_) => {
	const source = numbers(10);
	const dups = source.dup();
	const resultF = dups[0].limit(2).toArray(!_);
	const altF = dups[1].limit(5).toArray(!_);
	const result = resultF(_).join();
	const alt = altF(_).join();
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2,3,4');
	ok(source.stopped, 'source stopped');
	start();
});

asyncTest("dup stops 1 first, 0 later", 3, (_) => {
	const source = numbers(10);
	const dups = source.dup();
	const resultF = dups[1].limit(2).toArray(!_);
	const altF = dups[0].limit(5).toArray(!_);
	const result = resultF(_).join();
	const alt = altF(_).join();
	setTimeout(_, 0);
	strictEqual(result, '0,1');
	strictEqual(alt, '0,1,2,3,4');
	ok(source.stopped, 'source stopped');
	start();
});

asyncTest("pre", 2, (_) => {
	const source = numbers(10);
	const target = ez.devices.array.writer();
	source.pipe(_, target.pre.limit(5));
	strictEqual(target.toArray().join(), '0,1,2,3,4');
	ok(source.stopped, 'source stopped');
	start();
});


