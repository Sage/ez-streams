/**
 * Copyright (c) 2011 Bruno Jouhier <bruno.jouhier@sage.com>
 * MIT License
 */

/// !doc
/// 
/// # Wrappers for node.js streams
/// 
/// These wrappers implement a _pull style_ API. 
/// For readable streams, instead of having the stream _push_ the data to its consumer by emitting `data` and `end` events, 
/// the wrapper lets the consumer _pull_ the data from the stream by calling asynchronous `read` methods.
/// The wrapper takes care of the low level `pause`/`resume` logic.
/// 
/// Similarly, for writable streams, the wrapper provides a simple asynchronous `write` method and takes
/// care of the low level `drain` logic.
/// 
/// For more information on this design,
/// see [this blog post](http://bjouhier.wordpress.com/2011/04/25/asynchronous-episode-3-adventures-in-event-land/)
/// 
/// For a simple example of this API in action, 
/// see the [google client example](../../../examples/streams/googleClient._js)
import { _ } from 'streamline-runtime';
import { parse as parseUrl } from 'url';
import * as os from 'os';
import * as generic from './devices/generic';
import { Reader } from './reader';
import { Writer } from './writer';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

/// 
/// ## Wrapper
/// 
/// Base wrapper for all objects that emit an `end` or `close` event.  
/// All stream wrappers derive from this wrapper.
/// 
/// * `wrapper = new streams.Wrapper(stream)`  
///   creates a wrapper.

export interface Emitter extends NodeJS.EventEmitter {
	end?: (data?: any, encoding?: string) => void;
	close?: () => void;
	destroySoon?: () => void;
}

function nop() {}

export class Wrapper<EmitterT extends Emitter> {
	/// * `emitter = wrapper.emitter`  
	///    returns the underlying emitter. The emitter stream can be used to attach additional observers.
	_emitter: EmitterT;
	_closed: boolean;
	_onClose: (err?: Error) => void;
	_autoClosed: (() => void)[];
	_doesNotEmitClose: boolean;

	constructor(emitter: EmitterT) {
		this._emitter = emitter;
		this._closed = false;
		emitter.on('close', () => {
			this._onClose && this._onClose();
		});
		// hook for subclasses
		this._autoClosed = [];
		this._onClose = this._trackClose;
	}
	
	_trackClose() {
		this._closed = true;
		this._autoClosed.forEach(fn => {
			fn.call(this);
		});
	}

	close(_: _) {
		_.cast((callback: (err?: any) => void) => {
			if (typeof callback !== 'function') throw new TypeError("bad callback parameter: " + typeof callback);
			if (this._closed) return callback();
			const close = this._emitter.end || this._emitter.close || this._emitter.destroySoon;
			if (typeof close !== "function") return callback();
			this._onClose = err => {
				this._closed = true;
				this._onClose = nop;
				callback(err);
				callback = nop;
			};
			if (this._doesNotEmitClose) {
				this._emitter.emit("close");
			}
			close.call(this._emitter);
		})(_);
	}
	/// * `closed = wrapper.closed`   
	///    returns true if the `close` event has been received.
	get closed() {
		return this._closed;
	}
	/// * `emitter = wrapper.unwrap()`  
	///    unwraps and returns the underlying emitter.  
	///    The wrapper should not be used after this call.
	unwrap() {
		this._emitter.removeAllListeners();
		this._closed = true;
		return this._emitter;
	}
	/// * `emitter = wrapper.emitter`  
	///    returns the underlying emitter. The emitter stream can be used to attach additional observers.
	get emitter() {
		return this._emitter;
	}
}

/// 
/// ## ReadableStream
/// 
/// All readable stream wrappers derive from this wrapper. 
/// 
/// * `stream = new streams.ReadableStream(stream[, options])`  
///   creates a readable stream wrapper.

export interface ReadableOptions {
	lowMark?: number;
	highMark?: number;
}

export type Data = string | Buffer;

export class ReadableStream<EmitterT extends NodeJS.ReadableStream> extends Wrapper<EmitterT> {
	_low: number;
	_high: number;
	_paused: boolean;
	_current: number;
	_chunks: Data[];
	_error: Error;
	_done: boolean;
	_encoding?: string;
	_onData: (err?: Error, chunk?: Data) => void;
	/// * `reader = stream.reader`  
	///   returns a clean ez reader.
	reader: Reader<any>;
	constructor(emitter: EmitterT, options?: ReadableOptions) {
		super(emitter);
		options = options || {};
		this._low = Math.max(options.lowMark || 0, 0);
		this._high = Math.max(options.highMark || 0, this._low);
		this._paused = false;
		this._current = 0;
		this._chunks = [];
		this._done = false;
		// initialize _onData before setting listeners because listeners may emit data events immediately
		// (during the `on` call!)
		this._onData = this._trackData;

		emitter.on('error', (err: Error) => {
			this._onData(err);
		});
		emitter.on('data', (chunk: Data) => {
			this._onData(undefined, chunk);
		});
		emitter.on('end', () => {
			this._onData();
		});

		this._autoClosed.push(() => {
			if (!this._done) this._onData(new Error("stream was closed unexpectedly"));
		});
		this.reader = generic.reader(this._readChunk.bind(this), this.stop.bind(this));
	}

