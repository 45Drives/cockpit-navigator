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

import { NavEntry } from "./NavEntry.js";
import { NavDownloader } from "./NavDownloader.js";
import { NavWindow } from "./NavWindow.js";
import { property_entry_html, simple_spawn } from "../functions.js";

export class NavFile extends NavEntry {
	/**
	 * 
	 * @param {string|string[]} path 
	 * @param {object} stat 
	 * @param {NavWindow} nav_window_ref 
	 */
	constructor(path, stat, nav_window_ref) {
		super(path, stat, nav_window_ref);
		this.nav_type = "file";
		this.dom_element.nav_item_icon.classList.add("fas", "fa-file");
		this.double_click = false;
	}

	/**
	 * 
	 * @param {Event} e 
	 */
	handleEvent(e) {
		switch (e.type) {
			case "click":
				if (this.double_click) {
					if (this.timeout)
						clearTimeout(this.timeout);
					this.double_click = false;
					this.open();
					return;
				} else { // single click
					this.double_click = true;
					if (this.timeout)
						clearTimeout(this.timeout);
					this.timeout = setTimeout(() => {
						this.double_click = false;
					}, 500);
				}
				break;
			case "keydown":
				if (e.keyCode === 83 && e.ctrlKey === true) {
					e.preventDefault();
					e.stopPropagation();
					this.write_to_file();
				}
				break;
		}
		super.handleEvent(e);
	}

	/**
	 * 
	 * @returns {Promise<void>} 
	 */
	rm() {
		return new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				["rm", "-f", this.path_str()],
				{ superuser: "try", err: "out" }
			);
			proc.done((data) => {
				resolve();
			});
			proc.fail((e, data) => {
				reject(data);
			});
		});
	}

	async open() {
		async function isEditable(path, fileSize) {
			if (fileSize === 0)
				return true; // empty file always editable
			const encoding = (await cockpit.spawn(["file", "-bL", "--mime-encoding", path], { superuser: "try" })).trim();
			if (['us-ascii', 'utf-8'].includes(encoding))
				return true;
			if (fileSize === 1 && ['\n', '\t', ' '].includes(await cockpit.file(path).read()))
				return true; // special case for empty file with newline, shows as `application/octet-stream; charset=binary`
			return false;
		}

		if (await isEditable(this.path_str(), this.stat['size']) || await this.nav_window_ref.modal_prompt.confirm(`'${this.filename}' is not a text file. Open it anyway?`, "WARNING: this may lead to file corruption.", true)) {
			this.show_edit_file_contents();
		}
	}

	async show_edit_file_contents() {
		window.removeEventListener("keydown", this.nav_window_ref);
		this.nav_window_ref.disable_buttons_for_editing();
		var contents = "";
		try {
			contents = await cockpit.file(this.path_str(), { superuser: "try" }).read();
		} catch (e) {
			this.nav_window_ref.enable_buttons();
			this.nav_window_ref.modal_prompt.alert(e.message);
			return;
		}
		var text_area = document.getElementById("nav-edit-contents-textarea");
		text_area.value = contents;
		text_area.addEventListener("keydown", this);
		document.getElementById("nav-cancel-edit-contents-btn").onclick = this.hide_edit_file_contents.bind(this);
		document.getElementById("nav-continue-edit-contents-btn").onclick = this.write_to_file.bind(this);
		document.getElementById("nav-edit-contents-header").innerText = "Editing " + this.path_str();
		document.getElementById("nav-contents-view-holder").style.display = "none";
		document.getElementById("nav-edit-contents-view").style.display = "flex";
	}

	async write_to_file() {
		var new_contents = document.getElementById("nav-edit-contents-textarea").value;
		try {
			await simple_spawn(["/usr/share/cockpit/navigator/scripts/write-to-file.py3", this.path_str()], new_contents);
		} catch (e) {
			this.nav_window_ref.modal_prompt.alert(e);
		}
		this.nav_window_ref.refresh();
		this.hide_edit_file_contents();
	}

	hide_edit_file_contents() {
		window.addEventListener("keydown", this.nav_window_ref);
		document.getElementById("nav-edit-contents-textarea").removeEventListener("keydown", this);
		document.getElementById("nav-edit-contents-view").style.display = "none";
		document.getElementById("nav-contents-view-holder").style.display = "flex";
		this.nav_window_ref.enable_buttons();
	}
}

