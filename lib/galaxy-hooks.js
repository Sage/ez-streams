"use strict";
var galaxy = require('galaxy');

function isGeneratorFunction(val) {
	return val.constructor.name === 'GeneratorFunction';
}

function wrapAsync(f) {
	return isGeneratorFunction(f) ? galaxy.unstar(f, -1) : f;
}

function wrapNonReducer(f) {
	return function(fn) {
		if (isGeneratorFunction(fn)) arguments[0] = galaxy.unstar(fn, -1);
		return f.apply(this, arguments);
	};
}

function wrapReducer(f, withCallback) {
	f = galaxy.star(f, -1);
	return withCallback ? wrapNonReducer(f) : f;
}

function wrapJoin(f) {
	return function(fns) {
		if (isGeneratorFunction(fns[0])) arguments[0] = fns.map(function(fn) { return galaxy.unstar(fn, -1) });
		return f.apply(this, arguments);
	};
}

function wrap(mod) {
	return {
		decorate: function(decorate) {
			return function(proto) {
				decorate.call(this, proto);
				if (proto[mod.constructorArg]) proto[mod.constructorArg + "Star"] = galaxy.star(proto[mod.constructorArg], -1);

				mod.nonReducers.forEach(function(name) {
					proto[name] = wrapNonReducer(proto[name]);
				});
				mod.pre.forEach(function(name) {
					proto.pre[name] = wrapNonReducer(proto.pre[name]);
				});
				mod.reducersWithCb && mod.reducersWithCb.forEach(function(name) {
					proto[name + "Star"] = wrapReducer(proto[name], true);
				});
				mod.reducersWithoutCb && mod.reducersWithoutCb.forEach(function(name) {
					proto[name + "Star"] = wrapReducer(proto[name], false);
				});
				return proto;
			};
		},
		construct: function(Decorated) {
			return function(fn) {
				Decorated.call(this, fn);
				this[mod.constructorArg + "Star"] = galaxy.star(fn, -1);
			}
		},
	};
};

module.exports = {
	reader: wrap({
		constructorArg: 'read',
		nonReducers: ["map", "transform", "filter", "until", "while"],
		reducersWithCb: ["forEach", "every", "some", "reduce"],
		reducersWithoutCb: ["pipe", "toArray"],
	}),
	writer: wrap({
		constructorArg: 'write',
		pre: ["map", "transform", "filter", "until", "while"],
	}),
	wrapNonReducer: wrapNonReducer,
}