	_trackData(err: Error, chunk?: Data) {
		if (err) this._error = err;
		else if (chunk) {
			this._chunks.push(chunk);
			this._current += chunk.length;
			if (this._current > this._high && !this._paused && !this._done && !this._error && !this._closed) {
				this._emitter.pause();
				this._paused = true;
			}
		} else this._done = true;
	}
	
	_readChunk(callback: (err?: Error, data?: Data) => void) {
		if (this._chunks.length > 0) {
			const chunk = this._chunks.splice(0, 1)[0];
			this._current -= chunk.length;
			if (this._current <= this._low && this._paused && !this._done && !this._error && !this._closed) {
				this._emitter.resume();
				this._paused = false;
			}
			return callback(undefined, chunk);
		} else if (this._done) {
			if (this._paused) { // resume it for keep-alive
				try {
					if (!this._closed) this._emitter.resume();
					this._paused = false;
				} catch (e) { // socket may be closed
				}
			}
			return callback(undefined);
		} else if (this._error) { // should we resume if paused?
			return callback(this._error);
		} else {
			var replied = false;
			this._onData = (err, chunk) => {
				if (err) this._error = err;
				else if (!chunk) this._done = true;
				this._onData = this._trackData; // restore it
				if (!replied) callback(err, chunk != null ? chunk : undefined);
				replied = true;
			};
		}
	}

	_concat(chunks: Data[], total: number) {
		if (this._encoding) return chunks.join('');
		if (chunks.length == 1) return chunks[0];
		const result = new Buffer(total);
		chunks.reduce((val, chunk) => {
			if (typeof chunk === 'string') throw new Error('expected Buffer, not string');
			chunk.copy(result, val);
			return val + chunk.length;
		}, 0);
		return result;
	}
	/// * `stream.setEncoding(enc)`  
	///   sets the encoding.
	///   returns `this` for chaining.
	setEncoding(enc?: string) {
		this._encoding = enc;
		if (enc) this._emitter.setEncoding(enc);
		return this;
	}
	/// * `data = stream.read(_[, len])`  
	///   reads asynchronously from the stream and returns a `string` or a `Buffer` depending on the encoding.  
	///   If a `len` argument is passed, the `read` call returns when `len` characters or bytes 
	///   (depending on encoding) have been read, or when the underlying stream has emitted its `end` event 
	///   (so it may return less than `len` bytes or chars).
	///   Reads till the end if `len` is negative.  
	///   Without `len`, the read calls returns the data chunks as they have been emitted by the underlying stream.  
	///   Once the end of stream has been reached, the `read` call returns `null`.
	read(_: _, len?: number) {
		if (this._closed && !this._chunks.length) return undefined;
		if (len == null) return this.reader.read(_);
		if (len < 0) len = Infinity;
		if (len == 0) return this._encoding ? "" : new Buffer(0);
		const chunks: Data[] = [];
		var total = 0;
		while (total < len) {
			var chunk = this.reader.read(_);
			if (!chunk) return chunks.length == 0 ? undefined : this._concat(chunks, total);
			if (total + chunk.length <= len) {
				chunks.push(chunk);
				total += chunk.length;
			} else {
				chunks.push(chunk.slice(0, len - total));
				this.unread(chunk.slice(len - total));
				total = len;
			}
		}
		return this._concat(chunks, total);
	}
	/// * `data = stream.readAll(_)`  
	///   reads till the end of stream.  
	///   Equivalent to `stream.read(_, -1)`.
	readAll(_: _) {
		const result = this.read(_, -1);
		return result === undefined ? null : result;
	}
	/// * `stream.unread(chunk)`  
	///   pushes the chunk back to the stream.  
	///   returns `this` for chaining.
	unread(chunk: Data) {
		if (chunk) {
			this._chunks.splice(0, 0, chunk);
			this._current += chunk.length;
		}
		return this;
	}

	/// * `len = stream.available()`  
	///   returns the number of bytes/chars that have been received and not read yet.
	available() {
		return this._chunks.reduce((count, chunk) => {
			return count + chunk.length;
		}, 0);
	}

	stop(_: _, arg?: any) {
		if (arg && arg !== true) this._error = this._error || arg;
		this.unwrap();
	}

	get events() {
		return ["error", "data", "end", "close"];
	}
}

/// 
/// ## WritableStream
/// 
/// All writable stream wrappers derive from this wrapper. 
/// 
/// * `stream = new streams.WritableStream(stream[, options])`  
///   creates a writable stream wrapper.

export interface WritableOptions {
	encoding?: string;
}

