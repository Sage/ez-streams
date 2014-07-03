"use strict";
QUnit.module(module.id);

var ez = require("../..")
var galaxy = require('galaxy');
var generic = ez.devices.generic;
var arraySink = ez.devices.array.writer;

function numbers(limit) {
	var i = 0;
	return ez.devices.galaxy.reader(function* readStar() {
		return i >= limit ? undefined : i++;
	});
}

function* minJoiner(values) {
	var min = Math.min.apply(null, values.filter(function(val) {
		return val !== undefined;
	}));
	values.forEach(function(val, i) {
		if (val == min) values[i] = undefined;
	});
	return min;
}

function starTest(name, count, fn) {
	asyncTest(name, count, galaxy.unstar(fn));
}

starTest("forEach", 1, function*() {
	var results = [];
	yield numbers(5).forEachStar(function*(num) {
		results.push(num);
	});
	strictEqual(results.join(','), "0,1,2,3,4");
	start();
});

starTest("map", 1, function*() {
	strictEqual((yield numbers(5).map(function*(num) {
		return num * num;
	}).toArrayStar()).join(','), "0,1,4,9,16");
	start();
});

starTest("every", 3, function*() {
	strictEqual(yield numbers(5).everyStar(function*(num) {
		return num < 5;
	}), true);
	strictEqual(yield numbers(5).everyStar(function*(num) {
		return num < 4;
	}), false);
	strictEqual(yield numbers(5).everyStar(function*(num) {
		return num != 2;
	}), false);
	start();
});

starTest("some", 3, function*() {
	strictEqual(yield numbers(5).someStar(function*(num) {
		return num >= 5;
	}), false);
	strictEqual(yield numbers(5).someStar(function*(num) {
		return num >= 4;
	}), true);
	strictEqual(yield numbers(5).someStar(function*(num) {
		return num != 2;
	}), true);
	start();
});

starTest("reduce", 1, function*() {
	strictEqual(yield numbers(5).reduceStar(function*(r, num) {
		return r + '/' + num;
	}, ""), "/0/1/2/3/4");
	start();
});

starTest("toArray", 1, function*() {
	deepEqual(yield numbers(5).toArrayStar(), [0, 1, 2, 3, 4]);
	start();
});

starTest("pipe", 1, function*() {
	strictEqual((yield numbers(5).pipeStar(arraySink())).toArray().join(','), "0,1,2,3,4");
	start();
});

starTest("transform - same number of reads and writes", 1, function*() {
	strictEqual((yield numbers(5).transform(function*(reader, writer) {
		var sum = 0,
			val;
		while ((val = yield reader.readStar()) !== undefined) {
			sum += val;
			yield writer.writeStar(sum);
		}
	}).toArrayStar()).join(','), "0,1,3,6,10");
	start();
});

starTest("transform - more reads than writes", 1, function*() {
	strictEqual((yield numbers(12).transform(function*(reader, writer) {
		var str = "",
			val;
		while ((val = yield reader.readStar()) !== undefined) {
			str += "-" + val;
			if (val % 5 === 4) {
				yield writer.writeStar(str);
				str = "";
			}
		}
		yield writer.writeStar(str);
	}).toArrayStar()).join('/'), "-0-1-2-3-4/-5-6-7-8-9/-10-11");
	start();
});

starTest("transform - less reads than writes", 1, function*() {
	strictEqual((yield numbers(5).transform(function*(reader, writer) {
		var str = "",
			val;
		while ((val = yield reader.readStar()) !== undefined) {
			for (var i = 0; i < val; i++) yield writer.writeStar(val);
		}
	}).toArrayStar()).join(','), "1,2,2,3,3,3,4,4,4,4");
	start();
});

starTest("filter", 1, function*() {
	strictEqual((yield numbers(10).filter(function*(val) {
		return val % 2;
	}).toArrayStar()).join(','), "1,3,5,7,9");
	start();
});

starTest("while", 1, function*() {
	strictEqual((yield numbers().
	while (function*(val) {
		return val < 5;
	}).toArrayStar()).join(','), "0,1,2,3,4");
	start();
});

starTest("until", 1, function*() {
	strictEqual((yield numbers().until(function*(val) {
		return val > 5;
	}).toArrayStar()).join(','), "0,1,2,3,4,5");
	start();
});

starTest("limit", 1, function*() {
	strictEqual((yield numbers().limit(5).toArrayStar()).join(','), "0,1,2,3,4");
	start();
});

starTest("skip", 1, function*() {
	strictEqual((yield numbers().skip(2).limit(5).toArrayStar()).join(','), "2,3,4,5,6");
	start();
});

function pow(n) {
	return function*(val) {
		return Math.pow(val, n);
	}
}

function wait(millis) {
	return function*(val) {
		var ms = typeof millis === "function" ? millis() : millis;
		yield galaxy.star(setTimeout, -1)(ms);
		return val;
	}
}

function rand(min, max) {
	return function() {
		return min + Math.round(Math.random() * (max - min));
	};
}

