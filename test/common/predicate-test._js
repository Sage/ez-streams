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

asyncTest("empty and", 2, function(_) {
	t(_, {}, {}, true);

	t(_, {}, {
		a: 5,
	}, true);

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

asyncTest("exists", 3, function(_) {
	t(_, {
		$exists: "a"
	}, {
		a: 5,
	}, true);

	t(_, {
		$exists: "a"
	}, {
		a: undefined,
	}, true);

	t(_, {
		$exists: "a"
	}, {
		b: 5,
	}, false);

	start();
});

asyncTest("type", 3, function(_) {
	t(_, {
		$type: "number"
	}, 5, true);

	t(_, {
		$type: "object"
	}, {}, true);

	t(_, {
		$type: "string"
	}, 5, false);

	start();
});

asyncTest("mod", 2, function(_) {
	t(_, {
		$mod: [3, 2]
	}, 5, true);

	t(_, {
		$mod: [4, 2]
	}, 5, false);

	start();
});

asyncTest("regex", 4, function(_) {
	t(_, {
		$regex: "^hel",
	}, "hello", true);

	t(_, {
		$regex: "^hel",
	}, "world", false);

	t(_, {
		$regex: "^hel",
	}, "HeLLo", false);

	t(_, {
		$regex: "^hel",
		$options: "i",
	}, "HeLLo", true);

	start();
});

asyncTest("where", 4, function(_) {
	t(_, {
		$where: "this.a === this.b",
	}, {
		a: 5,
		b: 5,
	}, true);

	t(_, {
		$where: "this.a === this.b",
	}, {
		a: 5,
		b: 6,
	}, false);

	t(_, {
		$where: function() {
			return this.a === this.b;
		},
	}, {
		a: 5,
		b: 5,
	}, true);

	t(_, {
		$where: function() {
			return this.a === this.b;
		},
	}, {
		a: 5,
		b: 6,
	}, false);

	start();
});

asyncTest("elemMatch", 2, function(_) {
	t(_, {
		$elemMatch: {
			$gte: 2,
			$lt: 5,
		},
	}, [1, 3, 5], true);

	t(_, {
		$elemMatch: {
			$gte: 2,
			$lt: 5,
		},
	}, [1, 5, 6], false);

	start();
});

asyncTest("all", 6, function(_) {
	t(_, {
		$all: [2, 4],
	}, [1, 2, 3, 4, 5], true);

	t(_, {
		$all: [2, 4],
	}, [1, 2, 3, 5], false);

	t(_, {
		tags: {
			$all: ["appliance", "school", "book"]
		}
	}, {
		tags: ["school", "book", "bag", "headphone", "appliance"],
	}, true);

	t(_, {
		tags: {
			$all: ["appliance", "school", "book"]
		}
	}, {
		tags: ["school", "bag", "headphone", "appliance"],
	}, false);

	var cond = {
		items: {
			$all: [{
				$elemMatch: {
					size: "M",
					num: {
						$gt: 50
					}
				}
			}, {
				$elemMatch: {
					num: 100,
					color: "green"
				}
			}]
		}
	};
	t(_, cond, {
		items: [{
			size: "S",
			num: 10,
			color: "blue"
		}, {
			size: "M",
			num: 100,
			color: "blue"
		}, {
			size: "L",
			num: 100,
			color: "green"
		}]
	}, true);
	t(_, cond, {
		items: [{
			size: "S",
			num: 10,
			color: "blue"
		}, {
			size: "M",
			num: 100,
			color: "blue"
		}, {
			size: "L",
			num: 100,
			color: "red"
		}]
	}, false);

	start();
});

asyncTest("size", 2, function(_) {
	t(_, {
		$size: 2,
	}, [1, 2], true);

	t(_, {
		$size: 2,
	}, [1, 2, 3], false);

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