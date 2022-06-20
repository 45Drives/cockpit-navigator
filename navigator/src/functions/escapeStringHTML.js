/*
 * Copyright (C) 2022 Josh Boudreau <jboudreau@45drives.com>
 * 
 * This file is part of Cockpit Navigator.
 * 
 * Cockpit Navigator is free software: you can redistribute it and/or modify it under the terms
 * of the GNU General Public License as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 * 
 * Cockpit Navigator is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with Cockpit Navigator.
 * If not, see <https://www.gnu.org/licenses/>.
 */

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
