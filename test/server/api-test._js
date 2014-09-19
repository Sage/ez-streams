"use strict";
QUnit.module(module.id);

var generic = require("ez-streams").devices.generic;
var arraySink = require("ez-streams").devices.array.writer;

function numbers(limit) {
	var i = 0;
	return generic.reader(function read(_) {
		return i >= limit ? undefined : i++;
	});
}

function minJoiner(_, values) {
	var min = Math.min.apply(null, values.filter(function(val) { return val !== undefined; }));
	values.forEach(function(val, i) {
		if (val == min) values[i] = undefined;
	});
	return min;
}

asyncTest("forEach", 1, function(_) {
	var results = [];
	numbers(5).forEach(_, function(_, num) {
		results.push(num);
	});
	strictEqual(results.join(','), "0,1,2,3,4");
	start();
});

asyncTest("map", 1, function(_) {
	strictEqual(numbers(5).map(function(_, num) {
		return num * num;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,4,9,16");
	start();
});

asyncTest("every", 6, function(_) {
	strictEqual(numbers(5).every(_, function(_, num) {
		return num < 5;
	}), true);
	strictEqual(numbers(5).every(_, function(_, num) {
		return num < 4;
	}), false);
	strictEqual(numbers(5).every(_, function(_, num) {
		return num != 2;
	}), false);
	strictEqual(numbers(5).every(_, {
		$lt: 5,
	}), true);
	strictEqual(numbers(5).every(_, {
		$lt: 4,
	}), false);
	strictEqual(numbers(5).every(_, {
		$ne: 2,
	}), false);
	start();
});

asyncTest("some", 6, function(_) {
	strictEqual(numbers(5).some(_, function(_, num) {
		return num >= 5;
	}), false);
	strictEqual(numbers(5).some(_, function(_, num) {
		return num >= 4;
	}), true);
	strictEqual(numbers(5).some(_, function(_, num) {
		return num != 2;
	}), true);
	strictEqual(numbers(5).some(_, {
		$gte: 5,
	}), false);
	strictEqual(numbers(5).some(_, {
		$gte: 4,
	}), true);
	strictEqual(numbers(5).some(_, {
		$ne: 2,
	}), true);
	start();
});

asyncTest("reduce", 1, function(_) {
	strictEqual(numbers(5).reduce(_, function(_, r, num) {
		return r + '/' + num;
	}, ""), "/0/1/2/3/4");
	start();
});

asyncTest("toArray", 1, function(_) {
	deepEqual(numbers(5).toArray(_), [0, 1, 2, 3, 4]);
	start();
});

asyncTest("pipe", 1, function(_) {
	strictEqual(numbers(5).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	start();
});

asyncTest("transform - same number of reads and writes", 1, function(_) {
	strictEqual(numbers(5).transform(function(_, reader, writer) {
		var sum = 0, val;
		while ((val = reader.read(_)) !== undefined) {
			sum += val;
			writer.write(_, sum);
		}
	}).pipe(_, arraySink()).toArray().join(','), "0,1,3,6,10");
	start();
});

asyncTest("transform - more reads than writes", 1, function(_) {
	strictEqual(numbers(12).transform(function(_, reader, writer) {
		var str = "", val;
		while ((val = reader.read(_)) !== undefined) {
			str += "-" + val;
			if (val % 5 === 4) { 
				writer.write(_, str);
				str = "";
			}
		}
		writer.write(_, str);
	}).pipe(_, arraySink()).toArray().join('/'), "-0-1-2-3-4/-5-6-7-8-9/-10-11");
	start();
});

asyncTest("transform - less reads than writes", 1, function(_) {
	strictEqual(numbers(5).transform(function(_, reader, writer) {
		var str = "", val;
		while ((val = reader.read(_)) !== undefined) {
			for (var i = 0; i < val; i++) writer.write(_, val);
		}
	}).pipe(_, arraySink()).toArray().join(','), "1,2,2,3,3,3,4,4,4,4");
	start();
});

asyncTest("filter", 2, function(_) {
	strictEqual(numbers(10).filter(function(_, val) {
		return val % 2;
	}).pipe(_, arraySink()).toArray().join(','), "1,3,5,7,9");
	strictEqual(numbers(10).filter({
		$gt: 2,
		$lt: 6,
	}).pipe(_, arraySink()).toArray().join(','), "3,4,5");
	start();
});

asyncTest("while", 2, function(_) {
	strictEqual(numbers().while(function(_, val) {
		return val < 5;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	strictEqual(numbers().while({
		$lt: 5,
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	start();
});

asyncTest("until", 2, function(_) {
	strictEqual(numbers().until(function(_, val) {
		return val > 5;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5");
	strictEqual(numbers().until({
		$gt: 5,
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5");
	start();
});

asyncTest("limit", 1, function(_) {
	strictEqual(numbers().limit(5).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	start();
});

asyncTest("skip", 1, function(_) {
	strictEqual(numbers().skip(2).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	start();
});

function pow(n) {
	return function(_, val) {
		return Math.pow(val, n);
	}
}

function wait(millis) {
	return function(_, val) {
		var ms = typeof millis === "function" ? millis() : millis;
		setTimeout(~_, ms)
		return val;
	}
}

function rand(min, max) {
	return function() {
		return min + Math.round(Math.random() * (max - min));
	};
}

asyncTest("buffer in simple chain", 3, function(_) {
	strictEqual(numbers().buffer(3).skip(2).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	strictEqual(numbers().skip(2).buffer(3).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	strictEqual(numbers().skip(2).limit(5).buffer(3).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	start();
});
asyncTest("buffer with slower input", 1, function(_) {
	strictEqual(numbers().limit(10).map(wait(20)).buffer(5).map(wait(10)).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5,6,7,8,9");
	start();
});

asyncTest("buffer with faster input", 1, function(_) {
	strictEqual(numbers().limit(10).map(wait(10)).buffer(5).map(wait(20)).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5,6,7,8,9");
	start();
});

asyncTest("parallel preserve order", 1, function(_) {
	var t0 = Date.now();
	strictEqual(numbers().limit(10).parallel(4, function(source) {
		return source.map(wait(rand(10, 10))).map(pow(2));
	}).pipe(_, arraySink()).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	var dt = Date.now() - t0;
	//ok(dt < 600, "elapsed: " + dt + "ms");
	start();
});

asyncTest("parallel shuffle", 1, function(_) {
	var t0 = Date.now();
	strictEqual(numbers().limit(10).parallel({
		count: 4,
		shuffle: true,
	}, function(source) {
		return source.map(wait(rand(10, 10))).map(pow(2));
	}).pipe(_, arraySink()).toArray().sort(function(i, j) {
		return i - j;
	}).join(','), "0,1,4,9,16,25,36,49,64,81");
	var dt = Date.now() - t0;
	//ok(dt < 600, "elapsed: " + dt + "ms");
	start();
});

asyncTest("fork/join limit before", 1, function(_) {
	strictEqual(numbers().limit(10).fork([
		function(source) { return source.map(wait(rand(20, 20))).map(pow(2)); },
		function(source) { return source.buffer(Infinity).map(wait(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).pipe(_, arraySink()).toArray().join(','), "0,1,4,8,9,16,25,27,36,49,64,81,125,216,343,512,729");
	start();
});

asyncTest("fork/join limit after", 1, function(_) {
	strictEqual(numbers().fork([
		function(source) { return source.map(wait(rand(20, 20))).map(pow(2)); },
		function(source) { return source.buffer(Infinity).map(wait(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).limit(12).pipe(_, arraySink()).toArray().join(','), "0,1,4,8,9,16,25,27,36,49,64,81");
	start();
});

asyncTest("fork/join limit one branch", 1, function(_) {
	strictEqual(numbers().fork([
		function(source) { return source.map(wait(rand(20, 20))).map(pow(2)).limit(3); },
		function(source) { return source.buffer(6).map(wait(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).limit(10).pipe(_, arraySink()).toArray().join(','),  "0,1,4,8,27,64,125,216,343,512");
	start();
});

asyncTest("fork slow and fast", 2, function(_) {
	var readers = numbers().fork([
		function(source) { return source.map(wait(rand(20, 20))).map(pow(2)); },
		function(source) { return source.map(wait(rand(10, 10))).map(pow(3)); },
		]).readers;
	var f1 = readers[0].limit(10).pipe(!_, arraySink());
	var f2 = readers[1].limit(10).pipe(!_, arraySink());
	strictEqual(f1(_).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual(f2(_).toArray().join(','), "0,1,8,27,64,125,216,343,512,729");
	start();
});

asyncTest("fork slow and fast with different limits (fast ends first)", 2, function(_) {
	var readers = numbers().fork([
		function(source) { return source.map(wait(rand(20, 20))).map(pow(2)).limit(10); },
		function(source) { return source.map(wait(rand(10, 10))).map(pow(3)).limit(4); },
		]).readers;
	var f1 = readers[0].pipe(!_, arraySink());
	var f2 = readers[1].pipe(!_, arraySink());
	strictEqual(f1(_).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual(f2(_).toArray().join(','), "0,1,8,27");
	start();
});

asyncTest("fork slow and fast with different limits (slow ends first)", 2, function(_) {
	var readers = numbers().fork([
		function(source) { return source.map(wait(rand(10, 10))).map(pow(2)).limit(10); },
		function(source) { return source.map(wait(rand(20, 20))).map(pow(3)).limit(4); },
		]).readers;
	var f1 = readers[0].pipe(!_, arraySink());
	var f2 = readers[1].pipe(!_, arraySink());
	strictEqual(f1(_).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual(f2(_).toArray().join(','), "0,1,8,27");
	start();
});

