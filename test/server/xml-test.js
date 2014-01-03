"use strict";
QUnit.module(module.id);
var ez = require("ez-streams");

asyncTest("rss feed", 5, function(_) {
	var entries = ez.devices.file.text.reader(__dirname + '/../fixtures/rss-sample.xml') //
	.transform(ez.transforms.cut(2)) //
	.transform(ez.transforms.xml.parser("rss/channel/item")).toArray(_);
	strictEqual(entries.length, 10);
	strictEqual(entries[0].rss.channel.title, "Yahoo! Finance: Top Stories");
	strictEqual(entries[0].rss.channel.item.title, "Wall Street ends down on first trading day of 2014");
	strictEqual(entries[9].rss.channel.title, "Yahoo! Finance: Top Stories");
	strictEqual(entries[9].rss.channel.item.title, "2013's big winners abandoned 'safety' and bet on central bankers");
	start();
});
