/**
 * Get greatest common denomincator path of an array of input paths
 * @param {string[]} paths - Full paths from which to get common denominator
 * @returns {CommonPathObj}
 */
export function commonPath(paths) {
	const pathArrs = paths.map(str => str.split('/'));
	let commonArr = [...pathArrs[0]];
	for (let i = 0; i < pathArrs.length; i++) {
		const iDiffer = pathArrs[i].findIndex((segment, index) => segment !== commonArr[index]);
		if (iDiffer !== -1)
			commonArr = commonArr.slice(0, iDiffer);
		if (commonArr.length <= 1)
			break;
	}
	const common = commonArr.join('/').replace(/^(?!\/)/, '/');
	const relativePaths = pathArrs.map(fullArr => fullArr.slice(commonArr.length).join('/') || '.');
	return { common, relativePaths };
}

/**
 * @typedef {Object} CommonPathObj
 * @property {string} common - The common denominator of all paths provided
 * @property {string[]} relativePaths - the input paths made relative to the common path
 */