export class WritableStream<EmitterT extends NodeJS.WritableStream> extends Wrapper<EmitterT> {
	_error: Error;
	_onDrain: (err?: Error) => void;
	_encoding?: string;
	/// * `writer = stream.writer`  
	///   returns a clean ez writer.
	writer: Writer<Data>;
	constructor(emitter: EmitterT, options?: WritableOptions) {
		super(emitter);
		options = options || {};
		this._encoding = options.encoding;

		emitter.on('error', (err: Error) => {
			if (this._onDrain) this._onDrain(err);
			else this._error = err;
		});
		emitter.on('drain', () => {
			if (this._onDrain) this._onDrain();
		});

		this._autoClosed.push(() => {
			const err = new Error("stream was closed unexpectedly");
			if (this._onDrain) this._onDrain(err);
			else this._error = err;
		});
		this.writer = generic.writer((_: _, data?: Data) => {
			if (this._error) throw new Error(this._error.message);
			// node streams don't differentiate between null and undefined. So end in both cases
			if (data != null) {
				// if data is empty do nothing but it's not to be interpreted as end
				if (!data.length) return this.writer;
				if (typeof data === "string") data = new Buffer(data, this._encoding || "utf8");
				//
				if (!this._emitter.write(data)) this._drain(_);
			} else {
				_.cast(this._emitter.end).call(this._emitter, _);
			}
			return this.writer;
		});
	}

	_drain(_: _) {
		_.cast((callback: (err?: Error) => void) => {
			this._onDrain = (err) => {
				this._onDrain = nop;
				callback(err);
				callback = nop;
			};
		})(_);
	};

	/// * `stream.write(_, data[, enc])`  
	///   Writes the data.  
	///   This operation is asynchronous because it _drains_ the stream if necessary.  
	///   Returns `this` for chaining.
	write(_: _, data?: Data, enc?: string) {
		if (typeof data === "string") data = new Buffer(data, enc || this._encoding || "utf8");
		else if (data === null) data = undefined;
		this.writer.write(_, data);
		return this;
	}

	/// * `stream.end()`  
	///   signals the end of the send operation.  
	///   Returns `this` for chaining.
	end(data?: Data, enc?: string) {
		if (this.writer.ended) {
			if (data != null) throw new Error("invalid attempt to write after end");
			return this;
		}
		if (typeof data === "string") data = new Buffer(data, enc || this._encoding || "utf8");
		else if (data === null) data = undefined;
		if (data !== undefined) {
			_.run(_ => this.writer.write(_, data), err => {
				if (err) throw err;
				this.end();
			});
		} else {
			_.run(_ => this.writer.write(_), err => {
				if (err) throw err;
			});
		}
		return this;
	}

	get events() {
		return ["drain", "close"];
	}
}

export type Headers = { [key: string]: string };

function _getEncodingDefault(headers: Headers) {
	const comps = (headers['content-type'] || 'text/plain').split(';');
	const ctype = comps[0];
	for (var i = 1; i < comps.length; i++) {
		const pair = comps[i].split('=');
		if (pair.length == 2 && pair[0].trim() == 'charset') {
			const enc = pair[1].trim();
			return (enc.toLowerCase() === "iso-8859-1") ? "binary" : enc;
		}
	}
	if (ctype.indexOf('text') >= 0 || ctype.indexOf('json') >= 0) return "utf8";
	return undefined;
}

function _getEncodingStrict(headers: Headers) {
	// As per RFC-2616-7.2.1, if media type is unknown we should treat it
	// as "application/octet-stream" (may optionally try to determine it by
	// looking into content body - we don't)
	if (!headers['content-type'] || headers['content-encoding']) return undefined;

	const comps = headers['content-type'].split(';');
	const ctype = comps[0];
	for (var i = 1; i < comps.length; i++) {
		const pair = comps[i].split('=');
		if (pair.length === 2 && pair[0].trim() === 'charset') {
			// List of charsets: http://www.iana.org/assignments/character-sets/character-sets.xml
			// Node Buffer supported encodings: http://nodejs.org/api/buffer.html#buffer_buffer
			switch (pair[1].trim().toLowerCase()) {
				case 'utf8':
					// Fallthrough
				case 'utf-8':
					return 'utf8';
				case 'utf16le':
					// Fallthrough
				case 'utf-16le':
					return 'utf16le';
				case 'us-ascii':
					return 'ascii';
			}
			return undefined; // we do not understand this charset - do *not* encode
		}
	}
	return undefined;
}

export interface EncodingOptions {
	detectEncoding?: 'strict' | 'disable' | ((Headers: Headers) => string);
}
function _getEncoding(headers: Headers, options?: EncodingOptions) {
	if (headers['content-encoding']) return undefined;
	if (!options) return _getEncodingDefault(headers);
	if (typeof options.detectEncoding === "function") return options.detectEncoding(headers);
	switch (options.detectEncoding) {
		case 'strict':
			return _getEncodingStrict(headers);
		case 'disable':
			return undefined;
		default:
			return _getEncodingDefault(headers);
	}
}

/// 
/// ## HttpServerRequest
/// 
/// This is a wrapper around node's `http.ServerRequest`:
/// This stream is readable (see `ReadableStream` above).
/// 
/// * `request = new streams.HttpServerRequest(req[, options])`  
///    returns a wrapper around `req`, an `http.ServerRequest` object.   
///    The `options` parameter can be used to pass `lowMark` and `highMark` values, or
///    to control encoding detection (see section below).

