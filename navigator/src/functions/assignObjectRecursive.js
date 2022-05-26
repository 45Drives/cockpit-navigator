const isObject = (obj) => typeof obj === 'object' && !Array.isArray(obj) && obj !== null;

/**
 * Assign target to source with Object.assign(), filling in any missing properties from defaults
 * 
 * @param {Object} target - target object
 * @param {Object} source - source object
 * @param {Object} defaults - fallback values if source is missing any properties
 * @returns {Object} - the target object
 */
function assignObjectRecursive(target, source, defaults = {}) {
	Object.assign(target, defaults, source);
	for (const key in defaults) {
		if (isObject(defaults[key]) && isObject(source[key])) {
			target[key] = {};
			assignObjectRecursive(target[key], source[key], defaults[key]);
		}
	}
	return target;
}

export default assignObjectRecursive;
