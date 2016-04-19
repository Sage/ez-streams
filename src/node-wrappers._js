/**
 * Copyright (c) 2011 Bruno Jouhier <bruno.jouhier@sage.com>
 * MIT License
 */
"use strict";

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
const parseUrl = require("url").parse;
const globals = require('streamline-runtime').globals;
const flows = require('streamline-runtime').flows;
const os = require("os");
var generic;

function wrapProperties(constr, writable, props) {
	props.forEach(function(name) {
		const desc = {};
		desc.get = function() {
			return this.emitter[name];
		};
		if (writable) desc.set = function(val) {
			this.emitter[name] = val;
		};
		constr.prototype[name] === undefined && Object.defineProperty(constr.prototype, name, desc);
	});
}

function wrapMethods(constr, methods) {
	methods.forEach(function(name) {
		constr.prototype[name] = function() {
			return this.emitter[name].apply(this.emitter, arguments);
		};
	});
}

function wrapOptionalMethods(constr, methods) {
	methods.forEach(function(name) {
		constr.prototype[name] = function() {
			return this.emitter[name] && this.emitter[name].apply(this.emitter, arguments);
		};
	});
}

function wrapChainMethods(constr, methods) {
	methods.forEach(function(name) {
		constr.prototype[name] = function() {
			this.emitter[name].apply(this.emitter, arguments);
			return this;
		};
	});
}

function wrapEvents(constr, events) {
	constr.prototype.events = (constr.prototype.events || []).concat(events);
}

/// 
/// ## Wrapper
/// 
/// Base wrapper for all objects that emit an `end` or `close` event.  
/// All stream wrappers derive from this wrapper.
/// 
/// * `wrapper = new streams.Wrapper(stream)`  
///   creates a wrapper.

function Wrapper(emitter) {
	const self = this;
	var closed = false;
	emitter.on('close', function() {
		_onClose && _onClose();
	});

	// hook for subclasses
	self.autoClosed = [];

	function trackClose() {
		closed = true;
		self.autoClosed.forEach(function(fn) {
			fn.call(self);
		});
	}
	var _onClose = trackClose;

	self.close = function(callback) {
			if (typeof callback !== 'function') throw new TypeError("bad callback parameter: " + typeof callback);
			if (closed) return callback();
			const close = emitter.end || emitter.close || emitter.destroySoon;
			if (typeof close !== "function") return callback();
			_onClose = function(err) {
				closed = true;
				_onClose = null;
				callback(err);
				callback = null;
			};
			if (self.doesNotEmitClose) {
				emitter.emit("close");
			}
			close.call(emitter);
		};
	/// * `emitter = wrapper.emitter`  
	///    returns the underlying emitter. The emitter stream can be used to attach additional observers.
	self.emitter === undefined && Object.defineProperty(self, "emitter", {
		get: function() {
			return emitter;
		}
	});
	/// * `closed = wrapper.closed`   
	///    returns true if the `close` event has been received.
	self.closed === undefined && Object.defineProperty(self, "closed", {
		get: function() {
			return closed;
		}
	});
	/// * `emitter = wrapper.unwrap()`  
	///    unwraps and returns the underlying emitter.  
	///    The wrapper should not be used after this call.
	self.unwrap = function() {
		if (emitter) emitter.removeAllListeners();
		closed = true;
		const em = emitter;
		emitter = null;
		return em;
	};
}

/// 
/// ## ReadableStream
/// 
/// All readable stream wrappers derive from this wrapper. 
/// 
/// * `stream = new streams.ReadableStream(stream[, options])`  
///   creates a readable stream wrapper.

