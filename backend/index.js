if (process.env.NODE_ENV === 'development') {
	require('tsx/cjs');
	const { startServer } = require('./src/index.ts');
	startServer();
} else {
	const { startServer } = require('./dist/index.js');
	startServer();
}