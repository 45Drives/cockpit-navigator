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

import {FileUpload} from "./FileUpload.js";
import {ModalPrompt} from "./ModalPrompt.js";
import {NavWindow} from "./NavWindow.js";
import {check_if_exists} from "../functions.js";

export class NavDragDrop {
	/**
	 * 
	 * @param {HTMLDivElement} drop_area 
	 * @param {NavWindow} nav_window_ref 
	 */
	constructor(drop_area, nav_window_ref) {
		drop_area.addEventListener("dragenter", this, false);
		drop_area.addEventListener("dragover", this, false);
		drop_area.addEventListener("dragleave", this, false);
		drop_area.addEventListener("drop", this, false);
		this.drop_area = drop_area;
		this.nav_window_ref = nav_window_ref;
		this.modal_prompt = new ModalPrompt();
	}

	/**
	 * 
	 * @param {FileSystemEntry} item 
	 * @param {string} path 
	 * @returns {Promise<FileUpload[]>}
	 */
	async scan_files(item, path) {
		let new_uploads = [];
		if (item.isDirectory) {
			if (!path && !await this.modal_prompt.confirm(`Copy whole directory: ${item.fullPath}?`, "", true))
				return new_uploads;
			let directoryReader = item.createReader();
			let promise = new Promise((resolve, reject) => {
				directoryReader.readEntries(async (entries) => {
					for (const entry of entries) {
						new_uploads.push(... await this.scan_files(entry, path + item.name + "/"));
					}
					resolve();
				});
			})
			await promise;
		} else {
			let promise = new Promise((resolve, reject) => {
				item.file((file) => {
					resolve(file);
				})
			});
			new_uploads.push(new FileUpload(await promise, this.nav_window_ref, path));
		}
		return new_uploads;
	}
 
	/**
	 * 
	 * @param {DataTransferItemList} items 
	 * @returns {Promise<DataTransferItemList>}
	 */
	handle_drop_advanced(items) {
		return new Promise(async (resolve, reject) => {
			let uploads = [];
			for (let i = 0; i < items.length; i++) {
				let item = items[i]?.webkitGetAsEntry?.() ?? items[i]?.getAsEntry?.() ?? null;
				let path = "";
				if (item) {
					let new_uploads = await this.scan_files(item, path);
					uploads.push(... new_uploads);
				} else {
					reject();
				}
			}
			resolve(uploads);
		})
	}

	/**
	 * 
	 * @param {FileUpload[]} uploads 
	 * @returns {FileUpload[]}
	 */
	async handle_conflicts(uploads) {
		let keepers = [];
		let requests = {};
		for (let upload of uploads) {
			if (!await check_if_exists(upload.path)) {
				keepers.push(upload.filename);
				continue;
			}
			let request = {};
			request.label = upload.filename;
			request.type = "checkbox";
			let id = upload.filename;
			requests[id] = request;
		}
		if (Object.keys(requests).length > 0) {
			let responses = await this.nav_window_ref.modal_prompt.prompt(
				"Conflicts found while uploading. Replace?",
				requests
			)
			if (responses === null)
				return null;
			for (let key of Object.keys(responses)) {
				if (responses[key])
					keepers.push(key);
			}
		}
		return uploads.filter((upload) => keepers.includes(upload.filename));
	}
	
	/**
	 * 
	 * @param {Event} e 
	 */
	async handleEvent(e) {
		switch(e.type){
			case "dragenter":
				e.preventDefault();
				e.stopPropagation();
				this.drop_area.classList.add("drag-enter");
				break;
			case "dragover":
				e.preventDefault();
				e.stopPropagation();
				break;
			case "dragleave":
				e.preventDefault();
				e.stopPropagation();
				this.drop_area.classList.remove("drag-enter");
				break;
			case "drop":
				this.nav_window_ref.start_load();
				let uploads;
				let items = e.dataTransfer.items;
				e.preventDefault();
				e.stopPropagation();
				try {
					uploads = await this.handle_drop_advanced(items);
				} catch {
					uploads = [];
					for (let file of e.dataTransfer.files) {
						let uploader = new FileUpload(file, this.nav_window_ref);
						uploader.using_webkit = false;
						uploads.push(uploader);
					}
				}
				this.drop_area.classList.remove("drag-enter");
				if (uploads.length === 0)
					break;
				uploads = await this.handle_conflicts(uploads);
				this.nav_window_ref.stop_load();
				uploads.forEach((upload) => {upload.upload()});
				break;
			default:
				this.drop_area.classList.remove("drag-enter");
				break;
		}
	}
}