function ReadableStream(emitter, options) {
	const self = this;
	Wrapper.call(self, emitter);
	options = options || {};
	var _current = 0;
	const _chunks = [];
	var _error;
	var _done = false;
	var _encoding;

	function trackData(err, chunk) {
		if (err) _error = err;
		else if (chunk) {
			_chunks.push(chunk);
			_current += chunk.length;
		} else _done = true;
	};

	// initialize _onData before setting listeners because listeners may emit data events immediately
	// (during the `on` call!)
	var _onData = trackData;

	emitter.on('error', function(err) {
		_onData(err);
	});
	emitter.on('readable', function() {
		var chunk = emitter ? emitter.read() : null;
		_onData(null, chunk);
	});
	emitter.on('end', function() {
		_onData(null, null);
	});

	self.autoClosed.push(function() {
		!_done && _onData(new Error("stream was closed unexpectedly"));
	});

	const readChunk = function(callback) {
		if (_chunks.length > 0) {
			const chunk = _chunks.splice(0, 1)[0];
			_current -= chunk.length;
			return callback(null, chunk);
		} else if (_done) {
			return callback(null);
		} else if (_error) {
			return callback(_error);
		} else _onData = function(err, chunk) {
			if (err) _error = err;
			else if (!chunk) _done = true;
			_onData = trackData; // restore it
			callback(err, chunk != null ? chunk : undefined);
			callback = null;
		};
	};

	function concat(chunks, total) {
		if (_encoding) return chunks.join('');
		if (chunks.length == 1) return chunks[0];
		const result = new Buffer(total);
		chunks.reduce(function(val, chunk) {
			chunk.copy(result, val);
			return val + chunk.length;
		}, 0);
		return result;
	}
	/// * `stream.setEncoding(enc)`  
	///   sets the encoding.
	///   returns `this` for chaining.
	self.setEncoding = function(enc) {
		_encoding = enc;
		if (enc) emitter.setEncoding(enc);
		return self;
	};
	/// * `data = stream.read(_[, len])`  
	///   reads asynchronously from the stream and returns a `string` or a `Buffer` depending on the encoding.  
	///   If a `len` argument is passed, the `read` call returns when `len` characters or bytes 
	///   (depending on encoding) have been read, or when the underlying stream has emitted its `end` event 
	///   (so it may return less than `len` bytes or chars).
	///   Reads till the end if `len` is negative.  
	///   Without `len`, the read calls returns the data chunks as they have been emitted by the underlying stream.  
	///   Once the end of stream has been reached, the `read` call returns `null`.
	self.read = function(_, len) {
		if (self.closed && !_chunks.length) return undefined;
		if (len == null) return self.reader.read(_);
		if (len < 0) len = Infinity;
		if (len == 0) return _encoding ? "" : new Buffer(0);
		const chunks = [];
		var total = 0;
		while (total < len) {
			var chunk = self.reader.read(_);
			if (!chunk) return chunks.length == 0 ? undefined : concat(chunks, total);
			if (total + chunk.length <= len) {
				chunks.push(chunk);
				total += chunk.length;
			} else {
				chunks.push(chunk.slice(0, len - total));
				self.unread(chunk.slice(len - total));
				total = len;
			}
		}
		return concat(chunks, total);
	};
	/// * `data = stream.readAll(_)`  
	///   reads till the end of stream.  
	///   Equivalent to `stream.read(_, -1)`.
	self.readAll = function(_) {
		const result = self.read(_, -1);
		return result === undefined ? null : result;
	};
	/// * `stream.unread(chunk)`  
	///   pushes the chunk back to the stream.  
	///   returns `this` for chaining.
	self.unread = function(chunk) {
		if (chunk) {
			_chunks.splice(0, 0, chunk);
			_current += chunk.length;
		}
		return self;
	};

	/// * `len = stream.available()`  
	///   returns the number of bytes/chars that have been received and not read yet.
	self.available = function() {
		return _chunks.reduce(function(count, chunk) {
			return count + chunk.length;
		}, 0);
	};

	const stop = function(_, arg) {
		if (arg && arg !== true) _error = _error || arg;
		self.unwrap();
		emitter = null;
	}
	self.stop = stop;

	/// * `reader = stream.reader`  
	///   returns a clean ez reader.
	self.reader = (generic = generic || require('./devices/generic')).reader(readChunk, stop);
}

exports.ReadableStream = ReadableStream;
ReadableStream.prototype = Object.create(Wrapper.prototype);
wrapEvents(ReadableStream, ["error", "data", "end", "close"]);

// Some node streams (child process stdout and stderr for ex) don't implement the streams2 API correctly. 
// Their read() method always retuns null!
// So, wehandle them in flowing mode (streams1) and we create a small wrapper which re-exposes them as streams2.
const EventEmitter = require('events');

