/// <reference path="../../node_modules/retyped-qunit-tsd-ambient/qunit.d.ts" />
declare function asyncTest(name: string, expected: number, test: (_: _) => any): any;

import { _ } from "streamline-runtime";
import * as ez from "../..";

import { Reader } from "../../src/reader";
interface TestReader extends Reader<number> {
	stopInfo: { at: number, arg: any };
	finalCheck: () => void;
}

QUnit.module(module.id);

const generic = ez.devices.generic;
const arraySink = ez.devices.array.writer;

function numbers(limit?: number): TestReader {
	var i = 0;
	const source: any = generic.reader(function read(_) {
		return i >= limit ? undefined : i++;
	}, function stop(this: TestReader, _: _, arg: number) {
		this.stopInfo = {
			at: i,
			arg: arg,
		};
	});
	source.finalCheck = function (this: TestReader) {
		ok(this.stopInfo || i == limit, "final check");
	}
	return source;
}

function fail(result?: any) {
	return function (_: _, val: any) {
		if (val === 3) throw new Error('FAILED');
		return result;
	}
}

function minJoiner(_: _, values: any[]) {
	const min = Math.min.apply(null, values.filter(function (val) { return val !== undefined; }));
	values.forEach(function (val, i) {
		if (val == min) values[i] = undefined;
	});
	return min;
}

