var fsp = require('path');
require('streamline-helpers').runTests({
	root: __dirname,
	subdirs: ['common', 'server'],
});