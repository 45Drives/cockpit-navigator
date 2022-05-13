import { useSpawn, errorString } from '@45drives/cockpit-helpers';

/** Run test with given expression and return boolean result. Throws on abnormal errors.
 * 
 * @param {String} check - Argument(s) to test for checking path (man test(1))
 * @param {String} path - Path to check
 * @param {Object} opts - Options for cockpit.spawn()
 * @returns {Promise<Boolean>} Result of test
 */
export const test = async (check, path, opts = { superuser: 'try' }) => {
	try {
		await useSpawn(['test', ...check.split(/\s+/), path], opts).promise();
		return true;
	} catch (state) {
		if (state.status === 1)
			return false;
		throw new Error("Failed to check path: " + path + ": " + errorString(state));
	}
}

/** Returns true if path exists, false otherwise. Throws on abnormal errors.
 * 
 * @param {String} path - Path to check
 * @param {Object} opts - Options for cockpit.spawn()
 * @returns {Promise<Boolean>} Result of test
 */
export const checkIfExists = (path, opts = { superuser: 'try' }) => {
	return test('-e', path, opts);
}

/**
 * @typedef {Object} PermissionsResult
 * @property {Boolean} r - Read permission result
 * @property {Boolean} w - Write permission result
 * @property {Boolean} x - Execute/search permission result
 */

/** Get read, write, and execute permissions for user on path. Throws on abnormal errors.
 * 
 * @param {String} path - Path to check
 * @param {Object} opts - Options for cockpit.spawn()
 * @returns {Promise<PermissionsResult>} - result of test
 */
export const testPerimssions = async (path, opts = { superuser: 'try' }) => {
	return {
		r: await test('-r', path, opts),
		w: await test('-w', path, opts),
		x: await test('-x', path, opts),
	}
}

/** Check for rw permissions if path is file or rwx permissions if path is dir.
 * Returns false if DNE. Throws on abnormal errors.
 * 
 * @param {String} path - Path to check
 * @param {Boolean} readOnly - Set to true to ignore write permissions
 * @returns {Promise<Boolean>} Result of check
 */
export const checkIfAllowed = async (path, readOnly = false) => {
	if (!await checkIfExists(path))
		return false;
	const permissions = await testPerimssions(path);
	let result = permissions.r;
	if (!readOnly)
		result &= permissions.w;
	if (await test('-d', path))
		result &= permissions.x;
	return result;
}
