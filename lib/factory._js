"use strict";

var fs = require('fs');
var path = require('path');

// standard factories
var factories = {
    "console": "./devices/console",
    "http": "./devices/http",
    "file": "./devices/file"
}

fs.readdirSync(path.join(__dirname, "../..")).forEach(function(pkg) {
    var pkgPath = path.join(__dirname, "../..", pkg, "package.json");
    if (fs.existsSync(pkgPath)) {
        try {
            // add factories from package.json
            ((require(pkgPath).ez || {}).factories || []).reduce(function(prev, crt) {
                if (crt.protocol && crt.module) {
                    try {
                        prev[crt.protocol] = crt.module;
                    } catch(e) {
                        console.error(e.message);
                    }
                }
                return prev;
            }, factories);
        } catch(e) {
            console.error(e.message);
        }
    }
});

module.exports = function(url) {
    var pp = (url || "").split(":")[0];
    if (!pp) throw new Error("Missing protocol in url: " + url);
    if (!factories[pp]) throw new Error("Missing factory for protocol " + pp);
    //
    return require(factories[pp]).factory(url);
}