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
    const ndir = path.join(dir, "../node_modules");
    if (fs.existsSync(ndir)) {
        fs.readdirSync(ndir).forEach((pkg) => {
            const pkgPath = path.join(ndir, pkg, "package.json");
            if (fs.existsSync(pkgPath)) {
                try {
                    // add factories from package.json
                    ((require(pkgPath).ez || {}).factories || []).reduce((prev, crt) => {
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
    }
    const d = path.join(dir, '..');
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