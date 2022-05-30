import { parseRawDirListing } from "./getDirListing";

describe('the getDirListing function', () => {
	it('can parse output of dir', () => {
		// `dir --almost-all --dereference-command-line-symlink-to-dir --quoting-style=c -1`
		const input =
			`"test"
"sentence test"
"special\\\\characters\\n\\t"
"😀"
`;
		const expectedOutput = [
			"test",
			"sentence test",
			"special\\characters\n\t",
			"😀"
		]
		const output = parseRawDirListing(input);
		expect(output).toEqual(expectedOutput);
		expect(output[1]).toBe("sentence test");
	});

	it('can parse real output of dir', () => {
		const input = `"{}"
		"\\360\\237\\230\\200"
		"~$lock"
		"0"
		"broken"
		"dir"
		"dst"
		"escape"
		"escape\\ndir"
		"escapendir"
		"hello world"
		"hello\\\\world"
		"iterate_ips"
		"md5"
		"messed"
		"name"
		"pdf_numn"
		"src"
		"systemd"
		"test"
		"test\\nescape\\tname"`;
		const expectedOutput = [
			"{}",
			"😀",
			"~$lock",
			"0",
			"broken",
			"dir",
			"dst",
			"escape",
			"escape\ndir",
			"escapendir",
			"hello world",
			"hello\\world",
			"iterate_ips",
			"md5",
			"messed",
			"name",
			"pdf_numn",
			"src",
			"systemd",
			"test",
			"test\nescape\tname",
		]
		const errorCallback = jest.fn((message) => console.error(message));
		expect(errorCallback.mock.calls.length).toBe(0);
		expect(parseRawDirListing(input, errorCallback)).toEqual(expectedOutput);
	});

	it('can report errors with callback', () => {
		const errorCallback = jest.fn();
		const input = "error: example error";
		parseRawDirListing(input, errorCallback);
		expect(errorCallback.mock.calls.length).toBe(1);
	})
});
