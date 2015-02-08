"use strict";
var galaxy = require('galaxy');

// not supported in streamline fast modes
if (/-fast$/.test(require('streamline/lib/globals').runtime)) return;

function isGeneratorFunction(val) {
	return val.constructor.name === 'GeneratorFunction';
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

function wrap(mod) {
	return {
		decorate: function(decorate) {
			return function(proto) {
				decorate.call(this, proto);
				if (proto[mod.constructorArg]) proto[mod.constructorArg + "Star"] = galaxy.star(proto[mod.constructorArg], -1);

				mod.nonReducers && mod.nonReducers.forEach(function(name) {
					// $ postfix avoids conflict with streamline galaxy-fast mode
					proto[name + 'G'] = wrapNonReducer(proto[name]);
				});
				mod.pre && mod.pre.forEach(function(name) {
					// $ postfix avoids conflict with streamline galaxy-fast mode
					proto.pre[name + 'G'] = wrapNonReducer(proto.pre[name]);
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