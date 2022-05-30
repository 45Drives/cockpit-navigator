import { useSpawn, errorString } from "@45drives/cockpit-helpers";
import { UNIT_SEPARATOR, RECORD_SEPARATOR } from "../constants";

async function processLinks(linkTargets, host) {
	if (linkTargets.length === 0)
		return;
	(
		await useSpawn(
			// Separate by newline so errors will slot in
			['stat', `--printf=%F${UNIT_SEPARATOR}%f\n`, ...linkTargets.map(target => target.path)],
			{ superuser: 'try', err: 'out', host: host } // stderr >&stdout for maintaining index order
		).promise()
			.catch(state => state) // ignore errors, error message will maintain index order
	).stdout
		.trim()
		.split('\n')
		.filter(record => record)
		.map((record, index) => {
			if (record.includes(UNIT_SEPARATOR)) {
				const [type, mode] = record.split(UNIT_SEPARATOR);
				linkTargets[index].type = type;
				linkTargets[index].mode = mode;
				linkTargets[index].broken = false;
			} else { // error
				linkTargets[index].broken = true;
			}
		});
}

/**
 * Get list of directory entry objects from list of directory entry names
 * 
 * @param {String[]} dirListing - List of entry names
 * @param {String} cwd - Working directory to run stat in
 * @param {String} host - Host to run stat on
 * @param {getDirEntryObjectsFailCallback} failCallback - Callback function for handling errors, receives {String} message
 * @param {ByteFormatter} byteFormatter - Function to format bytes
 * @returns {Promise<DirectoryEntryObj[]>} Array of DirectoryEntryObj objects
 */
async function getDirEntryObjects(dirListing, cwd, host, failCallback, byteFormatter = cockpit.format_bytes) {
	const fields = [
		'%n', // path
		'%f', // mode (raw hex)
		'%A', // modeStr
		'%s', // size
		'%U', // owner
		'%G', // group
		'%W', // ctime
		'%Y', // mtime
		'%X', // atime
		'%F', // type
		'%N', // quoted name with symlink
	]
	const entries = dirListing.length
		? parseRawEntryStats(
			(
				await useSpawn([
					'stat',
					`--printf=${fields.join(UNIT_SEPARATOR)}${RECORD_SEPARATOR}`,
					...dirListing
				], { superuser: 'try', directory: cwd, host }
				)
					.promise()
					.catch(state => state) // ignore errors
			).stdout, cwd, failCallback, byteFormatter)
		: [];
	await processLinks(entries.filter(entry => entry.type === 'symbolic link').map(entry => entry.target));
	return entries;
}

/**
 * Parse raw output of `stat` call from {@link getDirEntryObjects()}
 * 
 * @param {String} raw - Raw output of `stat` call from {@link getDirEntryObjects()}
 * @param {String} cwd - Path to working directory to run stat in
 * @param {getDirEntryObjectsFailCallback} failCallback - Callback function for handling errors, receives {String} message
 * @param {ByteFormatter} byteFormatter - Function to format bytes
 * @returns {DirectoryEntryObj[]}
 */
function parseRawEntryStats(raw, cwd, failCallback, byteFormatter = cockpit.format_bytes) {
	const UNIT_SEPARATOR = '\x1F'; // "Unit Separator"   - ASCII field delimiter
	const RECORD_SEPARATOR = '\x1E'; // "Record Separator" - ASCII record delimiter
	return raw.split(RECORD_SEPARATOR)
		.filter(record => record) // remove empty lines
		.map(record => {
			try {
				let [name, mode, modeStr, size, owner, group, ctime, mtime, atime, type, symlinkStr] = record.split(UNIT_SEPARATOR);
				[size, ctime, mtime, atime] = [size, ctime, mtime, atime].map(num => parseInt(num));
				[ctime, mtime, atime] = [ctime, mtime, atime].map(ts => ts ? new Date(ts * 1000) : null);
				mode = parseInt(mode, 16);
				const entry = {
					name,
					path: `${cwd}/${name}`.replace(/\/+/g, '/'),
					mode,
					modeStr,
					size,
					sizeHuman: byteFormatter(size, 1000).replace(/(?<!B)$/, ' B'),
					owner,
					group,
					ctime,
					mtime,
					atime,
					type,
					target: {},
					selected: false,
				};
				if (type === 'symbolic link') {
					entry.target.rawPath = [
						...symlinkStr.split(/\s*->\s*/)[1].trim().matchAll(/\$?'([^']+)'/g)
					].map(group => JSON.parse(`"${group[1]}"`)).join('');
					entry.target.path = entry.target.rawPath.replace(/^(?!\/)/, `${cwd}/`);
				}
				return entry;
			} catch (error) {
				failCallback(errorString(error) + `\ncaused by: ${record}`);
				return null;
			}
		}).filter(entry => entry !== null)
}

export { parseRawEntryStats };

export default getDirEntryObjects;

/**
* Callback for handling errors during parsing of `dir` output lines
* 
* @callback getDirEntryObjectsFailCallback
* @param {String} message - what went wrong
*/

/**
 * @callback ByteFormatter
 * @param {Number} number - Total number of bytes to format
 * @param {Number=} factor - either 1000 or 1024
 * @param {Object=} options - options
 * @returns {String|String[]}
 */

/**
 * Object representing file system entry
 * 
 * @typedef {Object} DirectoryEntryObj
 * @property {String} name - File/directory name
 * @property {String} path - Full path to entry
 * @property {Number} mode - File mode (number)
 * @property {String} modeStr - Human readable file mode
 * @property {Number} size - File size in bytes
 * @property {String} sizeHuman - Human readable size
 * @property {String} owner - File owner
 * @property {String} group - File group
 * @property {Date} ctime - Creation time
 * @property {Date} mtime - Last Modified time
 * @property {Date} atime - Last Accessed time
 * @property {String} type - Type of inode returned by stat
 * @property {Object} target - Object for symlink target
 * @property {String} target.rawPath - Symlink target path directly grabbed from stat
 * @property {String} target.path - Resolved symlink target path
 * @property {Boolean} selected - Whether or not the user has selected this entry in the browser
 */
