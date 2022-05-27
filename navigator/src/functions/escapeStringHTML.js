/**
 * Replaces all non-printable characters with an orange span containing the escaped representation of the character
 * 
 * @param {String} string - String to escape
 * @returns {String}
 */
const escapeStringHTML = (string) => replaceNonPrinting(string, c => wrapSpan(escapeCallback(c)));

/**
 * Replaces all non-printable characters with the escaped representation of the character
 * 
 * @param {String} string - String to escape
 * @returns {String}
 */
const escapeString = (string) => replaceNonPrinting(string, escapeCallback);

const replaceNonPrinting = (string, callback) => string.replace(/[\t\n\r]/gi, callback);

const escapeCallback = c => JSON.stringify(c).replace(/^['"]|['"]$/g, '')

const wrapSpan = c => `<span class="text-orange-500">${c}</span>`

export {
	escapeString,
	escapeStringHTML,
};
