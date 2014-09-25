"use strict";

var generic = require('./generic');
var flows = require('streamline/lib/util/flows');

/// !doc
/// ## Queue device
/// 
/// The queue device can be used to desynchronize processing between one or several tasks that produce
/// data and a task that consumes queued data.
/// 
/// `var ez = require('ez-streams');`
/// 
/// * `queue = ez.devices.queue(options)`  
///   creates a queue device.  
///   The queue device has two properties:  
///   `queue.reader`: a reader from which you can read the data which has been queued.  
///   `queue.writer`:  a writer to which you can write data.  
///   You can also interact with the queue with the following non-streaming API:  
///   `data = queue.get(_)` gets the next item from the queue.  
///   `ok = queue.put(data)` adds an item to the queue (synchronously).  
///   You can pass a `max` option through the `options` parameter when creating the queue. 
///   If you pass this option, `queue.put(data)` will return true if the data has been queued and false if 
///   the data has been discarded because the queue is full. 
///   Note that `queue.writer will not discard the data but instead will wait for the queue to become available. 
module.exports = function(options) {
	var queue = flows.queue(options);
	queue.reader = generic.reader(queue.read.bind(queue));
	queue.writer = generic.writer(queue.write.bind(queue));
	return queue;
};