export interface HttpServerOptions {
	createServer?: (listener: (request: http.ServerRequest, response: http.ServerResponse) => void) => http.Server | https.Server;
	secure?: boolean;
}

export class HttpServerRequest extends ReadableStream<http.ServerRequest> {
	constructor(req: http.ServerRequest, options?: HttpServerOptions) {
		super(req, options);
		this.setEncoding(_getEncoding(req.headers, options));
		// special sage hack - clean up later
		if ((req as any).session) (this as any).session = (req as any).session;
		this._doesNotEmitClose = true;
	}

	// method, url, headers and trailers are read-write - for compatibility
	get method() { return this._emitter.method!; }
	set method(val: string) { this._emitter.method = val; }
	get url() { return this._emitter.url!; }
	set url(val: string) { this._emitter.url = val; }
	get headers() { return this._emitter.headers; }
	set headers(val: any) { this._emitter.headers = val; }
	get trailers() { return this._emitter.trailers; }
	set trailers(val: any) { this._emitter.trailers = val; }
	get rawHeaders() { return this._emitter.rawHeaders; }
	get rawTrailers() { return this._emitter.rawTrailers; }
	get httpVersion() { return this._emitter.httpVersion; }
	get connection() { return this._emitter.connection; }
	get socket() { return this._emitter.socket; }
	get statusCode() { return this._emitter.statusCode; }
	get statusMessage() { return this._emitter.statusMessage; }
	// sage hack
	get client() { return (this._emitter as any).client; }
}

// compat API: hide from typescript
Object.defineProperty(HttpServerRequest.prototype, '_request', {
	get() { return this._emitter; }
})
/// 
/// ## HttpServerResponse
/// 
/// This is a wrapper around node's `http.ServerResponse`.  
/// This stream is writable (see `WritableStream` above).
/// 
/// * `response = new streams.HttpServerResponse(resp[, options])`  
///   returns a wrapper around `resp`, an `http.ServerResponse` object.

export class HttpServerResponse extends WritableStream<http.ServerResponse> {
	constructor(resp: http.ServerResponse, options?: HttpServerOptions) {
		super(resp, options);
		this._doesNotEmitClose = true;
	}
	/// * `response.writeContinue()` 
	writeContinue() {
		this._emitter.writeContinue();
		return this;
	}
	/// * `response.writeHead(statusCode, headers)` 
	writeHead(statusCode: number, headers?: any): this;
	writeHead(statusCode: number, reasonPhrase?: string, headers?: any) {
		this._emitter.writeHead(statusCode, reasonPhrase, headers);
		return this;
	}
	/// * `response.setHeader(name, value)` 
	setHeader(name: string, value: string | string[]) {
		this._emitter.setHeader(name, value);
		return this;
	}
	/// * `value = response.getHeader(head)` 
	getHeader(name: string) {
		return this._emitter.getHeader(name);
	}
	/// * `response.removeHeader(name)` 
	removeHeader(name: string) {
		this._emitter.removeHeader(name);
		return this;
	}
	/// * `response.addTrailers(trailers)` 
	addTrailers(trailers: any) {
		this._emitter.addTrailers(trailers);
		return this;
	}
	/// * `response.statusCode = value`  
	get statusCode() { return this._emitter.statusCode; }
	set statusCode(val: number) { this._emitter.statusCode = val; }
	get statusMessage() { return this._emitter.statusMessage; }
	set statusMessage(val: string) { this._emitter.statusMessage = val; }
	///   (same as `http.ServerResponse`)
}

function _fixHttpServerOptions(options?: HttpServerOptions) {
	var opts = options || {};
	opts.createServer = function(listener) : http.Server | https.Server {
		if (typeof listener !== 'function') throw new TypeError("bad listener parameter: " + typeof listener);
		return opts.secure ? https.createServer(opts, listener) : http.createServer(listener);
	};
	return opts;
}

// Abstract class shared by HttpServer and NetServer
export interface ServerEmitter extends Emitter {
	listen(...args: any[]): void;
}

export class Server<EmitterT extends ServerEmitter> extends Wrapper<EmitterT> {
	constructor(emitter: EmitterT) {
		super(emitter);
	}
	listen(_: _, ...args: any[]) {
		return _.cast((callback: (err?: Error, result?: Server<EmitterT>) => void) => {
			if (this._closed) throw new Error("cannot listen: server is closed");
			var replied = false;
			var reply = (err: Error | undefined, result?: Server<EmitterT>) => {
				if (!replied) callback(err, result);
				replied = true;
			}
			args.push(() => {
				reply(undefined, this);
			});

			this._autoClosed.push(() => {
				reply(new Error("server was closed unexpectedly"));
			});
			this._emitter.on('error', reply);
			this._emitter.listen.apply(this._emitter, args);
		})(_);
	}
}

