function legacyJestAliases({ types }) {
	return {
		visitor: {
			MemberExpression(path) {
				if (
					types.isIdentifier(path.node.object, { name: 'jest' }) &&
					types.isIdentifier(path.node.property, { name: 'resetModuleRegistry' })
				) {
					path.node.property = types.identifier('resetModules');
				}
			},
		},
	};
}

module.exports = {
	rootDir: '../upstream',
	roots: ['<rootDir>/test'],
	testRegex: '-test\\.js$',
	testEnvironment: 'jsdom',
	setupFiles: ['<rootDir>/test/setup.js'],
	setupFilesAfterEnv: ['<rootDir>/test/setupAfterEnv.js'],
	moduleNameMapper: {
		'^@testing-library/react$': require.resolve('@testing-library/react/pure'),
	},
	transform: {
		'^.+\\.js$': [
			'babel-jest',
			{
				presets: [
					[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }],
					[require.resolve('@babel/preset-react'), { runtime: 'classic' }],
				],
				plugins: [legacyJestAliases, require.resolve('babel-plugin-add-module-exports')],
			},
		],
	},
};
