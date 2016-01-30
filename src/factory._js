"use strict";

const fs = require('fs');
const path = require('path');

const glob = typeof global === "object" ? global : window;
const secret = "_6522f20750bf404ea2fbccd561613115";
const factories = (glob[secret] = (glob[secret] || {
    // standard factories
    "console": "./devices/console",
    "http": "./devices/http",
    "file": "./devices/file"
}));

function scanDirs(dir) {
    const tryPackage = (pkgPath, fromDir) => {
        if (!fs.existsSync(pkgPath)) return;
        try {
            // add factories from package.json
            ((require(pkgPath).ez || {}).factories || []).reduce((prev, crt) => {
                if (crt.protocol && crt.module) {
                    try {
                        prev[crt.protocol] = fromDir ? crt.module.replace(/^.*([\\\/])/, fromDir + '$1') : crt.module;
                    } catch(e) {
                        console.error(e.message);
                    }
                }
                return prev;
            }, factories);
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
    const pp = (url || "").split(":")[0];
    if (!pp) throw new Error("Missing protocol in url: " + url);
    if (!factories[pp]) throw new Error("Missing factory for protocol " + pp);
    //
    return require(factories[pp]).factory(url);
}