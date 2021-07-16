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
import {NavWindow} from "./NavWindow.js";

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
	}
	
	async handleEvent(e) {
		e.preventDefault();
		e.stopPropagation();
		switch(e.type){
			case "dragenter":
				this.drop_area.classList.add("drag-enter");
				break;
			case "dragover":
				break;
			case "dragleave":
				this.drop_area.classList.remove("drag-enter");
				break;
			case "drop":
				let uploads = [];
				// console.log(e);
				// console.log(e.dataTransfer.files);
				// if (e.dataTransfer.items) {
				// 	for (let item of e.dataTransfer.items) {
				// 		if (item.kind === 'file') {
				// 			var file = item.getAsFile();
				// 			if (file.type === "" && file.size !== 0) {
				// 				await this.nav_window_ref.modal_prompt.alert(file.name + ": Cannot upload folders.");
				// 				continue;
				// 			}
				// 			if (file.size === 0) {
				// 				var proc = cockpit.spawn(
				// 					["/usr/share/cockpit/navigator/scripts/touch.py3", this.nav_window_ref.pwd().path_str() + "/" + file.name],
				// 					{superuser: "try", err: "out"}
				// 				);
				// 				proc.done(() => {
				// 					this.nav_window_ref.refresh();
				// 				});
				// 			} else {
				// 				uploads.push(new FileUpload(file, this.nav_window_ref));
				// 			}
				// 		}
				// 	}
				// } else {
					for (let file of e.dataTransfer.files) {
						console.log(file);
						// if (file.type === "")
						// 	continue;
						uploads.push(new FileUpload(file, this.nav_window_ref));
					}
				// }
				this.drop_area.classList.remove("drag-enter");
				if (uploads.length === 0)
					break;
				let keepers = [];
				let requests = {};
				for (let upload of uploads) {
					if (!await upload.check_if_exists()) {
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
						break;
					for (let key of Object.keys(responses)) {
						if (responses[key])
							keepers.push(key);
					}
				}
				uploads = uploads.filter((upload) => {return keepers.includes(upload.filename)});
				uploads.forEach((upload) => {upload.upload()});
				break;
			default:
				this.drop_area.classList.remove("drag-enter");
				break;
		}
	}
}
