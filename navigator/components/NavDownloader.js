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

import { NavFile } from "./NavFile.js";

export class NavDownloader {
	/**
	 * 
	 * @param {NavFile} file 
	 */
	constructor(file) {
		this.path = file.path_str();
		this.filename = file.filename;
		this.read_size = file.stat["size"];
	}

	async download() {
		let query = window.btoa(JSON.stringify({
			payload: 'fsread1',
			binary: 'raw',
			path: this.path,
			superuser: false,
			max_read_size: this.read_size,
			external: {
				'content-disposition': 'attachment; filename="' + this.filename + '"',
				'content-type': 'application/x-xz, application/octet-stream'
			},
		}));
		let prefix = (new URL(cockpit.transport.uri('channel/' + cockpit.transport.csrf_token))).pathname;
		var a = document.createElement("a");
		a.href = prefix + "?" + query;
		a.style.display = "none";
		a.download = this.filename;
		document.body.appendChild(a);
		var event = new MouseEvent('click', {
			'view': window,
			'bubbles': false,
			'cancelable': true
		});
		a.dispatchEvent(event);
	}
}
