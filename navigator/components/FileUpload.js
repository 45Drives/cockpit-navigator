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

import {NavWindow} from "./NavWindow.js";
import {format_time_remaining} from "../functions.js";

export class FileUpload {
	/**
	 * 
	 * @param {File|Blob} file 
	 * @param {NavWindow} nav_window_ref
	 */
	constructor(file, nav_window_ref) {
		try {
			this.chunk_size = (parseInt(cockpit.info.version) > 238)? 1048576 : 65536;
		} catch(e) {
			console.log(e);
			this.chunk_size = 65536;
		}
		this.filename = file.name;
		this.nav_window_ref = nav_window_ref;
		this.path = nav_window_ref.pwd().path_str() + "/" + file.name;
		this.reader = new FileReader();
		this.chunks = this.slice_file(file);
		this.chunk_index = 0;
		this.timestamp = Date.now();
	}

	check_if_exists() {
		return new Promise((resolve, reject) => {
			var proc = cockpit.spawn(["/usr/share/cockpit/navigator/scripts/fail-if-exists.py3", this.path], {superuser: "try"});
			proc.done((data) => {resolve(false)});
			proc.fail((e, data) => {resolve(true)});
		});
	}

	make_html_element() {
		var notification = document.createElement("div");
		notification.classList.add("nav-notification");

		var header = document.createElement("div");
		header.classList.add("nav-notification-header");
		notification.appendChild(header);
		header.innerText = "Uploading " + this.filename;

		var info = document.createElement("div");
		info.classList.add("flex-row", "space-between");
		notification.appendChild(info);

		var rate = document.createElement("div");
		rate.classList.add("monospace-sm");
		info.appendChild(rate);
		rate.innerText = "-";
		this.rate = rate;

		var eta = document.createElement("div");
		eta.classList.add("monospace-sm");
		info.appendChild(eta);
		eta.innerText = "-";
		this.eta = eta;

		var progress = document.createElement("progress");
		progress.max = this.num_chunks;
		notification.appendChild(progress);
		this.progress = progress;

		this.html_elements = [progress, eta, rate, info, header, notification];
		document.getElementById("nav-notifications").appendChild(notification);
	}

	remove_html_element() {
		for (let elem of this.html_elements) {
			if (elem.parentElement)
				elem.parentElement.removeChild(elem);
		}
	}

	/**
	 * 
	 * @param {File|Blob} file 
	 * @returns {Array}
	 */
	slice_file(file) {
		var offset = 0;
		var next_offset;
		var chunks = [];
		this.num_chunks = Math.ceil(file.size / this.chunk_size);
		for (let i = 0; i < this.num_chunks; i++) {
			next_offset = Math.min(this.chunk_size * (i + 1), file.size);
			chunks.push(file.slice(offset, next_offset));
			offset = next_offset;
		}
		return chunks;
	}

	async upload() {
		if (await this.check_if_exists()) {
			if (!await this.nav_window_ref.modal_prompt.confirm(this.filename + ": File exists. Replace?", "", true))
				return;
		}
		this.make_html_element();
		this.proc = cockpit.spawn(["/usr/share/cockpit/navigator/scripts/write-chunks.py3", this.path], {err: "out", superuser: "try"});
		this.proc.fail((e, data) => {
			this.reader.onload = () => {}
			this.done();
			this.nav_window_ref.modal_prompt.alert(data);
		})
		this.proc.done((data) => {
			this.nav_window_ref.refresh();
		})
		this.reader.onload = (function(uploader_ref) {
			return async function(evt) {
				uploader_ref.write_to_file(evt, uploader_ref.chunk_index * uploader_ref.chunk_size);
				uploader_ref.chunk_index++;
				uploader_ref.progress.value = uploader_ref.chunk_index;
				if (uploader_ref.chunk_index < uploader_ref.num_chunks)
					uploader_ref.reader.readAsArrayBuffer(uploader_ref.chunks[uploader_ref.chunk_index]);
				else {
					uploader_ref.done();
				}
			};
		})(this);
		this.reader.readAsArrayBuffer(this.chunks[0]);
	}

	arrayBufferToBase64(buffer) {
		let binary = '';
		let bytes = new Uint8Array(buffer);
		let len = bytes.byteLength;
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return window.btoa(binary);
	}

	/**
	 * 
	 * @param {Event} evt 
	 */
	write_to_file(evt) {
		var chunk_b64 = this.arrayBufferToBase64(evt.target.result);
		const seek = this.chunk_index * this.chunk_size;
		var obj = {
			seek: seek,
			chunk: chunk_b64
		};
		this.proc.input(JSON.stringify(obj) + "\n", true);
		this.update_xfr_rate();
	}

	done() {
		this.proc.input(); // close stdin
		this.remove_html_element();
	}

	update_xfr_rate() {
		var now = Date.now();
		var elapsed = (now - this.timestamp) / 1000;
		this.timestamp = now;
		var rate = this.chunk_size / elapsed;
		this.rate.innerText = cockpit.format_bytes_per_sec(rate);
		// keep exponential moving average of chunk time for eta
		this.chunk_time = (this.chunk_time)
			? (0.125 * elapsed + (0.875 * this.chunk_time))
			: elapsed;
		var eta = (this.num_chunks - this.chunk_index) * this.chunk_time;
		this.eta.innerText = format_time_remaining(eta);
	}
}