starTest("buffer in simple chain", 3, function*() {
	strictEqual((yield numbers().buffer(3).skip(2).limit(5).toArrayStar()).join(','), "2,3,4,5,6");
	strictEqual((yield numbers().skip(2).buffer(3).limit(5).toArrayStar()).join(','), "2,3,4,5,6");
	strictEqual((yield numbers().skip(2).limit(5).buffer(3).toArrayStar()).join(','), "2,3,4,5,6");
	start();
});

starTest("buffer with slower input", 1, function*() {
	strictEqual((yield numbers().limit(10).map(wait(20)).buffer(5).map(wait(10)).toArrayStar()).join(','), "0,1,2,3,4,5,6,7,8,9");
	start();
});

starTest("buffer with faster input", 1, function*() {
	strictEqual((yield numbers().limit(10).map(wait(10)).buffer(5).map(wait(20)).toArrayStar()).join(','), "0,1,2,3,4,5,6,7,8,9");
	start();
});

starTest("parallel preserve order", 1, function*() {
	var t0 = Date.now();
	strictEqual((yield numbers().limit(10).parallel(4, function(source) {
		return source.map(wait(rand(10, 10))).map(pow(2));
	}).toArrayStar()).join(','), "0,1,4,9,16,25,36,49,64,81");
	var dt = Date.now() - t0;
	//ok(dt < 600, "elapsed: " + dt + "ms");
	start();
});

starTest("parallel shuffle", 1, function*() {
	var t0 = Date.now();
	strictEqual((yield numbers().limit(10).parallel({
		count: 4,
		shuffle: true,
	}, function(source) {
		return source.map(wait(rand(10, 10))).map(pow(2));
	}).toArrayStar()).sort(function(i, j) {
		return i - j;
	}).join(','), "0,1,4,9,16,25,36,49,64,81");
	var dt = Date.now() - t0;
	//ok(dt < 600, "elapsed: " + dt + "ms");
	start();
});

starTest("fork/join limit before", 1, function*() {
	strictEqual((yield numbers().limit(10).fork([

	function(source) {
		return source.map(wait(rand(20, 20))).map(pow(2));
	}, function(source) {
		return source.buffer(Infinity).map(wait(rand(10, 10))).map(pow(3));
	}]).join(minJoiner).toArrayStar()).join(','), "0,1,4,8,9,16,25,27,36,49,64,81,125,216,343,512,729");
	start();
});

starTest("fork/join limit after", 1, function*() {
	strictEqual((yield numbers().fork([

	function(source) {
		return source.map(wait(rand(20, 20))).map(pow(2));
	}, function(source) {
		return source.buffer(Infinity).map(wait(rand(10, 10))).map(pow(3));
	}]).join(minJoiner).limit(12).toArrayStar()).join(','), "0,1,4,8,9,16,25,27,36,49,64,81");
	start();
});

starTest("fork/join limit one branch", 1, function*() {
	strictEqual((yield numbers().fork([

	function(source) {
		return source.map(wait(rand(20, 20))).map(pow(2)).limit(3);
	}, function(source) {
		return source.buffer(6).map(wait(rand(10, 10))).map(pow(3));
	}]).join(minJoiner).limit(10).toArrayStar()).join(','), "0,1,4,8,27,64,125,216,343,512");
	start();
});

starTest("fork slow and fast", 2, function*() {
	var readers = numbers().fork([

	function(source) {
		return source.map(wait(rand(20, 20))).map(pow(2));
	}, function(source) {
		return source.map(wait(rand(10, 10))).map(pow(3));
	}, ]).readers;
	var f1 = galaxy.spin(readers[0].limit(10).toArrayStar());
	var f2 = galaxy.spin(readers[1].limit(10).toArrayStar());
	strictEqual((yield f1()).join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual((yield f2()).join(','), "0,1,8,27,64,125,216,343,512,729");
	start();
});

starTest("fork slow and fast with different limits (fast ends first)", 2, function*() {
	var readers = numbers().fork([

	function(source) {
		return source.map(wait(rand(20, 20))).map(pow(2)).limit(10);
	}, function(source) {
		return source.map(wait(rand(10, 10))).map(pow(3)).limit(4);
	}, ]).readers;
	var f1 = galaxy.spin(readers[0].toArrayStar());
	var f2 = galaxy.spin(readers[1].toArrayStar());
	strictEqual((yield f1()).join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual((yield f2()).join(','), "0,1,8,27");
	start();
});

starTest("fork slow and fast with different limits (slow ends first)", 2, function*() {
	var readers = numbers().fork([

	function(source) {
		return source.map(wait(rand(10, 10))).map(pow(2)).limit(10);
	}, function(source) {
		return source.map(wait(rand(20, 20))).map(pow(3)).limit(4);
	}, ]).readers;
	var f1 = galaxy.spin(readers[0].toArrayStar());
	var f2 = galaxy.spin(readers[1].toArrayStar());
	strictEqual((yield f1()).join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual((yield f2()).join(','), "0,1,8,27");
	start();
});