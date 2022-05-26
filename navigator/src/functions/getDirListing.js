import { useSpawn, errorString } from "@45drives/cockpit-helpers";

/**
 * Callback for handling errors during parsing of `dir` output lines
 * 
 * @callback getDirListingFailCallback
 * @param {String} message - what went wrong
 */

/**
 * Get list of directory entry names for given path
 * 
 * @param {String} path - Directory path to list
 * @param {getDirListingFailCallback} failCallback - Callback function for handling errors, receives {String} message
 * @returns {Promise<String[]>}
 */
export default async function getDirListing(path, failCallback) {
	return parseRawDirListing(
		(
			await useSpawn([
				'dir',
				'--almost-all',
				'--dereference-command-line-symlink-to-dir',
				'--quoting-style=c',
				'-1',
				path
			], { superuser: 'try' }).promise()
		).stdout,
		failCallback
	);
}

/**
 * Parse raw output of `dir` call from {@link getDirListing()}
 * 
 * @param {String} raw - Raw output of `dir` from {@link getDirListing()}
 * @param {getDirListingFailCallback} failCallback - Callback function for handling errors, receives {String} message
 * @returns {String[]}
 */
function parseRawDirListing(raw, failCallback) {
	return raw.split('\n')
		.filter(name => name)
		.map(escaped => {
			try {
				return JSON.parse(escaped);
			} catch (error) {
				failCallback(`${errorString(error)}\ncaused by ${escaped}`);
				return null;
			}
		})
		.filter(entry => entry !== null);
}
