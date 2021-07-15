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
		drop_area.addEventListener("dragenter", this);
		drop_area.addEventListener("dragover", this);
		drop_area.addEventListener("dragleave", this);
		drop_area.addEventListener("drop", this);
		this.drop_area = drop_area;
		this.nav_window_ref = nav_window_ref;
	}

	handleEvent(e) {
		e.preventDefault();
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
				if (e.dataTransfer.items) {
					for (let item of e.dataTransfer.items) {
						if (item.kind === 'file') {
							var file = item.getAsFile();
							if (file.type === "" && file.size !== 0) {
								this.nav_window_ref.modal_prompt.alert(file.name + ": Cannot upload folders.");
								continue;
							}
							if (file.size === 0) {
								var proc = cockpit.spawn(
									["/usr/share/cockpit/navigator/scripts/touch.py3", this.nav_window_ref.pwd().path_str() + "/" + file.name],
									{superuser: "try", err: "out"}
								);
								proc.done(() => {
									this.nav_window_ref.refresh();
								});
								proc.fail((e, data) => {
									this.nav_window_ref.modal_prompt.alert(data);
								});
							} else {
								var uploader = new FileUpload(file, this.nav_window_ref);
								uploader.upload();
							}
						}
					}
				} else {
					for (let file of ev.dataTransfer.files) {
						if (file.type === "")
							continue;
						var uploader = new FileUpload(file, this.nav_window_ref);
						uploader.upload();
					}
				}
				this.drop_area.classList.remove("drag-enter");
				break;
			default:
				this.drop_area.classList.remove("drag-enter");
				break;
		}
		e.stopPropagation();
	}
}