/// 
/// ## HttpServer
/// 
/// This is a wrapper around node's `http.Server` object:
/// 
/// * `server = streams.createHttpServer(requestListener[, options])`    
///   creates the wrapper.  
///   `requestListener` is called as `requestListener(request, response, _)` 
///   where `request` and `response` are wrappers around `http.ServerRequest` and `http.ServerResponse`.  
///   A fresh empty global context is set before every call to `requestListener`. See [Global context API](https://github.com/Sage/streamline-runtime/blob/master/index.md).
/// * `server.listen(_, port[, host])`
/// * `server.listen(_, path)`  
///   (same as `http.Server`)

export type HttpListener = (request: HttpServerRequest, response: HttpServerResponse, _: _) => void;

export function httpListener(listener: HttpListener, options: HttpServerOptions) {
	options = options || {};
	return (request: http.ServerRequest, response: http.ServerResponse) => {
		return _.withContext(() => {
			return _.run(_ => listener(new HttpServerRequest(request, options), new HttpServerResponse(response, options), _), err => {
				// handlers do not read GET requests - so we remove the listeners, in case
				if (!/^(post|put)$/i.test(request.method || 'get')) request.removeAllListeners();
				if (err) throw err;
			});
		})();
	};
};

export function createHttpServer(requestListener: HttpListener, options: HttpServerOptions) {
	return new HttpServer(requestListener, options);
};

export class HttpServer extends Server<http.Server | https.Server> {
	constructor(requestListener: HttpListener, options: HttpServerOptions) {
		var opts = _fixHttpServerOptions(options);
		super(opts.createServer!(httpListener(requestListener, options)));
	}
	setTimeout(msecs: number, callback: Function) {
		// node.js version lower than 0.11.2 do not inmplement a https.Server.setTimeout method.
		if (this._emitter.setTimeout) (this._emitter as http.Server).setTimeout(msecs, callback);
		return this;
	}
}

/// 
/// ## HttpClientResponse
/// 
/// This is a wrapper around node's `http.ClientResponse`
/// 
/// This stream is readable (see `ReadableStream` above).
/// 
/// * `response = new HttpClientResponse(resp, options)`  
///   wraps a node response object.  
///   `options.detectEncoding` and be used to control encoding detection (see section below).
/// * `response = request.response(_)`  
///    returns the response stream.

export interface HttpClientResponseOptions extends ReadableOptions {}

export class HttpClientResponse extends ReadableStream<http.ClientResponse> {
	constructor(resp: http.ClientResponse, options?: HttpClientResponseOptions) {
		super(resp, options);
		this.setEncoding(_getEncoding(resp.headers, options));
	}
	/// * `status = response.statusCode`  
	///    returns the HTTP status code.
	get statusCode() { return this._emitter.statusCode; }
	get statusMessage() { return this._emitter.statusMessage; }
	/// * `version = response.httpVersion`  
	///    returns the HTTP version.
	get httpVersion() { return this._emitter.httpVersion; }
	/// * `headers = response.headers`  
	///    returns the HTTP response headers.
	get headers() { return this._emitter.headers; }
	/// * `trailers = response.trailers`  
	///    returns the HTTP response trailers.
	get trailers() { return this._emitter.trailers; }
	get rawHeaders() { return this._emitter.rawHeaders; }
	get rawTrailers() { return this._emitter.rawTrailers; }

	/// * `response.checkStatus(statuses)`  
	///    throws an error if the status is not in the `statuses` array.  
	///    If only one status is expected, it may be passed directly as an integer rather than as an array.  
	///    Returns `this` for chaining.
	checkStatus(statuses: number | number[]) {
		if (typeof statuses === 'number') statuses = [statuses];
		if (this.statusCode == null || statuses.indexOf(this.statusCode) < 0) throw new Error("invalid status: " + this.statusCode);
		return this;
	};
}

export interface HttpClientOptions {
	url?: string;
	protocol?: string;
	host?: string;
	port?: string;
	path?: string;
	method?: string;
	headers?: Headers;
	module?: any;
	user?: string;
	password?: string;
	proxy?: any; // refine later
	proxyAuthenticate?: any; // refine later
	isHttps?: boolean;
	socket?: net.Socket;
	agent?: boolean;
}

