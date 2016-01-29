"use strict";

QUnit.module(module.id);

const ez = require("../..");

var server;
asyncTest("Echo service test", 5, (_) => {
    function _test(_, type, message) {
        const writer = ez.factory("http://localhost:3004").writer(_);
        writer.write(_, message);
        strictEqual(writer.write(_, undefined), type + ((type === "application/json") ? JSON.stringify(message) : message), "POST result ok for " + type);
    }
    server = ez.devices.http.server(function(req, res, _) {
        if (req.method === "POST") {
            const text = req.readAll(_);
            res.statusCode = 201;
            res.end(req.headers["content-type"] + text);
        }
        if (req.method === "GET") {
            res.end("reply for GET");
        }
    });
    server.listen(_, 3004);
    _test(_, "text/plain", "post test");
    _test(_, "application/json", { test: "post test" });
    _test(_, "text/html", "<!DOCTYPE html>");
    _test(_, "application/xml", "<xml ns");
    //
    const reader = ez.factory("http://localhost:3004").reader(_);
    strictEqual(reader.read(_), "reply for GET", "Get test: reader ok");
 
    start();
});