exports.stream2Wrapper = function(stream1) {
	var chunks = [];
	var stream2 = new EventEmitter();
	stream1.on('data', chunk => {
		chunks.push(chunk);
		stream1.pause();
		stream2.emit('readable');
	});
	stream1.on('end', () => {
		chunks.push(null);
		stream2.emit('readable');
	});
	stream1.on('error', err => {
		stream2.emit('error', err);
	});
	stream2.read = function() {
		var data = chunks.shift();
		if (chunks.length === 0) stream1.resume();
		return data;
	}
	stream2.setEncoding = stream1.setEncoding.bind(stream1);
	return stream2;
}

/// 
/// ## WritableStream
/// 
/// All writable stream wrappers derive from this wrapper. 
/// 
/// * `stream = new streams.WritableStream(stream[, options])`  
///   creates a writable stream wrapper.

function WritableStream(emitter, options) {
	const self = this;
	Wrapper.call(self, emitter);
	options = options || {};
	var _error;
	var _onDrain;

	emitter.on('error', function(err) {
		if (_onDrain) _onDrain(err);
		else _error = err;
	});
	emitter.on('drain', function() {
		_onDrain && _onDrain();
	});

	self.autoClosed.push(function() {
		const err = new Error("stream was closed unexpectedly");
		if (_onDrain) _onDrain(err);
		else _error = err;
	});

	var _drain = function(callback) {
		_onDrain = function(err) {
			_onDrain = null;
			callback(err);
			callback = null;
		};
	};

	/// * `stream.write(_, data[, enc])`  
	///   Writes the data.  
	///   This operation is asynchronous because it _drains_ the stream if necessary.  
	///   Returns `this` for chaining.
	self.write = function(_, data, enc) {
		if (typeof data === "string") data = new Buffer(data, enc || options.encoding || "utf8");
		else if (data === null) data = undefined;
		self.writer.write(_, data);
		return self;
	};

	/// * `stream.end()`  
	///   signals the end of the send operation.  
	///   Returns `this` for chaining.
	self.end = function(data, enc) {
		if (self.writer.ended) {
			if (data != null) throw new Error("invalid attempt to write after end");
			return;
		}
		if (typeof data === "string") data = new Buffer(data, enc || options.encoding || "utf8");
		else if (data === null) data = undefined;
		if (data !== undefined) {
			self.writer.write(function(err) {
				if (err) throw err;
				self.end();
			}, data);
		} else {
			self.writer.write(function(err) {
				if (err) throw err;
			});
		}
		return self;
	};

	/// * `writer = stream.writer`  
	///   returns a clean ez writer.
	self.writer = (generic = generic || require('./devices/generic')).writer(function(_, data) {
		if (_error) throw new Error(_error.message);
		// node streams don't differentiate between null and undefined. So end in both cases
		if (data != null) {
			// if data is empty do nothing but it's not to be interpreted as end
			if (!data.length) return;
			if (typeof data === "string") data = new Buffer(data, options.encoding || "utf8");
			//
			if (!emitter.write(data)) _drain(_);
		} else {
			emitter.end(_);
		}
	});
}

exports.WritableStream = WritableStream;
WritableStream.prototype = Object.create(Wrapper.prototype);
wrapEvents(WritableStream, ["drain", "close"]);

function _getEncodingDefault(headers) {
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
	return null;
}

function _getEncodingStrict(headers) {
	// As per RFC-2616-7.2.1, if media type is unknown we should treat it
	// as "application/octet-stream" (may optionally try to determine it by
	// looking into content body - we don't)
	if (!headers['content-type'] || headers['content-encoding']) return null;

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
			return null; // we do not understand this charset - do *not* encode
		}
	}
	return null;
}

