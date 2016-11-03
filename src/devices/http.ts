import { _ } from 'streamline-runtime';
import { fixOptions } from './node';
import { Reader } from '../reader';
import { Writer } from '../writer';
import * as http from 'http';

import {
    HttpProxyClientRequest,
    HttpClientRequest,
    HttpClientResponse,
    HttpClientOptions,
    HttpServer,
    HttpServerRequest,
    HttpServerResponse,
    HttpServerOptions,
    createHttpServer,
    httpRequest,
    httpListener,
} from '../node-wrappers';

export {
    HttpProxyClientRequest,
    HttpClientRequest,
    HttpClientResponse,
    HttpClientOptions,
    HttpServer,
    HttpServerRequest,
    HttpServerResponse,
    HttpServerOptions,
}

function endWrite(_: _, cli: HttpClientRequest) {
    const resp = cli.end().response(_);
    if (resp.statusCode != 201) throw new Error("Request return status code: " + resp.statusCode); // TODO: better manage errors
    const data = resp.readAll(_);
    return (typeof data === 'string' && /^application\/json/.test(resp.headers['content-type'])) ? JSON.parse(data) : data;
}

function guessType(data: any) {
    if (!data) return null;
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
/// `import * as ez from 'ez-streams'`
/// 
/// * `server = ez.devices.http.server(listener, options)`  
///   Creates an EZ HTTP server.  
///   The `listener` is called as `listener(request, response, _)`  
///   where `request` is an EZ reader and `response` an EZ writer.  
///   For a full description of this API, see `HttpServerRequest/Response` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 

export function server(listener: (request: HttpServerRequest, response: HttpServerResponse, _: _) => void, options?: HttpServerOptions) {
    return createHttpServer(listener, fixOptions(options));
}
/// * `client = ez.devices.http.client(options)`  
///   Creates an EZ HTTP client.  
///   `client` is an EZ writer.  
///   The response object returned by `client.response(_)`  is an EZ reader.  
///   For a full description of this API, see `HttpClientRequest/Response` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 

export function client(options?: HttpClientOptions) {
    return httpRequest(fixOptions(options));
}
/// * `listener = ez.devices.http.listener(listener, options)`  
///    wraps an ez-streams listener as a vanilla node.js listener
export interface HttpListenerOption {

}
export function listener(listener: (request: HttpServerRequest, response: HttpServerResponse) => void, options?: HttpListenerOption) {
    return httpListener(listener, fixOptions(options));
}
/// * `factory = ez.factory("http://user:pass@host:port/...")` 
///    Use reader for a GET request, writer for POST request
export type FactoryWriter = Writer<any> & { _result: any };

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
            var cli: HttpClientRequest;
            var type: string | null;
            return {
                write(this: FactoryWriter, _: _, data: any) {
                    const opt: HttpClientOptions = {
                        url: url,
                        method: "POST",
                        headers: {}
                    };
                    if (!cli) {
                        type = guessType(data);
                        if (type) opt.headers!["content-type"] = type;
                        cli = client(opt).proxyConnect(_);
                    }
                    if (data === undefined) return this._result = endWrite(_, cli);
                    else return cli.write(_, type === "application/json" ? JSON.stringify(data) : data);
                },
                get result(this: FactoryWriter) { return this._result }
            };
        }
    };
}