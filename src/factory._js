"use strict";

const fs = require('fs');
const path = require('path');

const glob = typeof global === "object" ? global : window;
const secret = "_6522f20750bf404ea2fbccd561613115";
const factories = (glob[secret] = (glob[secret] || {
    // standard factories
    "console": "./devices/console",
    "http": "./devices/http",
    "https": "./devices/http",
    "file": "./devices/file",
    "string": "./devices/string",
}));

function scanDirs(dir) {
    const tryPackage = (pkgPath, fromDir) => {
        if (!fs.existsSync(pkgPath)) return;
        try {
            // add factories from package.json
            var pk = require(pkgPath);
            if (pk && pk.ez && pk.ez.factories) {
                pk.ez.factories.forEach((crt) => {
                    if (crt.protocol && crt.module) {
                        factories[crt.protocol] = fromDir ? crt.module.replace(/^.*([\\\/])/, fromDir + '$1') : crt.module;
                    }
                });    
            }
        } catch(e) {
            console.error(e.message);
        }
    };
    const ndir = path.join(dir, "../node_modules");
    if (fs.existsSync(ndir)) {
        fs.readdirSync(ndir).forEach((pkg) => {
            tryPackage(path.join(ndir, pkg, "package.json"));
        });
    }
    const d = path.join(dir, '..');
    // try also package.json inside parent directory - for travis-ci
    tryPackage(path.join(d, "package.json"), d);
    if (d.length < dir.length) scanDirs(d);
}

scanDirs(__dirname);

module.exports = function(url) {
    const parts = (url || "").split(":");
    if (parts.length < 2) throw new Error("invalid URL: " + url);
    const pp = parts[0];
    if (!pp) throw new Error("Missing protocol in url: " + url);
    if (!factories[pp]) throw new Error("Missing factory for protocol " + pp);
    //
    return require(factories[pp]).factory(url);
}