asyncTest("forEach", 2, (_) => {
	const results: number[] = [];
	const source = numbers(5);
	source.forEach(_, function (_, num) {
		results.push(num);
	});
	strictEqual(results.join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("forEach error", 2, (_) => {
	const source = numbers(5);
	try {
		source.forEach(_, fail());
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	source.finalCheck();
	start();
});

asyncTest("map", 2, (_) => {
	const source = numbers(5);
	strictEqual(source.map(function (_, num) {
		return num * num;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,4,9,16");
	source.finalCheck();
	start();
});

asyncTest("map error", 2, (_) => {
	const source = numbers(5);
	try {
		source.map(fail(1)).pipe(_, arraySink());
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	source.finalCheck();
	start();
});

asyncTest("every", 12, (_) => {
	var source: TestReader;
	strictEqual((source = numbers(5)).every(_, function (_, num) {
		return num < 5;
	}), true);
	source.finalCheck();
	strictEqual((source = numbers(5)).every(_, function (_, num) {
		return num < 4;
	}), false);
	source.finalCheck();
	strictEqual((source = numbers(5)).every(_, function (_, num) {
		return num != 2;
	}), false);
	source.finalCheck();
	strictEqual((source = numbers(5)).every(_, {
		$lt: 5,
	}), true);
	source.finalCheck();
	strictEqual((source = numbers(5)).every(_, {
		$lt: 4,
	}), false);
	source.finalCheck();
	strictEqual((source = numbers(5)).every(_, {
		$ne: 2,
	}), false);
	source.finalCheck();
	start();
});

asyncTest("every error", 2, (_) => {
	const source = numbers(5);
	try {
		source.every(_, fail(true));
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	source.finalCheck();
	start();
});

asyncTest("some", 12, (_) => {
	var source: TestReader;
	strictEqual((source = numbers(5)).some(_, function (_, num) {
		return num >= 5;
	}), false);
	source.finalCheck();
	strictEqual((source = numbers(5)).some(_, function (_, num) {
		return num >= 4;
	}), true);
	source.finalCheck();
	strictEqual((source = numbers(5)).some(_, function (_, num) {
		return num != 2;
	}), true);
	source.finalCheck();
	strictEqual((source = numbers(5)).some(_, {
		$gte: 5,
	}), false);
	source.finalCheck();
	strictEqual((source = numbers(5)).some(_, {
		$gte: 4,
	}), true);
	source.finalCheck();
	strictEqual((source = numbers(5)).some(_, {
		$ne: 2,
	}), true);
	source.finalCheck();
	start();
});

asyncTest("some error", 2, (_) => {
	const source = numbers(5);
	try {
		source.some(_, fail(false));
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	source.finalCheck();
	start();
});

asyncTest("reduce", 2, (_) => {
	const source = numbers(5);
	strictEqual(source.reduce(_, function (_, r, num) {
		return r + '/' + num;
	}, ""), "/0/1/2/3/4");
	source.finalCheck();
	start();
});

asyncTest("reduce error", 2, (_) => {
	const source = numbers(5);
	try {
		source.reduce(_, function (_, r, v) {
			if (v === 3) throw new Error('FAILED');
			return r;
		}, null);
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	source.finalCheck();
	start();
});

asyncTest("toArray", 2, (_) => {
	const source = numbers(5);
	deepEqual(source.toArray(_), [0, 1, 2, 3, 4]);
	source.finalCheck();
	start();
});

asyncTest("pipe", 2, (_) => {
	const source = numbers(5);
	strictEqual(source.pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

// pipe error already tested in map

asyncTest("tee", 3, (_) => {
	const source = numbers(5);
	const secondary = arraySink();
	strictEqual(source.tee(secondary).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	strictEqual(secondary.toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("tee error", 3, (_) => {
	const source = numbers(5);
	const secondary = arraySink();
	try {
		source.tee(secondary).map(fail(2)).pipe(_, arraySink());
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	strictEqual(secondary.toArray().join(','), "0,1,2,3");
	source.finalCheck();
	start();
});

asyncTest("dup", 3, (_) => {
	const source = numbers(5);
	const streams = source.dup();
	const f1 = _.future(_ => streams[0].toArray(_));
	const f2 = _.future(_ => streams[1].toArray(_));
	strictEqual(f1(_).join(','), "0,1,2,3,4");
	strictEqual(f2(_).join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("dup error 0", 3, (_) => {
	const source = numbers(5);
	const streams = source.dup();
	const f1 = _.future(_ => streams[0].map(fail(2)).toArray(_));
	const f2 = _.future(_ => streams[1].toArray(_));
	try {
		f1(_);
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	try {
		f2(_);
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	source.finalCheck();
	start();
});

asyncTest("dup error 1", 3, (_) => {
	const source = numbers(5);
	const streams = source.dup();
	const f1 = _.future(_ => streams[0].toArray(_));
	const f2 = _.future(_ => streams[1].map(fail(2)).toArray(_));
	try {
		f1(_);
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	try {
		f2(_);
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	source.finalCheck();
	start();
});

asyncTest("concat", 4, (_) => {
	var source: TestReader;
	const rd1 = (source = numbers(5)).concat(numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(12));
	strictEqual(rd1.toArray(_).join(), "0,1,2,3,4,6,7,12,13,14");
	source.finalCheck();
	const rd2 = (source = numbers(5)).concat([numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(12)]);
	strictEqual(rd2.toArray(_).join(), "0,1,2,3,4,6,7,12,13,14");
	source.finalCheck();
	start();
});

asyncTest("concat error", 2, (_) => {
	const source = numbers(5);
	const rd1 = source.concat(numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(2).map(fail(2)));
	try {
		rd1.toArray(_);
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	source.finalCheck();
	start();
});

asyncTest("transform - same number of reads and writes", 2, (_) => {
	const source = numbers(5);
	strictEqual(source.transform(function (_, reader, writer) {
		var sum = 0, val: number | undefined;
		while ((val = reader.read(_)) !== undefined) {
			sum += val;
			writer.write(_, sum);
		}
	}).pipe(_, arraySink()).toArray().join(','), "0,1,3,6,10");
	source.finalCheck();
	start();
});

asyncTest("transform - more reads than writes", 2, (_) => {
	const source = numbers(12);
	strictEqual(source.transform(function (_, reader, writer) {
		var str = "", val: number | undefined;
		while ((val = reader.read(_)) !== undefined) {
			str += "-" + val;
			if (val % 5 === 4) {
				writer.write(_, str);
				str = "";
			}
		}
		writer.write(_, str);
	}).pipe(_, arraySink()).toArray().join('/'), "-0-1-2-3-4/-5-6-7-8-9/-10-11");
	source.finalCheck();
	start();
});

asyncTest("transform - less reads than writes", 2, (_) => {
	const source = numbers(5);
	strictEqual(source.transform(function (_, reader, writer) {
		var str = "", val: number | undefined;
		while ((val = reader.read(_)) !== undefined) {
			for (var i = 0; i < val; i++) writer.write(_, val);
		}
	}).pipe(_, arraySink()).toArray().join(','), "1,2,2,3,3,3,4,4,4,4");
	source.finalCheck();
	start();
});

asyncTest("transform error", 2, (_) => {
	const source = numbers(5);
	try {
		source.transform(function (_, reader, writer) {
			var str = "", val: number | undefined;
			while ((val = reader.read(_)) !== undefined) {
				fail(2)(_, val);
				writer.write(_, val);
			}
		}).pipe(_, arraySink());
		ok(false);
	} catch (ex) {
		strictEqual(ex.message, 'FAILED');
	}
	source.finalCheck();
	start();
});

asyncTest("filter", 4, (_) => {
	var source: TestReader;
	strictEqual((source = numbers(10)).filter(function (_, val) {
		return val % 2;
	}).pipe(_, arraySink()).toArray().join(','), "1,3,5,7,9");
	source.finalCheck();
	strictEqual((source = numbers(10)).filter({
		$gt: 2,
		$lt: 6,
	}).pipe(_, arraySink()).toArray().join(','), "3,4,5");
	source.finalCheck();
	start();
});

asyncTest("while", 4, (_) => {
	var source: TestReader;
	strictEqual((source = numbers()).while(function (_, val) {
		return val < 5;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	strictEqual((source = numbers()).while({
		$lt: 5,
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("until", 4, (_) => {
	var source: TestReader;
	strictEqual((source = numbers()).until(function (_, val) {
		return val > 5;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5");
	source.finalCheck();
	strictEqual((source = numbers()).until({
		$gt: 5,
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5");
	source.finalCheck();
	start();
});

asyncTest("limit", 2, (_) => {
	const source = numbers();
	strictEqual(source.limit(5).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("skip", 2, (_) => {
	const source = numbers();
	strictEqual(source.skip(2).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	source.finalCheck();
	start();
});

function pow(n: number) {
	return function (_: _, val: number) {
		return Math.pow(val, n);
	}
}

function wait(millis: number | (() => number)) {
	return function <T>(_: _, val: T) {
		const ms = typeof millis === "function" ? millis() : millis;
		setTimeout(_, ms)
		return val;
	}
}

function rand(min: number, max: number) {
	return function () {
		return min + Math.round(Math.random() * (max - min));
	};
}

asyncTest("simple chain (no buffer)", 2, (_) => {
	const source = numbers();
	strictEqual(source.skip(2).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	source.finalCheck();
	start();
});
asyncTest("buffer in simple chain", 6, (_) => {
	var source: TestReader;
	strictEqual((source = numbers()).buffer(3).skip(2).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	source.finalCheck();
	strictEqual((source = numbers()).skip(2).buffer(3).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	source.finalCheck();
	strictEqual((source = numbers()).skip(2).limit(5).buffer(3).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	source.finalCheck();
	start();
});
asyncTest("buffer with slower input", 2, (_) => {
	const source = numbers();
	strictEqual(source.limit(10).map(wait(20)).buffer(5).map(wait(10)).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5,6,7,8,9");
	source.finalCheck();
	start();
});

asyncTest("buffer with faster input", 2, (_) => {
	const source = numbers();
	strictEqual(source.limit(10).map(wait(10)).buffer(5).map(wait(20)).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5,6,7,8,9");
	source.finalCheck();
	start();
});

asyncTest("parallel preserve order", 2, (_) => {
	const t0 = Date.now();
	const source = numbers();
	strictEqual(source.limit(10).parallel(4, function (source) {
		return source.map(wait(rand(10, 10))).map(pow(2));
	}).pipe(_, arraySink()).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	source.finalCheck();
	const dt = Date.now() - t0;
	//ok(dt < 600, "elapsed: " + dt + "ms");
	start();
});

asyncTest("parallel shuffle", 2, (_) => {
	const t0 = Date.now();
	const source = numbers();
	strictEqual(source.limit(10).parallel({
		count: 4,
		shuffle: true,
	}, function (source) {
		return source.map(wait(rand(10, 10))).map(pow(2));
	}).pipe(_, arraySink()).toArray().sort(function (i: number, j: number) {
		return i - j;
	}).join(','), "0,1,4,9,16,25,36,49,64,81");
	source.finalCheck();
	const dt = Date.now() - t0;
	//ok(dt < 600, "elapsed: " + dt + "ms");
	start();
});

asyncTest("fork/join limit before", 2, (_) => {
	const source = numbers();
	strictEqual(source.limit(10).fork([
		function (src) { return src.map(wait(rand(20, 20))).map(pow(2)); },
		function (src) { return src.buffer(Infinity).map(wait(rand(10, 10))).map(pow(3)); },
	]).join(minJoiner).pipe(_, arraySink()).toArray().join(','), "0,1,4,8,9,16,25,27,36,49,64,81,125,216,343,512,729");
	source.finalCheck();
	start();
});

asyncTest("fork/join limit after", 2, (_) => {
	const source = numbers();
	strictEqual(source.fork([
		function (src) { return src.map(wait(rand(20, 20))).map(pow(2)); },
		function (src) { return src.buffer(Infinity).map(wait(rand(10, 10))).map(pow(3)); },
	]).join(minJoiner).limit(12).pipe(_, arraySink()).toArray().join(','), "0,1,4,8,9,16,25,27,36,49,64,81");
	source.finalCheck();
	start();
});

asyncTest("fork/join limit one branch", 2, (_) => {
	const source = numbers();
	strictEqual(source.fork([
		function (src) { return src.map(wait(rand(20, 20))).map(pow(2)).limit(3); },
		function (src) { return src.buffer(6).map(wait(rand(10, 10))).map(pow(3)); },
	]).join(minJoiner).limit(10).pipe(_, arraySink()).toArray().join(','), "0,1,4,8,27,64,125,216,343,512");
	source.finalCheck();
	start();
});

asyncTest("fork slow and fast", 3, (_) => {
	const source = numbers();
	const readers = source.fork([
		function (src) { return src.map(wait(rand(20, 20))).map(pow(2)); },
		function (src) { return src.map(wait(rand(10, 10))).map(pow(3)); },
	]).readers;
	const f1 = _.future(_ => readers[0]!.limit(10).pipe(_, arraySink()));
	const f2 = _.future(_ => readers[1]!.limit(10).pipe(_, arraySink()));
	strictEqual(f1(_).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual(f2(_).toArray().join(','), "0,1,8,27,64,125,216,343,512,729");
	source.finalCheck();
	start();
});

asyncTest("fork slow and fast with different limits (fast ends first)", 3, (_) => {
	const source = numbers();
	const readers = source.fork([
		function (src) { return src.map(wait(rand(20, 20))).map(pow(2)).limit(10); },
		function (src) { return src.map(wait(rand(10, 10))).map(pow(3)).limit(4); },
	]).readers;
	const f1 = _.future(_ => readers[0]!.pipe(_, arraySink()));
	const f2 = _.future(_ => readers[1]!.pipe(_, arraySink()));
	strictEqual(f1(_).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual(f2(_).toArray().join(','), "0,1,8,27");
	source.finalCheck();
	start();
});

asyncTest("fork slow and fast with different limits (slow ends first)", 3, (_) => {
	const source = numbers();
	const readers = source.fork([
		function (src) { return src.map(wait(rand(10, 10))).map(pow(2)).limit(10); },
		function (src) { return src.map(wait(rand(20, 20))).map(pow(3)).limit(4); },
	]).readers;
	const f1 = _.future(_ => readers[0]!.pipe(_, arraySink()));
	const f2 = _.future(_ => readers[1]!.pipe(_, arraySink()));
	strictEqual(f1(_).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual(f2(_).toArray().join(','), "0,1,8,27");
	source.finalCheck();
	start();
});

