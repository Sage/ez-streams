"use strict";

var streams = require('streamline-streams/lib/streams');
var fixOptions = require('./node').fixOptions;

module.exports = {
	server: function(listener, options) {
		return streams.createHttpServer(listener, fixOptions(options));
	},
	client: function(options) {
		return streams.httpClient(fixOptions(options));
	},
};