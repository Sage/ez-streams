import { _ } from 'streamline-runtime';
import { fixOptions } from './node';
const streams = require('../node-wrappers');

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
export interface ServerOptions {}
export interface TcpStreamOptions {}
export interface TcpStream {}

export function server(listener?: (stream: TcpStream, _: _) => void, streamOptions?: TcpStreamOptions, serverOptions?: ServerOptions) {
	// compat hack 
	if (typeof streamOptions === "function") 
		return streams.createNetServer(arguments[0], arguments[1], fixOptions(arguments[2]));
	return streams.createNetServer(serverOptions, listener, fixOptions(streamOptions));
}
/// * `client = ez.devices.net.tcpClient(port, host, options)`  
///   Creates an EZ TCP client.  
///   The stream returned by `client.connect(_)`  is an EZ reader and writer.  
///   For a full description of this API, see `tcpClient` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
export interface TcpClientOptions {

}

export function tcpClient(port: number, host?: string, options?: TcpClientOptions) {
	return streams.tcpClient(port, host, fixOptions(options));
}
/// * `client = ez.devices.net.socketClient(path, options)`  
///   Creates an EZ socket client.  
///   The stream returned by `client.connect(_)`  is an EZ reader and writer.  
///   For a full description of this API, see `tcpClient` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
export interface TcpSocketOptions {

}

export function socketClient(path: string, options: TcpSocketOptions) {
	return streams.socketClient(path, fixOptions(options));
}
