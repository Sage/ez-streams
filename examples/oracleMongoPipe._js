try {
	var oracle = require('oracle');
} catch (ex) {
	console.log("this example requires node-oracle driver, install it with `npm install oracle`");
}

try {
	var mongodb = require('mongodb');
} catch (ex) {
	console.log("this example requires mongodb driver, install it with `npm install mongodb`");
}

try {
	var config = require("./config-custom");
} catch (ex) {
	console.log("WARNING: you did not create config-custom.json, running with the default config.json")
	config = require("./config");
}

var ez = require('ez-streams');

var oracleConn = oracle.connect(config.oracle, _);
oracleConn.setPrefetchRowCount(config.oracle.prefetchRowCount || 50);

var mongodbConn = new mongodb.Db(config.mongodb.database, //
new mongodb.Server(config.mongodb.host, config.mongodb.port, {}), {
	w: 1,
}).open(_);

if (config.mongodb.writable) {
	mongodbConn.collection(config.mongodb.collection, _).remove({}, _);
	var count = 0,
		t0 = Date.now();
	ez.devices.oracle.reader(oracleConn.reader('select * from "' + config.oracle.table + '"', [])) //
	.map(function(_, obj) {
		count++;
		return obj;
	}).pipe(_, ez.devices.mongodb.writer(mongodbConn.collection(config.mongodb.collection, _)));
	console.log(count + " records transferred from oracle to mongodb in " + (Date.now() - t0) + " millis");
} else {
	console.log("skipping oracle -> mongodb transfer");
}

if (config.oracle.writable) {
	oracleConn.execute('delete from "' + config.oracle.table + '"', [], _);
	var count = 0,
		t0 = Date.now();
	ez.devices.mongodb.reader(mongodbConn.collection(config.mongodb.collection, _).find()) //
	.map(function(_, obj) {
		count++;
		delete obj._id;
		return obj;
	}).pipe(_, ez.devices.oracle.writer(oracleConn, config.oracle.table));
	console.log(count + " records transferred from mongodb to oracle in " + (Date.now() - t0) + " millis");
} else {
	console.log("skipping mongodb -> oracle transfer");
}
mongodbConn.close();