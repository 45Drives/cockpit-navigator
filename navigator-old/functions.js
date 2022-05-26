/* 
	Cockpit Navigator - A File System Browser for Cockpit.
	Copyright (C) 2021 Josh Boudreau      <jboudreau@45drives.com>
	Copyright (C) 2021 Sam Silver         <ssilver@45drives.com>
	Copyright (C) 2021 Dawson Della Valle <ddellavalle@45drives.com>

	This file is part of Cockpit Navigator.
	Cockpit Navigator is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	Cockpit Navigator is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	You should have received a copy of the GNU General Public License
	along with Cockpit Navigator.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * 
 * @param {string} key 
 * @param {string} value 
 * @returns {string}
 */
 export function property_entry_html(key, value) {
	var html = '<div class="nav-property-pair">';
	html += '<span class="nav-property-pair-key">' + key + '</span>';
	html += '<span class="nav-property-pair-value">' + value + '</span>';
	html += '</div>';
	return html;
}

/**
 * 
 * @param {number} bytes 
 * @returns {string}
 */
export function format_bytes(bytes) {
	if (bytes === 0)
		return "0 B";
	var units = [" B", " KiB", " MiB", " GiB", " TiB", " PiB"];
	var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	var pow = Math.pow(1024, index);
	var formatted = bytes / pow;
	return formatted.toFixed(2).toString() + units[index];
}

/**
 * 
 * @param {number} timestamp 
 * @returns {string}
 */
export function format_time(timestamp) {
	var date = new Date(timestamp * 1000);
	return date.toLocaleString();
}

/**
 * 
 * @param {number} seconds 
 * @returns {string}
 */
export function format_time_remaining(seconds_) {
	var hours = Math.floor(seconds_ / 3600);
	var seconds = seconds_ % 3600;
	var minutes = Math.floor(seconds / 60);
	seconds = Math.floor(seconds % 60);
	var out = "";
	if (hours) {
		out = String(hours).padStart(2, '0') + ":";
	}
	out += String(minutes).padStart(2, '0') + ":";
	out += String(seconds).padStart(2, '0');
	return out;
}

/**
 * 
 * @param {number} mode 
 * @returns {string}
 */
export function format_permissions(mode) {
	var bit_list = ["x", "w", "r"];
	var result = "";
	for (let bit = 8; bit >= 0; bit--) {
		var test_bit = 1 << bit;
		var test_result = mode & test_bit;
		if (test_result != 0) {
			result += bit_list[bit % bit_list.length];
		} else {
			result += "-";
		}
	}
	return result;
}

/**
 * 
 * @param {string} path 
 * @returns {Promise<boolean>}
 */
export function check_if_exists(path) {
	return new Promise((resolve, reject) => {
		var proc = cockpit.spawn(["/usr/share/cockpit/navigator/scripts/fail-if-exists.py3", path], {superuser: "try"});
		proc.done((data) => {resolve(false)});
		proc.fail((e, data) => {resolve(true)});
	});
}

/**
 * Spawn process and resolve/reject with output
 * 
 * @param {string[]} argv argv of proc
 * @param {string | null} input optional input to stdin of proc
 * @returns {Promise<string>}
 */
export function simple_spawn(argv, input = null) {
	return new Promise((resolve, reject) => {
		var proc = cockpit.spawn(argv, {superuser: "try"});
		proc.done(data => resolve(data));
		proc.fail((e, data) => {
			if (data)
				reject(data);
			else
				reject("Execution error: " + e);
		});
		if (input != null)
			proc.input(input);
	});
}
