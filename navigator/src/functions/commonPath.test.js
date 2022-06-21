import { commonPath } from "./commonPath";

describe('The commonPath function', () => {
	const filesInTmpTest = [
		'/tmp/test/file1',
		'/tmp/test/file2',
		'/tmp/test/subdir/file3',
	];
	const filesInTmpHello = [
		'/tmp/hello/file1',
		'/tmp/hello/file2',
		'/tmp/hello/subdir/file3',
	];
	const filesInTmp = [
		...filesInTmpTest,
		...filesInTmpHello,
	];
	const filesInHome = [
		'/home/jboudreau/test1',
		'/home/jboudreau/test2',
		'/home/jboudreau/test3',
		'/home/jboudreau/test/1/2/3/4',
		'/home/mhooper/1/2/3/4',
	]
	const allFiles = [
		...filesInTmp,
		...filesInHome,
		'/file',
		'/',
	]
	it('can get the expected common denominator path from a list of inputs', () => {
		expect(commonPath(filesInTmpTest).common).toEqual('/tmp/test');
		expect(commonPath(filesInTmpHello).common).toEqual('/tmp/hello');
		expect(commonPath(filesInTmp).common).toEqual('/tmp');
		expect(commonPath(filesInHome).common).toEqual('/home');
		expect(commonPath(allFiles).common).toEqual('/');
	});

	it('can properly generate relative paths s.t. common + / + relativePath === path', () => {
		const testPaths = (paths) => {
			const { common, relativePaths } = commonPath(paths);
			for (let i = 0; i < relativePaths.length; i++) {
				expect(relativePaths[i][0]).not.toEqual('/');
				expect(relativePaths[i].length).toBeGreaterThanOrEqual(1);
				expect(`${common}/${relativePaths[i]}`.replace(/\/+/g, '/').replace(/(?<=\/)\.$/, '')).toEqual(paths[i]);
			}
		}
		testPaths(filesInTmpTest);
		testPaths(filesInTmpHello);
		testPaths(filesInTmp);
		testPaths(filesInHome);
		testPaths(allFiles);
	});
})
