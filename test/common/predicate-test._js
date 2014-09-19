"use strict";
QUnit.module(module.id);

var predicate = require("ez-streams/lib/predicate").predicate;

function t(_, pred, obj, result) {
	equals(predicate(pred)(_, obj), result, JSON.stringify(pred) + " with " + JSON.stringify(obj) + " => " + result);
}

asyncTest("direct values", 6, function(_) {
	t(_, 5, 5, true);
	t(_, 5, 6, false);
	t(_, 'a', 'a', true);
	t(_, 'a', 'aa', false);
	t(_, true, true, true);
	t(_, true, false, false);
	start();
});

asyncTest("gt", 3, function(_) {
	t(_, {
		$gt: 4,
	}, 5, true);

	t(_, {
		$gt: 5,
	}, 5, false);

	t(_, {
		$gt: 6,
	}, 5, false);

	start();
});

asyncTest("gte", 3, function(_) {
	t(_, {
		$gte: 4,
	}, 5, true);

	t(_, {
		$gte: 5,
	}, 5, true);

	t(_, {
		$gte: 6,
	}, 5, false);

	start();
});

asyncTest("lt", 3, function(_) {
	t(_, {
		$lt: 4,
	}, 5, false);

	t(_, {
		$lt: 5,
	}, 5, false);

	t(_, {
		$lt: 6,
	}, 5, true);

	start();
});

asyncTest("lte", 3, function(_) {
	t(_, {
		$lte: 4,
	}, 5, false);

	t(_, {
		$lte: 5,
	}, 5, true);

	t(_, {
		$lte: 6,
	}, 5, true);

	start();
});

asyncTest("ne", 3, function(_) {
	t(_, {
		$ne: 4,
	}, 5, true);

	t(_, {
		$ne: 5,
	}, 5, false);

	t(_, {
		$ne: 6,
	}, 5, true);


	start();
});

asyncTest("range", 3, function(_) {
	t(_, {
		$gte: 3,
		$lte: 7,
	}, 2, false);

	t(_, {
		$gte: 3,
		$lte: 7,
	}, 5, true);

	t(_, {
		$gte: 3,
		$lte: 7,
	}, 8, false);

	start();
});

asyncTest("regexp", 2, function(_) {
	t(_, /^hel/, 'hello', true);
	t(_, /^hel/, 'world', false);

	start();
});

asyncTest("and", 2, function(_) {
	t(_, {
		$and: [2, 5],
	}, 5, false);

	t(_, {
		$and: [5, 5],
	}, 5, true);

	start();
});

asyncTest("or", 2, function(_) {
	t(_, {
		$or: [2, 5],
	}, 5, true);

	t(_, {
		$or: [2, 6],
	}, 5, false);

	start();
});

asyncTest("nor", 2, function(_) {
	t(_, {
		$nor: [2, 5],
	}, 5, false);

	t(_, {
		$nor: [2, 6],
	}, 5, true);

	start();
});

asyncTest("not", 2, function(_) {
	t(_, {
		$not: {
			$gt: 2
		},
	}, 5, false);

	t(_, {
		$not: {
			$lt: 2
		},
	}, 5, true);

	start();
});

asyncTest("in", 3, function(_) {
	t(_, {
		$in: [2, 3, 5]
	}, 3, true);

	t(_, {
		$in: [2, 3, 5]
	}, 4, false);

	t(_, {
		$in: [2, 3, 5]
	}, 5, true);

	start();
});

asyncTest("not in", 3, function(_) {
	t(_, {
		$nin: [2, 3, 5]
	}, 3, false);

	t(_, {
		$nin: [2, 3, 5]
	}, 4, true);

	t(_, {
		$nin: [2, 3, 5]
	}, 5, false);

	start();
});

asyncTest("empty and", 2, function(_) {
	t(_, {}, {}, true);

	t(_, {}, {
		a: 5,
	}, true);

	start();
});

asyncTest("empty or", 2, function(_) {
	t(_, {
		$or: []
	}, {}, false);

	t(_, {
		$or: []
	}, {
		a: 5,
	}, false);

	start();
});

asyncTest("single property", 2, function(_) {
	t(_, {
		a: 5,
	}, {
		a: 5,
		b: 3,
	}, true);

	t(_, {
		a: 6,
	}, {
		a: 5,
		b: 3,
	}, false);
	start();
});

asyncTest("implicit and (multiple properties)", 2, function(_) {
	t(_, {
		a: 5,
		b: 3,
	}, {
		a: 5,
		b: 3,
	}, true);

	t(_, {
		a: 5,
		b: 3,
	}, {
		a: 5,
	}, false);

	start();
});

asyncTest("walk", 5, function(_) {
	t(_, {
		'a.b': /^hel/,
	}, {
		a: {
			b: 'hello',
		}
	}, true);

	t(_, {
		'a.b': /^hel/,
	}, {
		a: {
			c: 'hello',
		}
	}, false);

	t(_, {
		'a.c': /^hel/,
	}, {
		b: {
			c: 'hello',
		}
	}, false);

	t(_, {
		'a.b.c': /^hel/,
	}, {
		a: {
			b: {
				c: 'hello',
			}
		}
	}, true);

	t(_, {
		'a.b.c': /^hel/,
	}, {
		a: {
			b: {
				c: 'world',
			}
		}
	}, false);

	start();
});