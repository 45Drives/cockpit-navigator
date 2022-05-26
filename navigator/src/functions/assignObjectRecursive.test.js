import assignObjectRecursive from "./assignObjectRecursive";

const defaultSource = {
	str1: 'value1',
	str2: 'value2',
	num1: 1,
	num2: 2,
	bool1: true,
	bool2: false,
	obj1: {
		str1: 'value1',
		str2: 'value2',
		num1: 1,
		num2: 2,
		bool1: true,
		bool2: false,
	}
};

test('basic assignment with no defaults', () => {
	const settings = {};
	assignObjectRecursive(settings, defaultSource);
	expect(settings).toEqual(defaultSource);
});

test('ensure defaults do not overwrite source', () => {
	const source = {
		key1: 'value1',
		key2: 'value2',
		obj1: {
			key1: 'value1',
			key2: 'value2',
		}
	};
});
