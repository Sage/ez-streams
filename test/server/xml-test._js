"use strict";
QUnit.module(module.id);
var ez = require("ez-streams");
var fs = require("streamline-fs");

function parseTest(_, xml, js, skipRT) {
	var full = '<?xml version="1.0"?><root>' + xml + "</root>\n";
	var parsed = ez.devices.string.reader(full).transform(ez.transforms.cut(2)) //
	.transform(ez.transforms.xml.parser('root')).toArray(_);
	deepEqual(parsed[0].root, js, "parse " + xml);
	if (!skipRT) {
		var rt = ez.devices.string.reader(full).transform(ez.transforms.cut(2)) //
		.transform(ez.transforms.xml.parser('root')) //
		.transform(ez.transforms.xml.formatter('root')).toArray(_).join('');
		strictEqual(rt, full, "roundtrip " + full);
	}
}

function rtTest(_, name, xml, indent, result) {
	var full = '<?xml version="1.0"?><root>' + xml + "</root>\n";
	result = '<?xml version="1.0"?>' + (indent ? '\n' : '') + '<root>' + (result || xml) + "</root>\n";
	var rt = ez.devices.string.reader(full).transform(ez.transforms.cut(2)) //
	.transform(ez.transforms.xml.parser('root')) //
	.transform(ez.transforms.xml.formatter({
		tags: 'root',
		indent: indent
	})).toArray(_).join('');
	strictEqual(rt, result, "roundtrip " + full);
}

asyncTest('simple tag without attributes', 6, function(_) {
	parseTest(_, '<a/>', {
		a: {}
	});
	parseTest(_, '<a></a>', {
		a: ""
	});
	parseTest(_, '<a>5</a>', {
		a: "5"
	});
	start();
});

asyncTest('simple tag with attributes', 6, function(_) {
	parseTest(_, '<a x="3" y="4">5</a>', {
		a: {
			$: {
				x: "3",
				y: "4"
			},
			$value: "5"
		}
	});
	parseTest(_, '<a x="3"></a>', {
		a: {
			$: {
				x: "3"
			},
			$value: ""
		}
	});
	parseTest(_, '<a x="3"/>', {
		a: {
			$: {
				x: "3"
			},
		}
	});
	start();
});

asyncTest('entities', 4, function(_) {
	parseTest(_, '<a x="a&gt;b&amp;c&lt;"/>', {
		a: {
			$: {
				x: "a>b&c<"
			},
		}
	});
	parseTest(_, '<a>a&gt;b&amp;c&lt;</a>', {
		a: "a>b&c<"
	});
	start();
});

asyncTest('children', 6, function(_) {
	parseTest(_, '<a><b>3</b><c>4</c></a>', {
		a: {
			b: "3",
			c: "4"
		}
	});
	parseTest(_, '<a><b x="2">3</b><c>4</c></a>', {
		a: {
			b: {
				$: {
					x: "2"
				},
				$value: "3"
			},
			c: "4"
		}
	});
	parseTest(_, '<a><b>3</b><b>4</b><c>5</c></a>', {
		a: {
			b: ["3", "4"],
			c: "5"
		}
	});
	start();
});

asyncTest('cdata', 4, function(_) {
	parseTest(_, '<a><![CDATA[<abc>]]></a>', {
		a: {
			$cdata: "<abc>"
		}
	});
	parseTest(_, '<a><![CDATA[]]></a>', {
		a: {
			$cdata: ""
		}
	});
	start();
});

asyncTest('comments in text', 1, function(_) {
	parseTest(_, '<a>abc <!-- <b>def</b> --> ghi</a>', {
		a: "abc  ghi"
	}, true);
	start();
});

asyncTest('reformatting', 7, function(_) {
	rtTest(_, 'spaces outside', ' \r\n\t <a/> \t', null, '<a/>');
	rtTest(_, 'spaces inside tag', '<a  x="v1"\ny="v2"\t/>', null, '<a x="v1" y="v2"/>');
	rtTest(_, 'spaces around children', '<a> <b />\n<c\n/>\t</a>', null, '<a><b/><c/></a>');
	rtTest(_, 'spaces and cdata', '<a> \n<![CDATA[ <abc>\n\t]]>\t</a>', null, '<a><![CDATA[ <abc>\n\t]]></a>');
	rtTest(_, 'spaces in value', '<a> </a>', null, '<a> </a>');
	rtTest(_, 'more spaces in value', '<a> \r\n\t</a>', null, '<a> &#0d;&#0a;&#09;</a>');
	rtTest(_, 'indentation', '<a><b x="3">5</b><c><d/></c></a>', '\t', '\n\t<a>\n\t\t<b x="3">5</b>\n\t\t<c>\n\t\t\t<d/>\n\t\t</c>\n\t</a>\n');
	start();
});

asyncTest('empty element in list', 1, function(_) {
	parseTest(_, '<a><b></b><b>x</b><b></b></a>', {
		a: {
			b: ["", "x", ""]
		}
	}, true);
	start();
});


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

asyncTest("rss roundtrip", 1, function(_) {
	var expected = fs.readFile(__dirname + '/../fixtures/rss-sample.xml', 'utf8', _);
	var result = ez.devices.file.text.reader(__dirname + '/../fixtures/rss-sample.xml') //
	.transform(ez.transforms.cut(5)) //
	.transform(ez.transforms.xml.parser("rss/channel/item")) //
	.transform(ez.transforms.xml.formatter({
		tags: "rss/channel/item",
		indent: "  "
	})) //
	.toArray(_).join('');
	expected = expected.replace(/\r?\n */g, '').replace(/<\!--.*-->/g, '');
	result = result.replace(/\r?\n */g, '');
	strictEqual(result, expected);
	start();
});
