import { useSpawn, errorString } from "@45drives/cockpit-helpers";
import { UNIT_SEPARATOR, RECORD_SEPARATOR } from "../constants";
import { szudzikPair } from "./szudzikPair";
import { escapeStringHTML } from "./escapeStringHTML";

/**
 * Get list of directory entry objects from list of directory entry names
 * 
 * find -H path -maxdepth 1 -mindepth 1 -printf '%D:%i%f:%m:%M:%s:%u:%g:%B@:%T@:%A@:%y:%Y:%l\n'
 * 
 * @param {String} cwd - Working directory to run find in
 * @param {String} host - Host to run find on
 * @param {getDirEntryObjectsFailCallback} failCallback - Callback function for handling errors, receives {String} message
 * @param {ByteFormatter} byteFormatter - Function to format bytes
 * @returns {Promise<DirectoryEntryObj[]>} Array of DirectoryEntryObj objects
 */
async function getDirEntryObjects(cwd, host, extraFindArgs = [], failCallback = console.error, byteFormatter = cockpit.format_bytes) {
	const fields = [
		'%D', // dev id
		'%i', // inode
		'%f', // name
		'%p', // full path
		'%m', // mode (octal)
		'%M', // modeStr
		'%s', // size
		'%u', // owner
		'%g', // group
		'%B@', // ctime
		'%T@', // mtime
		'%A@', // atime
		'%y', // type
		'%Y', // symlink target type or type if not symlink
		'%l', // symlink target name or '' if not symlink
	]
	return parseRawEntryStats(
		await getDirEntryStats(cwd, host, fields, extraFindArgs, false, failCallback),
		cwd,
		host,
		failCallback,
		byteFormatter
	)
}

/**
 * 
 * @param {String} cwd - Starting point for find
 * @param {String} host - Host to run find on
 * @param {String[]} outputFormat - -printf format fields array (man find(1))
 * @param {String[]} extraFindArguments - extra tests and actions to run on files
 * @param {Boolean} recursive - if false, -maxdepth is 1
 * @returns {Promise<String[][]>} Array of resultant output
 */
async function getDirEntryStats(cwd, host, outputFormat, extraFindArguments = [], recursive = false, failCallback = null) {
	const UNIT_SEPARATOR_ESC = `\\${UNIT_SEPARATOR.charCodeAt(0).toString(8).padStart(3, '0')}`;
	const RECORD_SEPARATOR_ESC = `\\${RECORD_SEPARATOR.charCodeAt(0).toString(8).padStart(3, '0')}`;
	const argv = [
		'find',
		'-H',
		cwd,
		'-mindepth',
		'1',
	];
	if (!recursive)
		argv.push('-maxdepth', '1');
	argv.push(...extraFindArguments);
	if (outputFormat.length)
		argv.push('-printf', `${outputFormat.join(UNIT_SEPARATOR_ESC)}${RECORD_SEPARATOR_ESC}`);
	// console.time('getDirEntryStats-useSpawn-' + cwd);
	return new TextDecoder().decode(
		( // make sure any possible nul bytes don't break cockpit's protocol by using binary
			await useSpawn(
				argv,
				{ superuser: 'try', host, binary: true }
			).promise()
				// .then(state => {console.timeEnd('getDirEntryStats-useSpawn-' + cwd); return state})
				.catch(state => {
					if (failCallback) {
						failCallback(state.stderr);
						return state;
					} else throw state;
				})
		).stdout
	).split(RECORD_SEPARATOR)
		.slice(0, -1) // remove last empty array element from split since all entries end with RECORD_SEPARATOR
		.map(record => record.split(UNIT_SEPARATOR));
}

/**
 * Parse raw output of `find` call from {@link getDirEntryObjects()}
 * 
 * @param {String[][]} records - Raw output of `find` call from {@link getDirEntryObjects()}
 * @param {String} cwd - Path to working directory that find was ran in
 * @param {String} host - Host that find was ran on
 * @param {getDirEntryObjectsFailCallback} failCallback - Callback function for handling errors, receives {String} message
 * @param {ByteFormatter} byteFormatter - Function to format bytes
 * @returns {DirectoryEntryObj[]}
 */
function parseRawEntryStats(records, cwd, host, failCallback, byteFormatter = cockpit.format_bytes) {
	return records.map(fields => {
		try {
			let [devId, inode, name, path, mode, modeStr, size, owner, group, ctime, mtime, atime, type, symlinkTargetType, symlinkTargetName] = fields;
			[size, ctime, mtime, atime] = [size, ctime, mtime, atime].map(num => parseInt(num));
			[devId, inode] = [devId, inode].map(num => BigInt(num));
			[ctime, mtime, atime] = [ctime, mtime, atime].map(ts => (ts && ts > 0) ? new Date(ts * 1000) : null);
			let [ctimeStr, mtimeStr, atimeStr] = [ctime, mtime, atime].map(date => date?.toLocaleString() ?? '-');
			let [nameHTML, symlinkTargetNameHTML] = [name, symlinkTargetName].map(escapeStringHTML);
			mode = parseInt(mode, 8);
			return {
				uniqueId: szudzikPair(host, devId, inode),
				devId,
				inode,
				name,
				nameHTML,
				path,
				mode,
				modeStr,
				size,
				sizeHuman: byteFormatter(size, 1000).replace(/(?<!B)$/, ' B'),
				owner,
				group,
				ctime,
				mtime,
				atime,
				ctimeStr,
				mtimeStr,
				atimeStr,
				type,
				target: {
					type: symlinkTargetType,
					rawPath: symlinkTargetName,
					rawPathHTML: symlinkTargetNameHTML,
					path: type === 'l' ? symlinkTargetName.replace(/^(?!\/)/, `${cwd}/`) : '',
					broken: ['L', 'N', '?'].includes(symlinkTargetType), // L: loop N: nonexistent ?: error
				},
				selected: false,
				host,
				cut: false,
			};
		} catch (error) {
			failCallback(errorString(error) + `\ncaused by: ${fields.toString()}`);
			return null;
		}
	}).filter(entry => entry !== null)
}

export { getDirEntryObjects, getDirEntryStats, parseRawEntryStats };

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
 * @property {BigInt} uniqueId - Unique ID generated from pairing function on [devId, inode]
 * @property {BigInt} devId - Device ID containing the file
 * @property {BigInt} inode - The file's inode
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
 * @property {String} ctimeStr - Creation time string
 * @property {String} mtimeStr - Last Modified time string
 * @property {String} atimeStr - Last Accessed time string
 * @property {String} type - Type of inode returned by find
 * @property {Object} target - Object for symlink target
 * @property {String} target.rawPath - Symlink target path directly grabbed from find
 * @property {String} target.path - Resolved symlink target path
 * @property {Boolean} target.broken - Whether or not the link is broken
 * @property {Boolean} selected - Whether or not the user has selected this entry in the browser
 * @property {String} host - host that owns entry
 * @property {Boolean} cut - whether or not the file is going to be cut
 */
