"use strict";

const streams = require('../node-wrappers');
const fixOptions = require('./node').fixOptions;

module.exports = {
	/// !doc
	/// ## TCP and socket EZ Streams
	/// 
	/// `const ez = require('ez-streams');`
	/// 
	/// * `server = ez.devices.net.server(serverOptions, listener, streamOptions)`  
	///   Creates an EZ HTTP server.  
	///   The `listener` is called as `listener(stream, _)`  
	///   where `stream` is an EZ reader and writer.  
	///   For a full description of this API, see `NetServer` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	server: (serverOptions, listener, streamOptions) => streams.createNetServer(serverOptions, listener, fixOptions(streamOptions)),
	/// * `client = ez.devices.net.tcpClient(port, host, options)`  
	///   Creates an EZ TCP client.  
	///   The stream returned by `client.connect(_)`  is an EZ reader and writer.  
	///   For a full description of this API, see `tcpClient` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	tcpClient: (port, host, options) => streams.tcpClient(port, host, fixOptions(options)),
	/// * `client = ez.devices.net.socketClient(path, options)`  
	///   Creates an EZ socket client.  
	///   The stream returned by `client.connect(_)`  is an EZ reader and writer.  
	///   For a full description of this API, see `tcpClient` in
	///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
	socketClient: (path, options) => streams.socketClient(path, fixOptions(options)),
};