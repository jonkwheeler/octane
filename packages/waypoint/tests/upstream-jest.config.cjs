/** @type {import('jest').Config} */
module.exports = {
	testEnvironment: 'node',
	testMatch: ['**/test/node/**/*.test.js', '**/test/node/**/*.test.jsx'],
	transform: {
		'^.+\\.[jt]sx?$': [
			'@swc/jest',
			{
				jsc: {
					parser: {
						syntax: 'ecmascript',
						jsx: true,
					},
					transform: {
						react: {
							runtime: 'classic',
						},
					},
				},
			},
		],
	},
};
