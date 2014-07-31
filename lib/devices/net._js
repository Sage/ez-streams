"use strict";

var streams = require('streamline-streams/lib/streams');
var fixOptions = require('./node').fixOptions;

module.exports = {
	/// !doc
	/// ## TCP and socket EZ Streams
	/// 
	/// `var ez = require('ez-streams');`
	/// 
	/// * `server = ez.devices.net.server(serverOptions, listener, streamOptions)`  
	///   Creates an EZ HTTP server.  
	///   The `listener` is called as `listener(stream, _)`  
	///   where `stream` is an EZ reader and writer.  
	///   For a full description of this API, see `NetServer` in
	///   https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
	server: function(serverOptions, listener, streamOptions) {
		return streams.createNetServer(serverOptions, listener, fixOptions(streamOptions));
	},
	/// * `client = ez.devices.net.tcpClient(port, host, options)`  
	///   Creates an EZ TCP client.  
	///   The stream returned by `client.connect(_)`  is an EZ reader and writer.  
	///   For a full description of this API, see `tcpClient` in
	///   https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
	tcpClient: function(port, host, options) {
		return streams.tcpClient(port, host, fixOptions(options));
	},
	/// * `client = ez.devices.net.socketClient(path, options)`  
	///   Creates an EZ socket client.  
	///   The stream returned by `client.connect(_)`  is an EZ reader and writer.  
	///   For a full description of this API, see `tcpClient` in
	///   https://github.com/Sage/streamline-streams/blob/master/lib/streams.md 
	socketClient: function(path, options) {
		return streams.socketClient(path, fixOptions(options));
	},
};