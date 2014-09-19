"use strict";

function pfalse(_, obj) {
	return false;
}

function ptrue(_, obj) {
	return true;
}

var ops = {
	$eq: function(val) {
		return function(_, v) {
			return v == val;
		};
	},
	$ne: function(val) {
		return function(_, v) {
			return v != val;
		};
	},
	$gt: function(val) {
		return function(_, v) {
			return v > val;
		};
	},
	$gte: function(val) {
		return function(_, v) {
			return v >= val;
		};
	},
	$lt: function(val) {
		return function(_, v) {
			return v < val;
		};
	},
	$lte: function(val) {
		return function(_, v) {
			return v <= val;
		};
	},
	$in: function(val) {
		return function(_, v) {
			return val.indexOf(v) >= 0;
		}
	},
	$nin: function(val) {
		return function(_, v) {
			return val.indexOf(v) < 0;
		}
	},
	$and: function(val) {
		return and(val.map(exports.predicate));
	},
	$or: function(val) {
		return or(val.map(exports.predicate));
	},
	$nor: function(val) {
		return not(or(val.map(exports.predicate)));
	},
	$not: function(val) {
		return not(exports.predicate(val));
	},
}

function re_test(re) {
	return function(_, val) {
		return re.test(val);
	}
}

function not(predicate) {
	return function(_, obj) {
		return !predicate(_, obj);
	}
}

function or(predicates) {
	if (predicates.length === 0) return pfalse;
	if (predicates.length === 1) return predicates[0];
	return function(_, obj) {
		return predicates.some_(_, function(_, predicate) {
			return predicate(_, obj);
		});
	}
}

function and(predicates) {
	if (predicates.length === 0) return ptrue;
	if (predicates.length === 1) return predicates[0];
	return function(_, obj) {
		return predicates.every_(_, function(_, predicate) {
			return predicate(_, obj);
		});
	}
}

function compose(f, g) {
	return function(_, obj) {
		return f(_, g(_, obj));
	}
}

function deref(key) {
	return function(_, obj) {
		if (obj == null) return undefined;
		var v = obj[key];
		return typeof v === "function" ? v(_) : v;
	}
}

function walk(p) {
	var i = p.indexOf('.');
	if (i >= 0) {
		return compose(walk(p.substring(i + 1)), walk(p.substring(0, i)));
	} else {
		return deref(p);
	}
}

exports.predicate = function(val) {
	if (val instanceof RegExp) {
		return re_test(val);
	} else if (typeof val === "object" && val) {
		return and(Object.keys(val).map(function(k) {
			var v = val[k];
			if (k[0] === '$') {
				if (!ops[k]) throw new Error("bad operator: " + k);
				return ops[k](v);
			} else {
				return compose(exports.predicate(v), walk(k));
			}
		}));
	} else {
		return ops.$eq(val);
	}
};