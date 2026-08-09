(function bootJasmine(global) {
	const jasmineRequire = global.jasmineRequire;
	const jasmine = jasmineRequire.core(jasmineRequire);
	const env = jasmine.getEnv({ suppressLoadErrors: true });
	const jasmineInterface = jasmineRequire.interface(jasmine, env);
	for (const key of Object.keys(jasmineInterface)) {
		global[key] = jasmineInterface[key];
	}
	global.jasmine = jasmine;
	global.__waypointJasmineEnv = env;
})(window);
