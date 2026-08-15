import { randomUUID } from 'node:crypto';
import path from 'node:path';

const reportDirectory = process.env.REACT_PORT_TEST_REPORT_DIR;
const entryPoint = process.argv[1] ?? '';
const entryName = path.basename(entryPoint);

if (
	reportDirectory &&
	/^(?:vitest|cli)(?:\.m?js)?$/i.test(entryName) &&
	/vitest/i.test(entryPoint)
) {
	process.argv.push(
		'--reporter=json',
		`--outputFile=${path.join(reportDirectory, `vitest-${process.pid}-${randomUUID()}.json`)}`,
	);
} else if (reportDirectory && /^jest(?:\.m?js)?$/i.test(entryName)) {
	process.argv.push(
		'--json',
		`--outputFile=${path.join(reportDirectory, `jest-${process.pid}-${randomUUID()}.json`)}`,
	);
}
