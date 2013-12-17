"use strict";

var streams = require('streamline-streams/lib/streams');
var fixOptions = require('./node').fixOptions;

module.exports = {
	/// !doc
	/// ## HTTP EZ Streams
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `server = ez.devices.http.server(listener, options)`  
	///   Creates an EZ HTTP server.  
	///   The `listener` is called as `listener(request, response, _)`  
	///   where `request` is an EZ reader and `response` an EZ writer.  
	///   For a full description of this API, see `HttpServerRequest/Response` in
	///   https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
	server: function(listener, options) {
		return streams.createHttpServer(listener, fixOptions(options));
	},
	/// * `client = ez.devices.http.client(options)`  
	///   Creates an EZ HTTP client.  
	///   `client` is an EZ writer.  
	///   The response object returned by `client.response(_)`  is an EZ reader.  
	///   For a full description of this API, see `HttpClientRequest/Response` in
	///   https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
	client: function(options) {
		return streams.httpClient(fixOptions(options));
	},
};