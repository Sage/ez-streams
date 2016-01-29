"use strict";

const streams = require('../node-wrappers');
const fixOptions = require('./node').fixOptions;

function _end(_, client) {
    const resp = client.end().response(_);
    if (resp.statusCode != 201) throw new Error("Request return status code: " + resp.statusCode); // TODO: better manage errors
    return resp.readAll(_);
}

function _deduceType(data) {
    if (!data) return;
    if (Buffer.isBuffer(data)) return "application/octet-stream";
    if (typeof data === "object") return "application/json";
    const text = data;
    if (text[0] === "<") {
        if (text.slice(0, 9).toLowerCase() === "<!doctype") return "text/html";
        else return "application/xml";
    }
    return "text/plain";
}

module.exports = {
	/// !doc
	/// ## HTTP EZ Streams
	/// 
	/// `const ez = require('ez-streams');`
	/// 
	/// * `server = ez.devices.http.server(listener, options)`  
	///   Creates an EZ HTTP server.  
	///   The `listener` is called as `listener(request, response, _)`  
	///   where `request` is an EZ reader and `response` an EZ writer.  
	///   For a full description of this API, see `HttpServerRequest/Response` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	server: (listener, options) => streams.createHttpServer(listener, fixOptions(options)),
	/// * `client = ez.devices.http.client(options)`  
	///   Creates an EZ HTTP client.  
	///   `client` is an EZ writer.  
	///   The response object returned by `client.response(_)`  is an EZ reader.  
	///   For a full description of this API, see `HttpClientRequest/Response` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	client: (options) => streams.httpRequest(fixOptions(options)),
	/// * `listener = ez.devices.http.listener(listener, options)`  
	///    wraps an ez-streams listener as a vanilla node.js listener
	listener: (listener, options) => streams.httpListener(listener, fixOptions(options)),
	/// * `factory = ez.factory("http://user:pass@host:port/...")` 
	///    Use reader for a GET request, writer for POST request
    factory: (url) => ({
        /// * `reader = factory.reader(_)`  
        reader: (_) => module.exports.client({
            url: url,
            method: "GET"
        }).end().response(_),
        /// * `writer = factory.writer(_)`  
        writer: (_) => {
            var client;
            var type;
            return {
                write: function(_, data) {
                    const opt = {
                        url: url,
                        method: "POST",
                        headers: {}
                    };
                    if (!client) {
                        type = _deduceType(data);
                        if (type) opt.headers["content-type"] = type;
                        client = module.exports.client(opt);
                    }
                    if (data === undefined) return _end(_, client);
                    else return client.write(_, (type === "application/json") ? JSON.stringify(data) : data);
                }
            }
        }
    }),
};