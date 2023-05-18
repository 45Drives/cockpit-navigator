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

export function streamProcDownload(argv, filename, opts = {}) {
	const query = window.btoa(JSON.stringify({
		payload: 'stream',
		binary: 'raw',
		spawn: [...argv],
		external: {
			'content-disposition': 'attachment; filename="' + encodeURIComponent(filename) + '"',
			'content-type': 'application/x-xz, application/octet-stream'
		},
		...opts,
	}));
	const prefix = (new URL(cockpit.transport.uri('channel/' + cockpit.transport.csrf_token))).pathname;
	const a = document.createElement("a");
	a.href = prefix + "?" + query;
	a.style.display = "none";
	a.download = filename;
	document.body.appendChild(a);
	const event = new MouseEvent('click', {
		'view': window,
		'bubbles': false,
		'cancelable': true
	});
	a.dispatchEvent(event);
	document.body.removeChild(a);
}
