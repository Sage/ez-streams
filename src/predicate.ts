import { _ } from "streamline-runtime";

export interface Options {
	allowEval?: boolean;
}

export type Predicate = (_: _, val: any) => boolean;
export type Op = (val: any, parent?: any) => Predicate;

export function converter(options?: Options) {
	options = options || {};

	const pfalse: Predicate = (_, obj) => false;
	const ptrue: Predicate = (_, obj) => true;

	const ops: { [name: string]: Op} = {
		$eq: (val) => ((_, v) => v == val),
		$ne: (val) => ((_, v) => v != val),
		$gt: (val) => ((_, v) => v > val),
		$gte: (val) => ((_, v) => v >= val),
		$lt: (val) => ((_, v) => v < val),
		$lte: (val) => ((_, v) => v <= val),
		$in: (val) => ((_, v) => val.indexOf(v) >= 0),
		$nin: (val) => ((_, v) => val.indexOf(v) < 0),
		$and: (val) => and(val.map(convert)),
		$or: (val) => or(val.map(convert)),
		$nor: (val) => not(or(val.map(convert))),
		$not: (val) => not(convert(val)),
		$exists: (val) => ((_, v) => val in v),
		$type: (val) => ((_, v) => typeof v === val),
		$mod: (val) => ((_, v) => v % val[0] === val[1]),
		$regex: (val, parent) => {
			const re = new RegExp(val, parent.$options || "");
			return (_, v) => re.test(v);
		},
		$options: (val, parent) => {
			if (parent.$regex == null) throw new Error("$options without $regex");
			return ptrue;
		},
		/*$text: (val) => {
			throw new Error("$text not supported");
		},*/
		$where: (val) => {
			if (typeof val !== "function") {
				if (options.allowEval) val = new Function("return (" + val + ")");
				else throw new Error("$where value is not a function");
			}
			return (_, v) => val.call(v);
		},
		$elemMatch: (val) => {
			const pred = convert(val);
			return (_, v) => {
				// if v is not array, treat it as single element array
				if (!Array.isArray(v)) return pred(_, v);
				return v.some_(_, pred);
			};
		},
		$all: (val) => {
			if (!Array.isArray(val)) throw new Error("$all value is not an array");
			return and(val.map(ops['$elemMatch']));
		},
		$size: (val) => compose(ops['$eq'](val), deref('length')),

		// geospatial operators not supported
	}

	const re_test = (re: RegExp) => ((_: _, val: any) => re.test(val));
	const not = (predicate: Predicate) => ((_: _, obj: any) => !predicate(_, obj));

	const or = (predicates: Predicate[]) => {
		if (predicates.length === 0) return pfalse;
		if (predicates.length === 1) return predicates[0];
		return (_:_, obj: any) => predicates.some_(_, (_, predicate) => predicate(_, obj));
	}

	const and = (predicates: Predicate[]) => {
		if (predicates.length === 0) return ptrue;
		if (predicates.length === 1) return predicates[0];
		return (_: _, obj: any) => predicates.every_(_, (_, predicate) => predicate(_, obj));
	}

	const compose = (f: Predicate, g: Predicate) => ((_: _, obj: any) => f(_, g(_, obj)));

	const deref = (key: string) => ((_: _, obj: any) => {
			if (obj == null) return undefined;
			const v = obj[key];
			return typeof v === "function" ? v(_) : v;
	});

	const walk: (p: string) => Predicate = (p) => {
		const i = p.indexOf('.');
		if (i >= 0) {
			return compose(walk(p.substring(i + 1)), walk(p.substring(0, i)));
		} else {
			return deref(p);
		}
	}

	const convert: (val: any) => Predicate = (val) => {
		if (val instanceof RegExp) {
			return re_test(val);
		} else if (typeof val === "object" && val) {
			return and(Object.keys(val).map((k) => {
				const v = val[k];
				if (k[0] === '$') {
					if (!ops[k]) throw new Error("bad operator: " + k);
					return ops[k](v, val);
				} else {
					return compose(convert(v), walk(k));
				}
			}));
		} else {
			return ops['$eq'](val);
		}
	};
	return convert;
};


export const convert = converter();
