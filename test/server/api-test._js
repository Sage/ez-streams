"use strict";
QUnit.module(module.id);

var generic = require("ez-streams").devices.generic;
var arraySink = require("ez-streams").devices.array.writer;

function numbers(limit) {
	var i = 0;
	var source = generic.reader(function read(_) {
		return i >= limit ? undefined : i++;
	}, function stop(_, arg) {
		this.stopped = {
			at: i,
			arg: arg,
		};
	});
	source.finalCheck = function() {
		ok(this.stopped || i == limit);
	}
	return source;
}

function minJoiner(_, values) {
	var min = Math.min.apply(null, values.filter(function(val) { return val !== undefined; }));
	values.forEach(function(val, i) {
		if (val == min) values[i] = undefined;
	});
	return min;
}

asyncTest("forEach", 2, function(_) {
	var results = [];
	var source = numbers(5);
	source.forEach(_, function(_, num) {
		results.push(num);
	});
	strictEqual(results.join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("map", 2, function(_) {
	var source = numbers(5);
	strictEqual(source.map(function(_, num) {
		return num * num;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,4,9,16");
	source.finalCheck();
	start();
});

asyncTest("every", 12, function(_) {
	var source;
	strictEqual((source = numbers(5)).every(_, function(_, num) {
		return num < 5;
	}), true);
	source.finalCheck();
	strictEqual((source = numbers(5)).every(_, function(_, num) {
		return num < 4;
	}), false);
	source.finalCheck();
	strictEqual((source = numbers(5)).every(_, function(_, num) {
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

asyncTest("some", 12, function(_) {
	var source;
	strictEqual((source = numbers(5)).some(_, function(_, num) {
		return num >= 5;
	}), false);
	source.finalCheck();
	strictEqual((source = numbers(5)).some(_, function(_, num) {
		return num >= 4;
	}), true);
	source.finalCheck();
	strictEqual((source = numbers(5)).some(_, function(_, num) {
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

asyncTest("reduce", 2, function(_) {
	var source = numbers(5);
	strictEqual(source.reduce(_, function(_, r, num) {
		return r + '/' + num;
	}, ""), "/0/1/2/3/4");
	source.finalCheck();
	start();
});

asyncTest("toArray", 2, function(_) {
	var source = numbers(5);
	deepEqual(source.toArray(_), [0, 1, 2, 3, 4]);
	source.finalCheck();
	start();
});

asyncTest("pipe", 2, function(_) {
	var source = numbers(5);
	strictEqual(source.pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("tee", 3, function(_) {
	var source = numbers(5);
	var secondary = arraySink();
	strictEqual(source.tee(secondary).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	strictEqual(secondary.toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("dup", 3, function(_) {
	var source = numbers(5);
	var streams = source.dup();
	var f1 = streams[0].toArray(!_);
	var f2 = streams[1].toArray(!_);
	strictEqual(f1(_).join(','), "0,1,2,3,4");
	strictEqual(f2(_).join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("concat", 4, function(_) {
	var source;
	var rd1 = (source = numbers(5)).concat(numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(12));
	strictEqual(rd1.toArray(_).join(), "0,1,2,3,4,6,7,12,13,14");
	source.finalCheck();
	var rd2 = (source = numbers(5)).concat([numbers(8).skip(6), numbers(10).skip(10), numbers(15).skip(12)]);
	strictEqual(rd2.toArray(_).join(), "0,1,2,3,4,6,7,12,13,14");
	source.finalCheck();
	start();
});

asyncTest("transform - same number of reads and writes", 2, function(_) {
	var source = numbers(5);
	strictEqual(source.transform(function(_, reader, writer) {
		var sum = 0, val;
		while ((val = reader.read(_)) !== undefined) {
			sum += val;
			writer.write(_, sum);
		}
	}).pipe(_, arraySink()).toArray().join(','), "0,1,3,6,10");
	source.finalCheck();
	start();
});

asyncTest("transform - more reads than writes", 2, function(_) {
	var source = numbers(12);
	strictEqual(source.transform(function(_, reader, writer) {
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
	source.finalCheck();
	start();
});

asyncTest("transform - less reads than writes", 2, function(_) {
	var source = numbers(5);
	strictEqual(source.transform(function(_, reader, writer) {
		var str = "", val;
		while ((val = reader.read(_)) !== undefined) {
			for (var i = 0; i < val; i++) writer.write(_, val);
		}
	}).pipe(_, arraySink()).toArray().join(','), "1,2,2,3,3,3,4,4,4,4");
	source.finalCheck();
	start();
});

asyncTest("filter", 4, function(_) {
	var source;
	strictEqual((source = numbers(10)).filter(function(_, val) {
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

asyncTest("while", 4, function(_) {
	var source;
	strictEqual((source = numbers()).while(function(_, val) {
		return val < 5;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	strictEqual((source = numbers()).while({
		$lt: 5,
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("until", 4, function(_) {
	var source;
	strictEqual((source = numbers()).until(function(_, val) {
		return val > 5;
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5");
	source.finalCheck();
	strictEqual((source = numbers()).until({
		$gt: 5,
	}).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5");
	source.finalCheck();
	start();
});

asyncTest("limit", 2, function(_) {
	var source;
	strictEqual((source = numbers()).limit(5).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4");
	source.finalCheck();
	start();
});

asyncTest("skip", 1, function(_) {
	var source;
	strictEqual((source = numbers()).skip(2).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
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
		setTimeout(_, ms)
		return val;
	}
}

function rand(min, max) {
	return function() {
		return min + Math.round(Math.random() * (max - min));
	};
}

asyncTest("buffer in simple chain", 6, function(_) {
	var source;
	strictEqual((source = numbers()).buffer(3).skip(2).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	source.finalCheck();
	strictEqual((source = numbers()).skip(2).buffer(3).limit(5).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	source.finalCheck();
	strictEqual((source = numbers()).skip(2).limit(5).buffer(3).pipe(_, arraySink()).toArray().join(','), "2,3,4,5,6");
	source.finalCheck();
	start();
});
asyncTest("buffer with slower input", 2, function(_) {
	var source;
	strictEqual((source = numbers()).limit(10).map(wait(20)).buffer(5).map(wait(10)).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5,6,7,8,9");
	source.finalCheck();
	start();
});

asyncTest("buffer with faster input", 2, function(_) {
	var source;
	strictEqual((source = numbers()).limit(10).map(wait(10)).buffer(5).map(wait(20)).pipe(_, arraySink()).toArray().join(','), "0,1,2,3,4,5,6,7,8,9");
	source.finalCheck();
	start();
});

asyncTest("parallel preserve order", 2, function(_) {
	var t0 = Date.now();
	var source;
	strictEqual((source = numbers()).limit(10).parallel(4, function(source) {
		return source.map(wait(rand(10, 10))).map(pow(2));
	}).pipe(_, arraySink()).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	source.finalCheck();
	var dt = Date.now() - t0;
	//ok(dt < 600, "elapsed: " + dt + "ms");
	start();
});

asyncTest("parallel shuffle", 2, function(_) {
	var t0 = Date.now();
	var source;
	strictEqual((source = numbers()).limit(10).parallel({
		count: 4,
		shuffle: true,
	}, function(source) {
		return source.map(wait(rand(10, 10))).map(pow(2));
	}).pipe(_, arraySink()).toArray().sort(function(i, j) {
		return i - j;
	}).join(','), "0,1,4,9,16,25,36,49,64,81");
	source.finalCheck();
	var dt = Date.now() - t0;
	//ok(dt < 600, "elapsed: " + dt + "ms");
	start();
});

asyncTest("fork/join limit before", 2, function(_) {
	var source;
	strictEqual((source = numbers()).limit(10).fork([
		function(src) { return src.map(wait(rand(20, 20))).map(pow(2)); },
		function(src) { return src.buffer(Infinity).map(wait(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).pipe(_, arraySink()).toArray().join(','), "0,1,4,8,9,16,25,27,36,49,64,81,125,216,343,512,729");
	source.finalCheck();
	start();
});

asyncTest("fork/join limit after", 2, function(_) {
	var source;
	strictEqual((source = numbers()).fork([
		function(src) { return src.map(wait(rand(20, 20))).map(pow(2)); },
		function(src) { return src.buffer(Infinity).map(wait(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).limit(12).pipe(_, arraySink()).toArray().join(','), "0,1,4,8,9,16,25,27,36,49,64,81");
	source.finalCheck();
	start();
});

asyncTest("fork/join limit one branch", 2, function(_) {
	var source;
	strictEqual((source = numbers()).fork([
		function(src) { return src.map(wait(rand(20, 20))).map(pow(2)).limit(3); },
		function(src) { return src.buffer(6).map(wait(rand(10, 10))).map(pow(3)); },
		]).join(minJoiner).limit(10).pipe(_, arraySink()).toArray().join(','),  "0,1,4,8,27,64,125,216,343,512");
	source.finalCheck();
	start();
});

asyncTest("fork slow and fast", 3, function(_) {
	var source;
	var readers = (source = numbers()).fork([
		function(src) { return src.map(wait(rand(20, 20))).map(pow(2)); },
		function(src) { return src.map(wait(rand(10, 10))).map(pow(3)); },
		]).readers;
	var f1 = readers[0].limit(10).pipe(!_, arraySink());
	var f2 = readers[1].limit(10).pipe(!_, arraySink());
	strictEqual(f1(_).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual(f2(_).toArray().join(','), "0,1,8,27,64,125,216,343,512,729");
	source.finalCheck();
	start();
});

asyncTest("fork slow and fast with different limits (fast ends first)", 3, function(_) {
	var source;
	var readers = (source = numbers()).fork([
		function(src) { return src.map(wait(rand(20, 20))).map(pow(2)).limit(10); },
		function(src) { return src.map(wait(rand(10, 10))).map(pow(3)).limit(4); },
		]).readers;
	var f1 = readers[0].pipe(!_, arraySink());
	var f2 = readers[1].pipe(!_, arraySink());
	strictEqual(f1(_).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual(f2(_).toArray().join(','), "0,1,8,27");
	source.finalCheck();
	start();
});

asyncTest("fork slow and fast with different limits (slow ends first)", 3, function(_) {
	var source;
	var readers = (source = numbers()).fork([
		function(src) { return src.map(wait(rand(10, 10))).map(pow(2)).limit(10); },
		function(src) { return src.map(wait(rand(20, 20))).map(pow(3)).limit(4); },
		]).readers;
	var f1 = readers[0].pipe(!_, arraySink());
	var f2 = readers[1].pipe(!_, arraySink());
	strictEqual(f1(_).toArray().join(','), "0,1,4,9,16,25,36,49,64,81");
	strictEqual(f2(_).toArray().join(','), "0,1,8,27");
	source.finalCheck();
	start();
});

