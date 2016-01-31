"use strict";

exports.nextTick = /^0\./.test(process.versions.node) ? setImmediate : process.nextTick;