function _fixHttpClientOptions(options: HttpClientOptions) {
	if (!options) throw new Error("request error: no options");
	var opts = options;
	if (typeof opts === "string") opts = {
		url: opts
	};
	if (opts.url) {
		const parsed = parseUrl(opts.url);
		opts.protocol = parsed.protocol;
		opts.host = parsed.hostname;
		opts.port = parsed.port;
		opts.path = parsed.pathname + (parsed.query ? "?" + parsed.query : "");
	}
	opts.protocol = opts.protocol || "http:";
	opts.port = opts.port || (opts.protocol === "https:" ? '443' : '80');
	opts.path = opts.path || "/";
	if (!opts.host) throw new Error("request error: no host");
	opts.method = opts.method || "GET";
	opts.headers = Object.keys(opts.headers || {}).reduce((headers, key) => {
		if (opts.headers![key] != null) headers[key] = opts.headers![key];
		return headers;
	}, {} as Headers);
	opts.module = require(opts.protocol.substring(0, opts.protocol.length - 1));
	if (opts.user != null) {
		// assumes basic auth for now
		var token = opts.user + ":" + (opts.password || "");
		token = new Buffer(token, "utf8").toString("base64");
		opts.headers['Authorization'] = "Basic " + token;
	}

	if (opts.proxy) {
		// Do not use proxy for local requests
		if (opts.host !== os.hostname()) {
			if (typeof opts.proxy === "string") {
				opts.proxy = parseUrl(opts.proxy);
				opts.proxy.host = opts.proxy.hostname;
			}
			// Check excludes
			if (!opts.proxy.force && opts.proxy.excludes && opts.proxy.excludes.indexOf(opts.host.toLowerCase()) !== -1) {
				// Do nothing
			} else {
				opts.proxy.port = opts.proxy.port || opts.port;
				if (!opts.proxy.host) throw new Error("proxy configuration error: no host");
				if (!opts.proxy.port) throw new Error("proxy configuration error: no port");
				opts.proxy.protocol = opts.proxy.protocol || "http:";
				// https requests will be handled with CONNECT method
				opts.isHttps = opts.protocol.substr(0, 5) === "https";
				if (opts.isHttps) {
					opts.proxy.module = require(opts.proxy.protocol.substring(0, opts.proxy.protocol.length - 1));
					opts.proxy.headers = opts.proxy.headers || {};
					opts.proxy.headers.host = opts.host;
				} else {
					opts.path = opts.protocol + "//" + opts.host + ":" + opts.port + opts.path;
					opts.host = opts.proxy.host;
					opts.port = opts.proxy.port;
					if (opts.host) opts.headers['host'] = opts.host;
				}

				if (opts.proxy.auth) {
					if (opts.proxy.auth.toLowerCase() === "basic") {
						if (!opts.proxy.user) throw new Error("request error: no proxy user");
						var proxyToken = opts.proxy.user + ":" + (opts.proxy.password || "");
						proxyToken = new Buffer(proxyToken, "utf8").toString("base64");
						opts.headers["Proxy-Authorization"] = "Basic " + proxyToken;
					} else if (opts.proxy.auth.toLowerCase() === "ntlm") {

						const proxyAuthenticator = opts.proxy.proxyAuthenticator;
						if (!proxyAuthenticator) throw new Error("Proxy Authenticator module required");
						if (!proxyAuthenticator.authenticate) throw new Error("NTLM Engine module MUST provide 'authenticate' function");
						opts.proxyAuthenticate = proxyAuthenticator.authenticate;
					} else if (opts.proxy.auth.toLowerCase() === "digest") {
						throw new Error("Proxy Digest authentication not yet implemented");
					}
				}
			}
		}
	}
	return opts;
}

/// 
/// ## HttpClientRequest
/// 
/// This is a wrapper around node's `http.ClientRequest`.
/// 
/// This stream is writable (see `WritableStream` above).
/// 
/// * `request = streams.httpRequest(options)`  
///    creates the wrapper.  
///    The options are the following:
///    * `method`: the HTTP method, `'GET'` by default.
///    * `headers`: the HTTP headers.
///    * `url`: the requested URL (with query string if necessary).
///    * `proxy.url`: the proxy URL.
///    * `lowMark` and `highMark`: low and high water mark values for buffering (in bytes or characters depending
///      on encoding).  
///      Note that these values are only hints as the data is received in chunks.

export class HttpClientRequest extends WritableStream<http.ClientRequest> {
	_response: http.ClientResponse;
	_done: boolean;
	_onResponse: (err: Error | undefined, response?: http.ClientResponse) => void;
	_options: HttpClientOptions;

	constructor(options: HttpClientOptions) {
		var request = options.module.request(options, (response: http.ClientResponse) => {
			this._onResponse(undefined, response);
		});
		super(request, options);
		this._options = options;
		this._done = false;

		this._emitter.on('error', (err: Error) => {
			if (!this._done) this._onResponse(err);
		});

		this._autoClosed.push(() => {
			if (!this._done) this._onResponse(new Error("stream was closed unexpectedly"));
		});
		this._onResponse = this._trackResponse;
	}
	_trackResponse(err: Error | undefined, resp?: http.ClientResponse) {
		this._done = true;
		if (err) this._error = err;
		if (resp) this._response = resp;
	}

	_responseCb(callback: (err?: Error, resp?: http.ClientResponse) => void) {
		var replied = false;
		if (typeof callback !== 'function') throw new TypeError("bad callback parameter: " + typeof callback);
			if (this._done) return callback(this._error, this._response);
		else this._onResponse = (err, resp) => {
			this._done = true;
			if (!replied) callback(err, resp);
			replied = true;
		};
	}

	/// * `response = request.response(_)`  
	///    returns the response. 
	response(_: _) {
		var response = this._response || _.cast(this._responseCb).call(this, _);
		return new HttpClientResponse(response, this._options); // options.reader?
	}
	setTimeout(ms: number) {
		this._emitter.setTimeout(ms, () => {
			this._emitter.emit('error', 'timeout');
		});
		return this;
	}
	proxyConnect(_: _) {
		return this;
	}
}

