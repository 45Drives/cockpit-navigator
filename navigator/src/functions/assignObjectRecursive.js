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
