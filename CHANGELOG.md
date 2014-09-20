## v0.1.5
2014-09-06
* [c6dfcbb](https://github.com/Sage/ez-streams/commit/c6dfcbbd1f63d9e28656c05d5e2bdf00f400f2d5) Fixed encoding issue with native streams.
* [4e6043f](https://github.com/Sage/ez-streams/commit/4e6043f1f0cf3dff8696f2d539db5a7775f55333) added `sep` option to lines transform.
* [28b9d1f](https://github.com/Sage/ez-streams/commit/28b9d1f2e531f60cc1fb76875e200a8fad8e837f) added `child_process` device.
* [#3](https://github.com/Sage/ez-streams/issues/3) fixed incompatibility with streamline _fast_ mode.
* [#4](https://github.com/Sage/ez-streams/issues/4) mongodb device can update existing documents (could only insert before).
* [#5](https://github.com/Sage/ez-streams/issues/5) added binary helper: convenient and efficient operations on binary streams.
* [#7](https://github.com/Sage/ez-streams/issues/7) added support for mongo-style filters in reader API.
* [#8](https://github.com/Sage/ez-streams/issues/8) fixed `nodify()` call (was not sending `end` event).
* [#3](https://github.com/Sage/ez-streams/issues/3) fixed galaxy wrapper for `join()` call.
* [#9](https://github.com/Sage/ez-streams/issues/9) fixed multipart transform.

## v0.1.4
2014-09-06
* [#2](https://github.com/Sage/ez-streams/issues/2) [galaxy hooks](https://github.com/Sage/ez-streams#galaxy-support)
* [interoperability with native node.js streams  (reader.nodify, writer.nodify)](https://github.com/Sage/ez-streams#interoperabily-with-native-nodejs-streams)
* [https://github.com/Sage/ez-streams#writer-chaining (writer.pre)](https://github.com/Sage/ez-streams#writer-chaining)
* [reader to enumerate files (devices.file.list)](https://github.com/Sage/ez-streams/blob/master/lib/devices/file.md)

## v0.1.3
2014-03-29
* [mongodb device](https://github.com/Sage/ez-streams/blob/master/lib/devices/mongodb.md)
* [oracle device](https://github.com/Sage/ez-streams/blob/master/lib/devices/oracle.md)
* [mysql device](https://github.com/Sage/ez-streams/blob/master/lib/devices/mysql.md)

## v0.1.2
2014-01-16

## v0.1.1
2014-01-04

## v0.1.0
2013-12-16
First brew
