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

import { queueUpload } from "./FileUpload.js";
import { ModalPrompt } from "./ModalPrompt.js";
import { NavWindow } from "./NavWindow.js";

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
		this.upload_element = document.createElement('input');
		this.upload_element.type = 'file';
		this.upload_element.multiple = true;
		this.upload_element.onchange = async e => {
			const pwd = nav_window_ref.pwd().path_str();
			let uploads = [];
			for (const file of e.target.files) {
				uploads.push([file, pwd + `/${file.name}`]);
			}
			if (uploads.length) {
				uploads = await this.handle_conflicts(uploads);
				Promise.allSettled(uploads.map((upload) => queueUpload(...upload))).finally(() => this.nav_window_ref.refresh());
			}
		};
		document.getElementById("nav-upload-btn").addEventListener("click", () => this.upload_dialog());
	}

	/**
	 * 
	 * @param {[File, string][]} uploads 
	 * @returns {Promise<[File, string][]>}
	 */
	async handle_conflicts(uploads) {
		const test_paths = uploads.map(([_, path]) => path);
		const proc = cockpit.script(`
		while IFS= read -r p; do
			if [ -e "$p" -o -h "$p" ]; then
				echo "$p"
			fi
		done`, [], { error: "message", superuser: "try" });
		proc.input(test_paths.join("\n") + '\n');
		const existing_paths = (await proc).trim().split("\n").filter(p => p);

		if (existing_paths.length) {
			const choice = Object.entries((await this.nav_window_ref.modal_prompt.prompt(
				"Conflicts found while uploading:",
				{
					"skip": { label: "Skip existing", default: true, radio_group: "conflicts-choice", type: "radio" },
					"overwrite": { label: "Overwrite existing", radio_group: "conflicts-choice", type: "radio" },
					"choose-skip": { label: "Choose which files to overwrite (default skip)", radio_group: "conflicts-choice", type: "radio" },
					"choose-overwrite": { label: "Choose which files to overwrite (default overwrite)", radio_group: "conflicts-choice", type: "radio" },
				}
			)) ?? {}).filter(([_, value]) => value)?.[0]?.[0];
			let default_choice = false;
			switch (choice) {
				case "skip":
					return uploads.filter(([_, p]) => !existing_paths.includes(p));
				case "overwrite":
					return uploads;
				case "choose-overwrite":
					default_choice = true;
				case "choose-skip":
					const requests = {};
					for (const path of existing_paths) {
						requests[path] = {
							label: path,
							type: "checkbox",
							default: default_choice,
						};
					}
					const responses = await this.nav_window_ref.modal_prompt.prompt(
						"Choose which files to overwrite:",
						requests
					);
					if (responses === null) {
						return [];
					}
					return uploads.filter(([_, path]) =>
						[undefined, true].includes(responses[path]));
				default:
					return [];
			}
		}
		return uploads;
	}

	/**
	 * 
	 * @param {Event} e 
	 */
	async handleEvent(e) {
		switch (e.type) {
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
				e.preventDefault();
				e.stopPropagation();

				/**
				 * 
				 * @param {FileSystemDirectoryEntry} dir 
				 * @param {string} pwd
				 */
				const recurse_dir = async (dir, pwd) => {
					/** 
					 * @type {[File, string][]}
					 */
					const uploads = [];
					const reader = dir.createReader();
					/**
					 * @type {FileSystemEntriesCallback extends ((args: infer U[]) => any) ? U : never}
					 */
					const entries = await new Promise((resolve, reject) =>
						reader.readEntries(resolve, reject));
					for (const entry of entries) {
						const remote_path = pwd + `/${entry.name}`;
						if (entry.isDirectory) {
							uploads.push(...(await recurse_dir(entry, remote_path)));
						} else {
							uploads.push([await new Promise((resolve, reject) => entry.file(resolve, reject)), remote_path]);
						}
					}

					return uploads;
				};

				/**
				 * @type {DataTransferItemList}
				 */
				const items = e.dataTransfer.items;
				/** 
				 * @type {[File, string][]}
				 */
				let uploads = [];
				const pwd = this.nav_window_ref.pwd().path_str();

				for (const item of items) {
					const entry = item.webkitGetAsEntry();
					if (entry?.isDirectory) {
						uploads.push(...(await recurse_dir(entry, pwd + `/${entry.name}`)));
					} else {
						const file = item.getAsFile();
						if (file) {
							uploads.push([file, pwd + `/${file.name}`]);
						}
					}
				}
				this.drop_area.classList.remove("drag-enter");
				if (uploads.length === 0) {
					this.nav_window_ref.stop_load();
					break;
				}
				uploads = await this.handle_conflicts(uploads);
				this.nav_window_ref.stop_load();
				Promise.allSettled(uploads.map((upload) => queueUpload(...upload))).finally(() => this.nav_window_ref.refresh());
				break;
			default:
				this.drop_area.classList.remove("drag-enter");
				break;
		}
	}

	upload_dialog() {
		this.upload_element.showPicker();
	}
}
