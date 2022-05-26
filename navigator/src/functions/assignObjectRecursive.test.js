import assignObjectRecursive from "./assignObjectRecursive";

const source = {
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
		obj1: {
			str1: 'value1',
			str2: 'value2',
			num1: 1,
			num2: 2,
			bool1: true,
			bool2: false,
		}
	}
};

describe('The assignObjectRecursive function', () => {
	it('can assign a source object to a target object', () => {
		const target = {};
		assignObjectRecursive(target, source);
		expect(target).toEqual(source);
	});

	it('won\'t overwrite source props with defaults', () => {
		const defaults = {
			str1: 'value3',
			str2: 'value4',
			num1: 3,
			num2: 4,
			bool1: false,
			bool2: true,
			obj1: {
				str1: 'value3',
				str2: 'value4',
				num1: 3,
				num2: 4,
				bool1: false,
				bool2: true,
				obj1: {
					str1: 'value3',
					str2: 'value4',
					num1: 3,
					num2: 4,
					bool1: false,
					bool2: true,
				}
			}
		};
		const target = {};
		assignObjectRecursive(target, source, defaults);
		expect(target).toEqual(source);
	});

	it('can fill in missing defaults', () => {
		const defaults = {
			newStr: "test",
			newNum: 5,
			newBool: true,
			obj1: {
				newStr: "test",
				newNum: 5,
				newBool: true,
				obj1: {
					newStr: "test",
					newNum: 5,
					newBool: true,
				}
			}
		}
		const target = {};
		assignObjectRecursive(target, source, defaults);
		expect(target).toEqual({
			...defaults,
			...source,
			obj1: {
				...defaults.obj1,
				...source.obj1,
				obj1: {
					...defaults.obj1.obj1,
					...source.obj1.obj1
				}
			}
		}
		);
	});

	it('can add deeply nested defaults', () => {
		const defaults = {
			lvl1: {
				lvl2: {
					lvl3: {
						lvl4: {
							key: 'value',
						}
					}
				}
			}
		}
		const target = {};
		assignObjectRecursive(target, source, defaults);
		expect(target).toEqual({ ...source, ...defaults });
		expect(target.lvl1.lvl2.lvl3.lvl4.key).toBe(defaults.lvl1.lvl2.lvl3.lvl4.key);
	});

});