function _getEncoding(headers, options) {
	if (headers['content-encoding']) return null;
	if (!options) return _getEncodingDefault(headers);
	if (typeof options.detectEncoding === "function") return options.detectEncoding(headers);
	switch (options.detectEncoding) {
		case 'strict':
			return _getEncodingStrict(headers);
		case 'disable':
			return null;
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
///    The `options` parameter can be used to control encoding detection (see section below).

function HttpServerRequest(req, options) {
	const self = this;
	ReadableStream.call(self, req, options);
	self._request = req;
	self.setEncoding(_getEncoding(req.headers, options));
	if (req.session) self.session = req.session;
}

exports.HttpServerRequest = HttpServerRequest;
HttpServerRequest.prototype = Object.create(ReadableStream.prototype);
HttpServerRequest.prototype.doesNotEmitClose = true;

/// * `method = request.method` 
/// * `url = request.url` 
/// * `headers = request.headers` 
/// * `trailers = request.trailers` 
/// * `httpVersion = request.httpVersion` 
/// * `connection = request.connection` 
/// * `socket = request.socket`  
///   (same as `http.ServerRequest`)
// TODO: all properties may not be writable - check
wrapProperties(HttpServerRequest, true, ["method", "url", "headers", "trailers", "httpVersion", "connection", "socket", "client"]);

/// 
/// ## HttpServerResponse
/// 
/// This is a wrapper around node's `http.ServerResponse`.  
/// This stream is writable (see `WritableStream` above).
/// 
/// * `response = new streams.HttpServerResponse(resp[, options])`  
///   returns a wrapper around `resp`, an `http.ServerResponse` object.

function HttpServerResponse(resp, options) {
	const self = this;
	WritableStream.call(self, resp, options);
	self._response = resp;
}

exports.HttpServerResponse = HttpServerResponse;
HttpServerResponse.prototype = Object.create(WritableStream.prototype);
HttpServerResponse.prototype.doesNotEmitClose = true;

/// * `response.writeContinue()` 
/// * `response.writeHead(head)` 
/// * `response.setHeader(name, value)` 
/// * `value = response.getHeader(head)` 
/// * `response.removeHeader(name)` 
/// * `response.addTrailers(trailers)` 
/// * `response.statusCode = value`  
///   (same as `http.ServerResponse`)
wrapChainMethods(HttpServerResponse, ["writeContinue", "writeHead", "setHeader", "removeHeader", "addTrailers"]);
wrapMethods(HttpServerResponse, ["getHeader"]);
wrapProperties(HttpServerResponse, true, ["statusCode"]);

function _fixHttpServerOptions(options) {
	options = options || {};
	options.createServer = function(callback) {
		if (typeof callback !== 'function') throw new TypeError("bad callback parameter: " + typeof callback);
		return options.secure ? require("https").createServer(options, callback) : require("http").createServer(callback);
	};
	return options;
}

// Abstract class shared by HttpServer and NetServer
function Server(emitter) {
	const self = this;
	Wrapper.call(self, emitter);

	self.listen = function(callback, args) {
		if (typeof callback !== 'function') throw new TypeError("bad callback parameter: " + typeof callback);
		if (self.closed) throw new Error("cannot listen: server is closed");
		args = Array.prototype.slice.call(arguments, 1);
			function reply(err, result) {
				const cb = callback;
				callback = null;
				cb && cb(err, result);
			}
			args.push(function() {
				reply(null, self);
			});

			self.autoClosed.push(function() {
				reply(new Error("server was closed unexpectedly"));
			});
			emitter.on('error', reply);
			emitter.listen.apply(emitter, args);
	};
}
Server.prototype = Object.create(Wrapper.prototype);

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

exports.httpListener = function(listener, options) {
	options = options || {};
	return function(request, response) {
		return flows.withContext(function() {
			return listener(new HttpServerRequest(request, options), new HttpServerResponse(response, options), function(err) {
				// handlers do not read GET requests - so we remove the listeners, in case
				if (!/^(post|put)$/i.test(request.method)) request.removeAllListeners();
				if (err) throw err;
			});
		})();
	};
};

exports.createHttpServer = function(requestListener, options) {
	return new HttpServer(requestListener, options);
};

function HttpServer(requestListener, options) {
	const self = this;
	options = _fixHttpServerOptions(options);
	const emitter = options.createServer(exports.httpListener(requestListener, options));
	Server.call(self, emitter);
}

HttpServer.prototype = Object.create(Server.prototype);
// node.js version lower than 0.11.2 do not inmplement a https.Server.setTimeout method.
// As a consequence we need to protect the call in the wrapper
wrapOptionalMethods(HttpServer, ["setTimeout"]);

// deprecated API - use createHttpServer instead
exports.HttpServer = HttpServer;

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

function HttpClientResponse(resp, options) {
	const self = this;
	ReadableStream.call(self, resp, options);
	self._response = resp;
	self.setEncoding(_getEncoding(resp.headers, options));
}

HttpClientResponse.prototype = Object.create(ReadableStream.prototype);

/// * `status = response.statusCode`  
///    returns the HTTP status code.
/// * `version = response.httpVersion`  
///    returns the HTTP version.
/// * `headers = response.headers`  
///    returns the HTTP response headers.
/// * `trailers = response.trailers`  
///    returns the HTTP response trailers.
wrapProperties(HttpClientResponse, false, ["statusCode", "httpVersion", "headers", "trailers"]);

/// * `response.checkStatus(statuses)`  
///    throws an error if the status is not in the `statuses` array.  
///    If only one status is expected, it may be passed directly as an integer rather than as an array.  
///    Returns `this` for chaining.
HttpClientResponse.prototype.checkStatus = function(statuses) {
	if (typeof statuses === 'number') statuses = [statuses];
	if (statuses.indexOf(this.statusCode) < 0) throw new Error("invalid status: " + this.statusCode);
	return this;
};

function _fixHttpClientOptions(options) {
	if (!options) throw new Error("request error: no options");
	if (typeof options === "string") options = {
		url: options
	};
	if (options.url) {
		const parsed = parseUrl(options.url);
		options.protocol = parsed.protocol;
		options.host = parsed.hostname;
		options.port = parsed.port;
		options.path = parsed.pathname + (parsed.query ? "?" + parsed.query : "");
	}
	options.protocol = options.protocol || "http:";
	options.port = options.port || (options.protocol === "https:" ? 443 : 80);
	options.path = options.path || "/";
	if (!options.host) throw new Error("request error: no host");
	options.method = options.method || "GET";
	options.headers = Object.keys(options.headers || {}).reduce(function(headers, key) {
		if (options.headers[key] != null) headers[key] = options.headers[key];
		return headers;
	}, {});
	options.module = require(options.protocol.substring(0, options.protocol.length - 1));
	if (options.user != null) {
		// assumes basic auth for now
		var token = options.user + ":" + (options.password || "");
		token = new Buffer(token, "utf8").toString("base64");
		options.headers.Authorization = "Basic " + token;
	}

	if (options.proxy) {
		// Do not use proxy for local requests
		if (options.host !== os.hostname()) {
			if (typeof options.proxy === "string") {
				options.proxy = parseUrl(options.proxy);
				options.proxy.host = options.proxy.hostname;
			}
			// Check excludes
			if (!options.proxy.force && options.proxy.excludes && options.proxy.excludes.indexOf(options.host.toLowerCase()) !== -1) {
				// Do nothing
			} else {
				options.proxy.port = options.proxy.port || options.port;
				if (!options.proxy.host) throw new Error("proxy configuration error: no host");
				if (!options.proxy.port) throw new Error("proxy configuration error: no port");
				options.proxy.protocol = options.proxy.protocol || "http:";
				// https requests will be handled with CONNECT method
				options.isHttps = options.protocol.substr(0, 5) === "https";
				if (options.isHttps) {
					options.proxy.module = require(options.proxy.protocol.substring(0, options.proxy.protocol.length - 1));
					options.proxy.headers = options.proxy.headers || {};
					options.proxy.headers.host = options.host;
				} else {
					options.path = options.protocol + "//" + options.host + ":" + options.port + options.path;
					options.host = options.proxy.host;
					options.port = options.proxy.port;
					options.headers.host = options.host;
				}

				if (options.proxy.auth) {
					if (options.proxy.auth.toLowerCase() === "basic") {
						if (!options.proxy.user) throw new Error("request error: no proxy user");
						var proxyToken = options.proxy.user + ":" + (options.proxy.password || "");
						proxyToken = new Buffer(proxyToken, "utf8").toString("base64");
						options.headers["Proxy-Authorization"] = "Basic " + proxyToken;
					} else if (options.proxy.auth.toLowerCase() === "ntlm") {

						const proxyAuthenticator = options.proxy.proxyAuthenticator;
						if (!proxyAuthenticator) throw new Error("Proxy Authenticator module required");
						if (!proxyAuthenticator.authenticate) throw new Error("NTLM Engine module MUST provide 'authenticate' function");
						options.proxyAuthenticate = proxyAuthenticator.authenticate;
					} else if (options.proxy.auth.toLowerCase() === "digest") {
						throw new Error("Proxy Digest authentication not yet implemented");
					}
				}
			}
		}
	}
	return options;
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
///      Note that these values are only hints as the data is received in chunks.

function HttpClientRequest(options) {
	const self = this;
	//options = _fixHttpClientOptions(options);
	function _init() {
		const _request = options.module.request(options, function(resp) {
			_onResponse(null, resp && new HttpClientResponse(resp, options));
		});
		WritableStream.call(self, _request, options);
		var _response;
		var _error;
		var _done = false;

		_request.on('error', function(err) {
			!_done && _onResponse(err);
		});

		self.autoClosed.push(function() {
			!_done && _onResponse(new Error("stream was closed unexpectedly"));
		});

		function trackResponse(err, resp) {
			_done = true;
			_error = err;
			_response = resp;
		}

		var _onResponse = trackResponse;
		/// * `response = request.response(_)`  
		///    returns the response. 
		self.response = function(callback) {
			if (typeof callback !== 'function') throw new TypeError("bad callback parameter: " + typeof callback);
				if (_done) return callback(_error, _response);
			else _onResponse = function(err, resp) {
				_done = true;
				if (callback) callback(err, resp);
				callback = null;
			};
		};
	}
	
	if (!options.proxyAuthenticate && !options.isHttps) _init();

	self.proxyConnect = function(_) {
		if (options.isHttps) {
			// TODO: Don't authenticate with ntlm, nodejs raises "Parse error" in return of connect with 407 -> HPE_INVALID_CONSTANT
			return (function(callback) {
				const proxyOpt = {
						host: options.proxy.host,
						port: options.proxy.port,
						method: 'CONNECT',
						path: options.host + ":" + options.port,
						headers: options.proxy.headers
					};
				// open proxy socket
				options.proxy.module.request(proxyOpt).on('connect', function(res, socket, head) {
					options.socket = socket;
					options.agent = false;
					//
					_init();
					callback(null, self);
					callback = null;
				}).on('error', function(err) {
					callback(err);
					callback = null;
				}).end();
				return self;
			})(_);
		} else //
			if (options.proxyAuthenticate) {
				options.proxyAuthenticate(_, options);
				_init();
			}
		return self;
	};
}

HttpClientRequest.prototype = Object.create(WritableStream.prototype);

/// * `request.abort()`  
///    aborts the request. 
wrapChainMethods(HttpClientRequest, ["abort"]);
HttpClientRequest.prototype.setTimeout = function(ms) {
	const self = this;
	this.emitter.setTimeout(ms, function() {
		self.emitter.emit('error', 'timeout');
	});
	return this;
}

exports.httpRequest = function(options) {
	options = _fixHttpClientOptions(options);
	return new HttpClientRequest(options);
};

/// 
/// ## NetStream
/// 
/// This is a wrapper around streams returned by TCP and socket clients:
/// 
/// These streams are both readable and writable (see `ReadableStream` and `WritableStream` above).
/// 
/// * `stream = new streams.NetStream(stream[, options])`  
///    creates a network stream wrapper.

function NetStream(emitter, options) {
	const self = this;
	ReadableStream.call(self, emitter, options.read || options);
	WritableStream.call(self, emitter, options.write || options);
}
NetStream.prototype = Object.create(ReadableStream.prototype);
Object.keys(WritableStream.prototype).forEach(function(key) {
	NetStream.prototype[key] = WritableStream.prototype[key];
});

wrapChainMethods(NetStream, ["setTimeout", "setNoDelay", "setKeepAlive", "ref", "unref", "destroy"]);
wrapMethods(NetStream, ["address"]);
wrapProperties(NetStream, false, ["localAddress", "localPort", "remoteAddress", "remotePort"]);

exports.NetStream = NetStream;

var net; // lazy require
/// 
/// ## TCP and Socket clients
/// 
/// These are wrappers around node's `net.createConnection`:
/// 
/// * `client = streams.tcpClient(port, host[, options])`  
///    returns a TCP connection client.
/// * `client = streams.socketClient(path[, options])`  
///    returns a socket client.  
///    The `options` parameter of the constructor provide options for the stream. 
///    If you want different options for `read` and `write` operations, you can specify them by creating `options.read` and `options.write` sub-objects inside `options`.
exports.tcpClient = function(port, host, options) {
	host = host || "localhost";
	options = options || {};
	return new NetClient(options, port, host);
};
exports.socketClient = function(path, options) {
	options = options || {};
	return new NetClient(options, path);
};

function NetClient(options, args) {
	const self = this;
	args = Array.prototype.slice.call(arguments, 1);
	net = net || require("net");
	const _connection = net.createConnection.apply(net, args);
	var _error;
	var _done = false;

	_connection.on('error', function(err) {
		!_done && _onConnect && _onConnect(err);
		_onConnect = null;
	});

	_connection.on('connect', function() {
		_onConnect && _onConnect(null);
		_onConnect = null;
	});

	function trackConnect(err) {
		_done = true;
		_error = err;
	};

	var _onConnect = trackConnect;

	/// * `stream = client.connect(_)`  
	///    connects the client and returns a network stream.
	self.connect = function(callback) {
			if (typeof callback !== 'function') throw new TypeError("bad callback parameter: " + typeof callback);
			if (_done) return callback(_error, new NetStream(_connection, options));
			else _onConnect = function(err) {
				_done = true;
				callback(err, new NetStream(_connection, options));
				callback = null;
			};
		};
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

exports.createNetServer = function(serverOptions, connectionListener, streamOptions) {
	return new NetServer(serverOptions, connectionListener, streamOptions);
};

function NetServer(serverOptions, connectionListener, streamOptions) {
	const self = this;
	if (typeof(serverOptions) === 'function') {
		streamOptions = connectionListener;
		connectionListener = serverOptions;
		serverOptions = {};
	}
	net = net || require("net");
	const emitter = net.createServer(serverOptions, function(connection) {
			flows.withContext(function() {
				connectionListener(new NetStream(connection, streamOptions || {}), function(err) {
					if (err) throw err;
				});
			})();
		});
	Server.call(self, emitter);
}
NetServer.prototype = Object.create(Server.prototype);

/// 
/// ## try/finally wrappers and pump
/// 
/// * `result = streams.using(_, constructor, stream[, options], fn)`  
///    wraps `stream` with an instance of `constructor`;
///    passes the wrapper to `fn(_, wrapper)` and closes the stream after `fn` returns.  
///    `fn` is called inside a `try/finally` block to guarantee that the stream is closed in all cases.  
///    Returns the value returned by `fn`.
exports.using = function(_, constructor, emitter, options, fn) {
	if (!fn && typeof options === 'function') fn = options, options = null;
	const stream = new constructor(emitter, options);
	try {
		return fn.call(this, _, stream);
	} finally {
		stream.close(_);
	}
};

/// * `result = streams.usingReadable(_, stream[, options], fn)`  
///    shortcut for `streams.using(_, streams.ReadableStream, stream, options, fn)` 
exports.usingReadable = function(_, emitter, options, fn) {
	return exports.using.call(this, _, exports.ReadableStream, emitter, options, fn);
};

/// * `result = streams.usingWritable(_, stream[, options], fn)`  
///    shortcut for `streams.using(_, streams.WritableStream, stream, options, fn)` 
exports.usingWritable = function(_, emitter, options, fn) {
	return exports.using.call(this, _, exports.WritableStream, emitter, options, fn);
};

/// * `streams.pump(_, inStream, outStream)`  
///    Pumps from `inStream` to `outStream`.  
///    Does not close the streams at the end.
exports.pump = function(_, inStream, outStream) {
	var data;
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
