import { _ } from 'streamline-runtime';
import { fixOptions } from './node';
import * as streams from '../node-wrappers';

/// !doc
/// ## TCP and socket EZ Streams
/// 
/// `import * as ez from 'ez-streams'`
/// 
/// * `server = ez.devices.net.server(serverOptions, listener, streamOptions)`  
///   Creates an EZ HTTP server.  
///   The `listener` is called as `listener(stream, _)`  
///   where `stream` is an EZ reader and writer.  
///   For a full description of this API, see `NetServer` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 
export type SocketServer = streams.SocketServer;
export type SocketServerOptions = streams.SocketServerOptions;
export type SocketStream = streams.SocketStream;
export type SocketOptions = streams.SocketOptions;
export type SocketClient = streams.SocketClient;

export function server(listener: (stream: SocketStream, _: _) => void, streamOptions?: SocketOptions, serverOptions?: SocketServerOptions) {
	// compat hack 
	if (typeof streamOptions === "function") 
		return streams.createNetServer(arguments[0], arguments[1], fixOptions(arguments[2]));
	return streams.createNetServer(serverOptions!, listener, fixOptions(streamOptions));
}
/// * `client = ez.devices.net.tcpClient(port, host, options)`  
///   Creates an EZ TCP client.  
///   The stream returned by `client.connect(_)`  is an EZ reader and writer.  
///   For a full description of this API, see `tcpClient` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 

export function tcpClient(port: number, host?: string, options?: SocketOptions) {
	return streams.tcpClient(port, host, fixOptions(options));
}
/// * `client = ez.devices.net.socketClient(path, options)`  
///   Creates an EZ socket client.  
///   The stream returned by `client.connect(_)`  is an EZ reader and writer.  
///   For a full description of this API, see `tcpClient` in
///   https://github.com/Sage/ez-streams/blob/master/lib/node-wrappers.md 

export function socketClient(path: string, options: SocketOptions) {
	return streams.socketClient(path, fixOptions(options));
}
