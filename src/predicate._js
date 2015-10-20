"use strict";

function converter(options) {
	options = options || {};

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
			};
		},
		$nin: function(val) {
			return function(_, v) {
				return val.indexOf(v) < 0;
			};
		},
		$and: function(val) {
			return and(val.map(convert));
		},
		$or: function(val) {
			return or(val.map(convert));
		},
		$nor: function(val) {
			return not(or(val.map(convert)));
		},
		$not: function(val) {
			return not(convert(val));
		},
		$exists: function(val) {
			return function(_, v) {
				return val in v;
			};
		},
		$type: function(val) {
			return function(_, v) {
				return typeof v === val;
			};
		},
		$mod: function(val) {
			return function(_, v) {
				return v % val[0] === val[1];
			};
		},
		$regex: function(val, parent) {
			var re = new RegExp(val, parent.$options || "");
			return function(_, v) {
				return re.test(v);
			};
		},
		$options: function(val, parent) {
			if (parent.$regex == null) throw new Error("$options without $regex");
			return ptrue;
		},
		$text: function(val) {
			throw new Error("$text not supported");
		},
		$where: function(val) {
			if (typeof val !== "function") {
				if (options.allowEval) val = new Function("return (" + val + ")");
				else throw new Error("$where value is not a function");
			}
			return function(_, v) {
				return val.call(v);
			};
		},
		$elemMatch: function(val) {
			var pred = convert(val);
			return function(_, v) {
				// if v is not array, treat it as single element array
				if (!Array.isArray(v)) return pred(_, v);
				return v.some_(_, pred);
			};
		},
		$all: function(val) {
			if (!Array.isArray(val)) throw new Error("$all value is not an array");
			return and(val.map(ops.$elemMatch));
		},
		$size: function(val) {
			return compose(ops.$eq(val), deref('length'));
		},

		// geospatial operators not supported
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

	function convert(val) {
		if (val instanceof RegExp) {
			return re_test(val);
		} else if (typeof val === "object" && val) {
			return and(Object.keys(val).map(function(k) {
				var v = val[k];
				if (k[0] === '$') {
					if (!ops[k]) throw new Error("bad operator: " + k);
					return ops[k](v, val);
				} else {
					return compose(convert(v), walk(k));
				}
			}));
		} else {
			return ops.$eq(val);
		}
	};
	return convert;
}

exports.convert = converter();
exports.converter = converter;