export class HttpProxyClientRequest {
	_options: HttpClientOptions;

	constructor(options: HttpClientOptions) {
		this._options = _fixHttpClientOptions(options);
	}
	proxyConnect(_: _) {
		const options = this._options;
		if (options.isHttps) {
			// TODO: Don't authenticate with ntlm, nodejs raises "Parse error" in return of connect with 407 -> HPE_INVALID_CONSTANT
			return _.cast((callback: (err?: Error, resolved?: HttpClientRequest) => void) => {
				const proxyOpt = {
					host: options.proxy.host,
					port: options.proxy.port,
					method: 'CONNECT',
					path: options.host + ":" + options.port,
					headers: options.proxy.headers
				};
				var replied = false;
				// open proxy socket
				options.proxy.module.request(proxyOpt).on('connect', (res: never, socket: net.Socket, head: never) => {
					options.socket = socket;
					options.agent = false;
					//
					if (!replied) callback(undefined, new HttpClientRequest(options));
					replied = true;
				}).on('error', (err: Error) => {
					if (!replied) callback(err);
					replied = true;
				}).end();
				return this;
			})(_);
		} else {//
			if (options.proxyAuthenticate) {
				options.proxyAuthenticate(_, options);
			}
			return new HttpClientRequest(options);
		}
	}
	response(_: _) {
		throw new Error("proxyConnect(_) call missing");
	}
}

export function httpRequest(options: HttpClientOptions) : HttpProxyClientRequest | HttpClientRequest {
	options = _fixHttpClientOptions(options);
	if (options.isHttps || options.proxyAuthenticate) return new HttpProxyClientRequest(options);
	else return new HttpClientRequest(options);
}

/// 
/// ## NetStream
/// 
/// This is a wrapper around streams returned by TCP and socket clients:
/// 
/// These streams are both readable and writable (see `ReadableStream` and `WritableStream` above).
/// 
/// * `stream = new streams.NetStream(stream[, options])`  
///    creates a network stream wrapper.
export interface SocketOptions extends ReadableOptions, WritableOptions {
	read?: ReadableOptions;
	write?: WritableOptions;
}
export class NetStream extends ReadableStream<net.Socket> {
	_writableStream: WritableStream<net.Socket>;
	constructor(emitter: net.Socket, options?: SocketOptions) {
		super(emitter, (options && options.read) || options);
		this._writableStream = new WritableStream(emitter, (options && options.write) || options);
	}
	// no multiple inheritance - so we delegate WritableStream methods
	write(_: _, data?: Data, enc?: string) {
		this._writableStream.write(_, data, enc);
		return this;
	}
	end(data?: Data, enc?: string) {
		this._writableStream.end(data, enc);
		return this;
	}
	get writer() {
		return this._writableStream.writer;
	}
	setTimeout(ms: number, callback?: Function) {
		this._emitter.setTimeout(ms, callback);
		return this;
	}
	setNoDelay(noDelay?: boolean) {
		this._emitter.setNoDelay(noDelay);
		return this;
	}
	setKeepAlive(enable?: boolean) {
		this._emitter.setKeepAlive(enable);
		return this;
	}
	ref() {
		this._emitter.ref();
		return this;
	}
	unref() {
		this._emitter.unref();
		return this;
	}
	destroy() {
		this._emitter.destroy();
		return this;
	}
	address() {
		return this._emitter.address();
	}
	get localAddress() { return this._emitter.localAddress; }
	get localPort() { return this._emitter.localPort; }
	get remoteAddress() { return this._emitter.remoteAddress; }
	get remotePort() { return this._emitter.remotePort; }
}

/// 
/// ## TCP and Socket clients
/// 
/// These are wrappers around node's `net.createConnection`:
/// 
/// * `client = streams.tcpClient(port, host[, options])`  
///    returns a TCP connection client.
/// * `client = streams.socketClient(path[, options])`  
///    returns a socket client.  
///    The `options` parameter of the constructor provide options for the stream (`lowMark` and `highMark`). 
///    If you want different options for `read` and `write` operations, you can specify them by creating `options.read` and `options.write` sub-objects inside `options`.
export interface NetClientOptions extends SocketOptions {}

export function tcpClient(port: number, host: string, options?: NetClientOptions) {
	host = host || "localhost";
	options = options || {};
	return new NetClient(options, port, host);
};
export function socketClient(path: string, options?: NetClientOptions) {
	options = options || {};
	return new NetClient(options, path);
};

export class NetClient {
	_options?: NetClientOptions;
	_connection: net.Socket;
	_error: Error;
	_done: boolean;
	_onConnect: (err?: Error) => void;
	constructor(options?: NetClientOptions, ...args: any[]) {
		this._options = options;
		this._connection = net.createConnection.apply(net, args);
		this._connection.on('error', (err: Error) => {
			if (!this._done) this._onConnect(err);
			this._onConnect = nop;
		});
		this._connection.on('connect', () => {
			this._onConnect();
			this._onConnect = nop;
		});
		this._onConnect = this._trackConnect;
	}