export class NavFileLink extends NavFile {
	/**
	 * 
	 * @param {string} path 
	 * @param {object} stat 
	 * @param {NavWindow} nav_window_ref 
	 * @param {string} link_target 
	 */
	constructor(path, stat, nav_window_ref, link_target) {
		super(path, stat, nav_window_ref);
		var link_icon = this.dom_element.nav_item_icon.link_icon = document.createElement("i");
		link_icon.classList.add("fas", "fa-link", "nav-item-symlink-symbol-file");
		this.dom_element.nav_item_icon.appendChild(link_icon);
		this.double_click = false;
		this.link_target = link_target;
		this.dom_element.nav_item_title.style.fontStyle = "italic";
		if (nav_window_ref.item_display === "list")
			this.dom_element.nav_item_title.innerHTML += " &#8594; " + this.link_target;
	}

	show_properties() {
		var extra_properties = property_entry_html("Link Target", this.link_target);
		super.show_properties(extra_properties);
	}

	/**
	 * 
	 * @returns {string}
	 */
	get_link_target_path() {
		var target = "";
		if (this.link_target.charAt(0) === '/')
			target = this.link_target;
		else
			target = this.parent_dir().join("/") + "/" + this.link_target;
		if (target.charAt(0) !== '/')
			target = '/' + target;
		return target;
	}

	async open() {
		var target_path = this.get_link_target_path();
		var proc_output = await cockpit.spawn(["file", "--mime-type", target_path], { superuser: "try" });
		var fields = proc_output.split(/:(?=[^:]+$)/); // ensure it's the last : with lookahead
		var type = fields[1].trim();

		if ((/^text/.test(type) || /^inode\/x-empty$/.test(type) || this.stat["size"] === 0)) {
			this.show_edit_file_contents();
		} else {
			console.log("Unknown mimetype: " + type);
			this.nav_window_ref.modal_prompt.alert("Can't open " + this.filename + " for editing.");
		}
	}

	async show_edit_file_contents() {
		window.removeEventListener("keydown", this.nav_window_ref);
		this.nav_window_ref.disable_buttons_for_editing();
		document.getElementById("pwd").disabled = true;
		var target_path = this.get_link_target_path();
		var contents = "";
		try {
			contents = await cockpit.file(target_path, { superuser: "try" }).read();
		} catch (e) {
			this.nav_window_ref.enable_buttons();
			this.nav_window_ref.modal_prompt.alert(e.message);
			return;
		}
		var text_area = document.getElementById("nav-edit-contents-textarea");
		text_area.value = contents;
		text_area.addEventListener("keydown", this);
		document.getElementById("nav-cancel-edit-contents-btn").onclick = this.hide_edit_file_contents.bind(this);
		document.getElementById("nav-continue-edit-contents-btn").onclick = this.write_to_file.bind(this);
		document.getElementById("nav-edit-contents-header").innerHTML = "Editing " + this.path_str() + ' <i class="fas fa-long-arrow-alt-right"></i> ' + this.get_link_target_path();
		document.getElementById("nav-contents-view-holder").style.display = "none";
		document.getElementById("nav-edit-contents-view").style.display = "flex";
	}

	async write_to_file() {
		var target_path = this.get_link_target_path();
		var new_contents = document.getElementById("nav-edit-contents-textarea").value;
		try {
			await simple_spawn(["/usr/share/cockpit/navigator/scripts/write-to-file.py3", target_path], new_contents);
		} catch (e) {
			this.nav_window_ref.modal_prompt.alert(e);
		}
		this.nav_window_ref.refresh();
		this.hide_edit_file_contents();
	}
}
