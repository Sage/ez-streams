import { _ } from 'streamline-runtime';
import { fixOptions } from './node';
import { Reader } from '../reader';
import { Writer } from '../writer';
import * as http from 'http';
const streams = require('../node-wrappers');

interface HttpClientResponse extends Reader<any> {
    statusCode: number;
}

interface HttpClient {
    write(_: _, data: any): HttpClient;
    end(data?: any): HttpClient;
    response: (_: _) => HttpClientResponse;
}

function endWrite(_: _, cli: HttpClient) {
    const resp = cli.end().response(_);
    if (resp.statusCode != 201) throw new Error("Request return status code: " + resp.statusCode); // TODO: better manage errors
    const data = resp.readAll(_);
    return (typeof data === 'string' && /^application\/json/.test(resp.headers['content-type'])) ? JSON.parse(data) : data;
}

function guessType(data: any) {
    if (!data) return;
    if (Buffer.isBuffer(data)) return "application/octet-stream";
    if (typeof data === "object") return "application/json";
    if (typeof data !== "string") throw new TypeError("invalid data type: " + typeof data);
    const text = data;
    if (text[0] === "<") {
        if (text.slice(0, 9).toLowerCase() === "<!doctype") return "text/html";
        else return "application/xml";
    }
    return "text/plain";
}

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
export interface HttpServerRequest {
}
export interface HttpServerResponse {
}
export interface HttpServerOptions {
}

export function server(listener: (request: HttpServerRequest, response: HttpServerResponse, _: _) => void, options?: HttpServerOptions) {
    return streams.createHttpServer(listener, fixOptions(options));
}
/// * `client = ez.devices.http.client(options)`  
///   Creates an EZ HTTP client.  
///   `client` is an EZ writer.  
///   The response object returned by `client.response(_)`  is an EZ reader.  
///   For a full description of this API, see `HttpClientRequest/Response` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
export interface HttpClientOptions {
    url?: string;
    method?: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'OPTIONS';
    headers?: { [name: string]: string }
}
export function client(options?: HttpClientOptions) {
    return streams.httpRequest(fixOptions(options));
}
/// * `listener = ez.devices.http.listener(listener, options)`  
///    wraps an ez-streams listener as a vanilla node.js listener
export interface HttpListenerOption {

}
export function listener(listener: (request: http.ServerRequest, response: http.ServerResponse) => void, options? : HttpListenerOption) {
    return streams.httpListener(listener, fixOptions(options));
}
/// * `factory = ez.factory("http://user:pass@host:port/...")` 
///    Use reader for a GET request, writer for POST request
export function factory(url: string) {
    return {
        /// * `reader = factory.reader(_)`  
        reader(_: _) {
            var response = module.exports.client({
                url: url,
                method: "GET"
            }).end().response(_);
            if (response.statusCode !== 200) {
                var payload = response.readAll(_);
                throw new Error("Error reading '" + url + "'; Status " + response.statusCode + ": " + payload);
            }
            return response;
        },
        /// * `writer = factory.writer(_)`  
        writer(_: _) {
            var cli: HttpClient;
            var type: string;
            return {
                write(_: _, data: any) {
                    const opt: HttpClientOptions = {
                        url: url,
                        method: "POST",
                        headers: {}
                    };
                    if (!cli) {
                        type = guessType(data);
                        if (type) opt.headers["content-type"] = type;
                        cli = client(opt);
                    }
                    if (data === undefined) return this.result = endWrite(_, cli);
                    else return cli.write(_, type === "application/json" ? JSON.stringify(data) : data);
                }
            }
        }
    };
}