	_trackConnect(err?: Error) {
		this._done = true;
		if (err) this._error = err;
	}

	/// * `stream = client.connect(_)`  
	///    connects the client and returns a network stream.
	connect(callback: (err?: Error, stream?: NetStream) => void) {
		if (typeof callback !== 'function') throw new TypeError("bad callback parameter: " + typeof callback);
		if (this._done) return callback(this._error, new NetStream(this._connection, this._options));
		else {
			this._onConnect = (err) => {
				this._done = true;
				callback(err, new NetStream(this._connection, this._options));
				callback = nop;
			};
		}
	}
}

/// 
/// ## NetServer
/// 
/// This is a wrapper around node's `net.Server` object:
/// 
/// * `server = streams.createNetServer([serverOptions,] connectionListener [, streamOptions])`    
///   creates the wrapper.  
///   `connectionListener` is called as `connectionListener(stream, _)` 
///   where `stream` is a `NetStream` wrapper around the native connection.  
///   A fresh empty global context is set before every call to `connectionListener`. See [Global context API](https://github.com/Sage/streamline-runtime/blob/master/index.md).
/// * `server.listen(_, port[, host])`  
/// * `server.listen(_, path)`  
///   (same as `net.Server`)

export interface NetServerOptions {}
export type NetServerListener = (stream: NetStream, _: _) => void;

export function createNetServer(serverOptions: NetServerOptions, connectionListener: NetServerListener, streamOptions: SocketOptions) {
	return new NetServer(serverOptions, connectionListener, streamOptions);
};

export class NetServer extends Server<net.Server> {
	constructor(serverOptions: NetServerOptions, connectionListener: NetServerListener, streamOptions: SocketOptions) {
		if (typeof(serverOptions) === 'function') {
			streamOptions = connectionListener;
			connectionListener = serverOptions;
			serverOptions = {};
		}
		var emitter = net.createServer(serverOptions, (connection) => {
			_.withContext(() => {
				_.run(_ => connectionListener(new NetStream(connection, streamOptions || {}), _), (err?: Error) => {
					if (err) throw err;
				});
			})();
		});
		super(emitter);
	}
}

// Obsolete API - use legacy exports to keep it hidden in TypeScript

/// !nodoc 
/// ## try/finally wrappers and pump
/// 
/// * `result = streams.using(_, constructor, stream[, options], fn)`  
///    wraps `stream` with an instance of `constructor`;
///    passes the wrapper to `fn(_, wrapper)` and closes the stream after `fn` returns.  
///    `fn` is called inside a `try/finally` block to guarantee that the stream is closed in all cases.  
///    Returns the value returned by `fn`.
exports.using = function(_: _, constructor: any, emitter: NodeJS.EventEmitter, options?: any, fn?: (_: _, stream: any) => any) {
	if (!fn && typeof options === 'function') fn = options, options = null;
	if (!fn) throw new Error("using body missing");
	const stream = new constructor(emitter, options);
	try {
		return fn.call(this, _, stream);
	} finally {
		stream.close(_);
	}
};

/// * `result = streams.usingReadable(_, stream[, options], fn)`  
///    shortcut for `streams.using(_, streams.ReadableStream, stream, options, fn)` 
exports.usingReadable = function(_: _, emitter: NodeJS.ReadableStream, options?: ReadableOptions, fn?: (_: _, stream: any) => any) {
	return exports.using.call(this, _, ReadableStream, emitter, options, fn);
};

/// * `result = streams.usingWritable(_, stream[, options], fn)`  
///    shortcut for `streams.using(_, streams.WritableStream, stream, options, fn)` 
exports.usingWritable = function(_: _, emitter: NodeJS.WritableStream, options?: WritableOptions, fn?: (_: _, stream: any) => any) {
	return exports.using.call(this, _, WritableStream, emitter, options, fn);
};

/// * `streams.pump(_, inStream, outStream)`  
///    Pumps from `inStream` to `outStream`.  
///    Does not close the streams at the end.
exports.pump = function(_: _, inStream: ReadableStream<any>, outStream: WritableStream<any>) {
	var data: any;
	while (data = inStream.read(_)) outStream.write(_, data);
};
/// 
/// ## Encoding detection
/// 
/// The `options.detectEncoding` option controls how the encoding is sent by the
/// `HttpServerRequest` and `HttpClientResponse` constructors.  
/// This option can take the following values:
/// 
/// * `strict`: the RFC-2616-7.2.1 rules are applied.
/// * `default`: the default algorithm used by streamline v0.4 is used. 
///    This algorithm is more lenient and sets the encoding to `utf8` when text content is detected, even
///    if there is no charset indication.
/// * `disable`: null is always returned and the stream is always handled in binary mode (buffers rather than strings).
/// * a function. This is a hook for custom encoding detection. 
///   The function is called as `fn(headers)` and returns the encoding.
/// 
