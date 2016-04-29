"use strict";

QUnit.module(module.id);

const ez = require("../..");

var server;

asyncTest("start echo server", 1, (_) => {
    server = ez.devices.http.server(function(req, res, _) {
        if (req.method === "POST") {
            const text = req.readAll(_);
            const ct = req.headers["content-type"];
            if (ct === 'application/json') {
                res.writeHead(201, {
                    'content-type': ct,
                });
                res.end('{"echo":' + text + '}');
            } else {
                res.writeHead(201);
                res.end(ct + ': ' + text);
            }
        }
        if (req.method === "GET") {
            // query parameters
            var query = (req.url.split("?")[1] || "").split("&").reduce(function(prev, crt) {
                var parts = crt.split("=");
                if (parts[0]) prev[parts[0]] = parts[1];
                return prev;
            }, {});
            res.writeHead(query.status || 200, {});
            res.end("reply for GET");
        }
    });
    server.listen(_, 3005);
    ok(true, "server started");
    start();
});

asyncTest("http test", 2, (_) => {
    const reply = ez("http://localhost:3005").readAll(_);
    strictEqual(reply, "reply for GET", "Get test: reader ok");
    // try not found reader
    try {
        const reply404 = ez("http://localhost:3005?status=404").readAll(_);
        ok(false, "Reader supposed to throw");
    } catch(ex) {
        ok(/Status 404/.test(ex.message), "Reader throws ok");
    }
    start();
});

asyncTest("http readers and writers", 1, (_) => {
    const writer = ez.writer("http://localhost:3005");
    const result = writer.writeAll(_, "hello world").result;
    strictEqual(result, "text/plain: hello world");
    start();
});

asyncTest("http JSON", 1, (_) => {
    const writer = ez.writer("http://localhost:3005");
    const result = writer.writeAll(_, [2, 4]).result;
    deepEqual(result, { echo: [2, 4]});
    start();
});

asyncTest("array test", 1, (_) => {
    const reply = ez([2, 3, 4]).readAll(_);
    deepEqual(reply, [2, 3, 4]);
    start();
});

asyncTest("array readers and writers", 1, (_) => {
    const writer = ez.writer([]);
    ez.reader([2, 3, 4]).pipe(_, writer);
    deepEqual(writer.result, [2, 3, 4]);
    start();
});

asyncTest("string test", 1, (_) => {
    const reply = ez("string:hello world").readAll(_);
    deepEqual(reply, "hello world");
    start();
});

asyncTest("string readers and writers", 1, (_) => {
    const writer = ez.writer("string:");
    ez.reader("string:hello world").pipe(_, writer);
    deepEqual(writer.result, "hello world");
    start();
});

asyncTest("buffer test", 1, (_) => {
    const buf = new Buffer('hello world', 'utf8');
    const reply = ez(buf).transform(ez.transforms.cut(2)).readAll(_);
    deepEqual(reply.toString('utf8'), buf.toString('utf8'));
    start();
});

asyncTest("buffer reader and writer", 1, (_) => {
    const buf = new Buffer('hello world', 'utf8');
    const writer = ez.writer(new Buffer(0));
    const reply = ez.reader(buf).pipe(_, writer);
    deepEqual(writer.result.toString('utf8'), buf.toString('utf8'));
    start();
});
