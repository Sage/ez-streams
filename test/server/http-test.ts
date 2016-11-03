// <reference path="../../node_modules/retyped-qunit-tsd-ambient/qunit.d.ts" />
declare function asyncTest(name: string, expected: number, test: (_: _) => any): any;

import { _ } from "streamline-runtime";
import * as ez from "../..";

QUnit.module(module.id);

var server: ez.devices.http.HttpServer;

asyncTest("Echo service test", 6, (_) => {
    function _test(_: _, type: string, message: any) {
        const writer = ez.factory("http://localhost:3004").writer(_);
        writer.write(_, message);
        strictEqual(writer.write(_, undefined), type + ((type === "application/json") ? JSON.stringify(message) : message), "POST result ok for " + type);
    }
    server = ez.devices.http.server(function (req, res, _) {
        if (req.method === "POST") {
            const text = req.readAll(_);
            res.statusCode = 201;
            res.end(req.headers["content-type"] + text);
        }
        if (req.method === "GET") {
            // query parameters
            var query = (req.url.split("?")[1] || "").split("&").reduce(function (prev, crt) {
                var parts = crt.split("=");
                if (parts[0]) prev[parts[0]] = parts[1];
                return prev;
            }, {} as any);
            res.writeHead(query.status || 200, {});
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
    // try not found reader
    try {
        const nf_reader = ez.factory("http://localhost:3004?status=404").reader(_);
        ok(false, "Reader supposed to throw");
    } catch (ex) {
        ok(/Status 404/.test(ex.message), "Reader throws ok");
    }

    start();
});

