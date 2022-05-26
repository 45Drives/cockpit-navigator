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

import { NavWindow } from "./NavWindow.js";
import { format_bytes, property_entry_html, format_time, check_if_exists } from "../functions.js";

export class NavEntry {
	/**
	 * 
	 * @param {string} path 
	 * @param {object} stat 
	 * @param {NavWindow} nav_window_ref 
	 */
	constructor(path, stat, nav_window_ref) {
		this.nav_window_ref = nav_window_ref;
		if (typeof path == "string")
			this.path = path.split("/").splice(1);
		else
			this.path = (path.length) ? path : [""];
		this.filename = this.get_filename();
		this.dom_element = document.createElement("div");
		this.dom_element.classList.add("nav-item");
		let icon = this.dom_element.nav_item_icon = document.createElement("i");
		icon.classList.add("nav-item-icon");
		let title = this.dom_element.nav_item_title = document.createElement("div");
		title.classList.add("nav-item-title", "no-select");
		title.innerText = this.filename;
		this.dom_element.appendChild(icon);
		this.dom_element.appendChild(title);
		let title_edit = this.dom_element.nav_item_title.editor = document.createElement("input");
		title_edit.type = "text";
		title_edit.style.display = "none";
		title_edit.style.padding = "0";
		title_edit.style.flexBasis = "0";
		title_edit.style.flexGrow = "2";
		title_edit.classList.add("nav-item-title");
		title_edit.oninput = (e) => {
			let elem = e.target;
			elem.style.width = elem.value.length + "ch";
		}
		title_edit.addEventListener("keydown", (e) => {e.stopPropagation();});
		title_edit.addEventListener("click", (e) => {e.stopPropagation();});
		this.dom_element.appendChild(title_edit);
		this.stat = stat;
		if (stat && stat["inaccessible"]) {
			this.dom_element.style.cursor = "not-allowed";
		} else {
			this.dom_element.addEventListener("click", this);
			this.dom_element.addEventListener("contextmenu", this);
		}
		this.is_hidden_file = this.filename.startsWith('.');
		if (this.is_hidden_file)
			icon.style.opacity = 0.5;
		this.dom_element.title = this.filename;
		if (nav_window_ref && nav_window_ref.item_display === "list") {
			let mode = document.createElement("div");
			let owner = document.createElement("div");
			let group = document.createElement("div");
			let size = document.createElement("div");
			let modified = document.createElement("div");
			let created = document.createElement("div");
			mode.title = mode.innerText = this.stat["mode-str"];
			owner.title = owner.innerText = this.stat["owner"];
			group.title = group.innerText = this.stat["group"];
			size.title = size.innerText = format_bytes(this.stat["size"]);
			modified.title = modified.innerText = format_time(this.stat["mtime"]);
			created.title = created.innerText = format_time(this.stat["ctime"]);
			mode.classList.add("nav-item-title", "no-select", "monospace-sm");
			owner.classList.add("nav-item-title", "no-select");
			group.classList.add("nav-item-title", "no-select");
			size.classList.add("nav-item-title", "no-select");
			modified.classList.add("nav-item-title", "no-select");
			created.classList.add("nav-item-title", "no-select");
			modified.style.flexGrow = 2;
			modified.style.flexBasis = 0;
			created.style.flexGrow = 2;
			created.style.flexBasis = 0;
			this.dom_element.appendChild(mode);
			this.dom_element.appendChild(owner);
			this.dom_element.appendChild(group);
			this.dom_element.appendChild(size);
			this.dom_element.appendChild(modified);
			this.dom_element.appendChild(created);
		}
		this.visible = true;
	}

	/**
	 * 
	 * @param {Event} e 
	 */
	handleEvent(e) {
		switch (e.type) {
			case "click":
				if (this.nav_window_ref.selected_entries.size === 1 && this.nav_window_ref.selected_entries.has(this)) {
					switch (e.target) {
						case this.dom_element.nav_item_title:
							this.double_click = true;
							if(this.timeout)
								clearTimeout(this.timeout)
							this.timeout = setTimeout(() => {
								this.double_click = false;
								if (!this.is_dangerous_path())
									this.show_edit(e.target);
							}, 500);
							e.stopPropagation();
							break;
						default:
							break;
					}
				}
				this.nav_window_ref.set_selected(this, e.shiftKey, e.ctrlKey);
				this.context_menu_ref.hide();
				break;
			case "contextmenu":
				this.context_menu_ref.show(e, this);
				e.preventDefault();
				e.stopPropagation();
				break;
		}
	}

	destroy() {
		while (this.dom_element.firstChild) {
			this.dom_element.removeChild(this.dom_element.firstChild);
		}
		if (this.dom_element.parentElement)
			this.dom_element.parentElement.removeChild(this.dom_element);
	}

	/**
	 * 
	 * @returns {string}
	 */
	get_filename() {
		var name = this.path[this.path.length - 1];
		if (!name)
			name = "/";
		return name;
	}

	/**
	 * 
	 * @returns {string}
	 */
	path_str() {
		return "/" + this.path.join("/");
	}

	/**
	 * 
	 * @returns {string}
	 */
	parent_dir() {
		return this.path.slice(0, this.path.length - 1);
	}

	show() {
		this.visible = true;
		this.dom_element.style.display = "flex";
	}

	hide() {
		this.visible = false;
		this.dom_element.style.display = "none";
	}

	/**
	 * 
	 * @returns {object}
	 */
	get_properties() {
		return this.stat;
	}

	/**
	 * 
	 * @returns {number}
	 */
	get_permissions() {
		return this.stat["mode"] & 0o777;
	}

	/**
	 * 
	 * @param {number} new_perms 
	 * @returns {Promise<void>} 
	 */
	chmod(new_perms) {
		return new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				["chmod", (new_perms & 0o777).toString(8), this.path_str()],
				{superuser: "try", err: "out"}
			);
			proc.done((data) => {
				resolve();
			});
			proc.fail((e, data) => {
				reject(data);
			});
		});
	}

	/**
	 * 
	 * @param {string} new_owner 
	 * @param {string} new_group 
	 * @returns {Promise<void>} 
	 */
	chown(new_owner, new_group) {
		return new Promise((resolve, reject) => {
			if (!new_owner && !new_group) {
				resolve();
				return;
			}
			var cmd = "";
			var arg = "";
			if (new_group && !new_owner) {
				cmd = "chgrp";
				arg = new_group;
			} else {
				cmd = "chown";
				arg = new_owner;
				if (new_group)
					arg += ":" + new_group;
			}
			var proc = cockpit.spawn(
				[cmd, arg, this.path_str()],
				{superuser: "try", err: "out"}
			);
			proc.done((data) => {
				resolve();
			});
			proc.fail((e, data) => {
				reject(data);
			});
		});
	}

	/**
	 * 
	 * @param {string} new_path 
	 * @returns {Promise<void>} 
	 */
	mv(new_path) {
		return new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				["mv", "-n", this.path_str(), [this.nav_window_ref.pwd().path_str(), new_path].join("/")],
				{superuser: "try", err: "out"}
			);
			proc.done((data) => {
				resolve();
			});
			proc.fail((e, data) => {
				reject(data);
			});
		});
	}

	/**
	 * 
	 * @param {string} new_path 
	 */
	async rename(new_name) {
		if (new_name === this.filename)
			return;
		if (new_name.includes("/")) {
			this.nav_window_ref.modal_prompt.alert(
				"File name can't contain `/`.",
				"If you want to move the file, right click > cut then right click > paste."
			);
			return;
		} else if (new_name === "..") {
			this.nav_window_ref.modal_prompt.alert(
				"File name can't be `..`.",
				"If you want to move the file, right click > cut then right click > paste."
			);
			return;
		}
		let new_path = [this.nav_window_ref.pwd().path_str(), new_name].join("/");
		if (await check_if_exists(new_path)) {
			this.nav_window_ref.modal_prompt.alert(
				"Failed to rename.",
				"File exists: " + new_path
			);
			return;
		}
		try {
			await this.mv(new_name);
		} catch(e) {
			this.nav_window_ref.modal_prompt.alert(e);
			return;
		}
		this.nav_window_ref.refresh();
	}

	/**
	 * 
	 * @param {HTMLDivElement} element 
	 * @returns 
	 */
	show_edit(element) {
		if (!element.editor)
			return;
		element.hide_func = () => {this.hide_edit(element)};
		element.keydown_handler = (e) => {
			switch (e.keyCode) {
				case 13: // enter
					this.apply_edit(element);
				case 27: // esc
					this.hide_edit(element);
					break;
				default:
					break;
			}
		};
		element.editor.addEventListener("keydown", element.keydown_handler);
		window.addEventListener("click", element.hide_func);
		switch (element) {
			case this.dom_element.nav_item_title:
				element.editor.value = this.filename;
				break;
			default:
				element.editor.value = element.innerText;
				break;
		}
		element.editor.style.width = element.editor.value.length + "ch";
		element.editor.style.display = "inline-block";
		element.style.display = "none";
		element.editor.focus();
	}

	apply_edit(element) {
		if (!element.editor)
			return;
		switch (element) {
			case this.dom_element.nav_item_title:
				this.rename(element.editor.value);
				break;
			default:
				break;
		}
	}

	hide_edit(element) {
		if (!element.editor)
			return;
		element.editor.style.display = "none";
		element.style.display = "inline-block";
		element.editor.removeEventListener("keydown", element.keydown_handler)
		window.removeEventListener("click", element.hide_func);
	}

	/**
	 * 
	 * @param {string} extra_properties 
	 */
	show_properties(extra_properties = "") {
		var selected_name_fields = document.getElementsByClassName("nav-info-column-filename");
		for (let elem of selected_name_fields) {
			elem.innerHTML = this.filename;
			elem.title = this.filename;
		}
		var html = "";
		html += property_entry_html("Mode", this.stat["mode-str"]);
		html += property_entry_html("Owner", this.stat["owner"] + " (" + this.stat["uid"] + ")");
		html += property_entry_html("Group", this.stat["group"] + " (" + this.stat["gid"] + ")");
		html += property_entry_html("Size", format_bytes(this.stat["size"]));
		html += property_entry_html("Accessed", format_time(this.stat["atime"]));
		html += property_entry_html("Modified", format_time(this.stat["mtime"]));
		html += property_entry_html("Created", format_time(this.stat["ctime"]));
		html += extra_properties;
		document.getElementById("nav-info-column-properties").innerHTML = html;
	}
	
	populate_edit_fields() {
		document.getElementById("nav-edit-filename").innerText = this.filename;
		var mode_bits = [
			"other-exec", "other-write", "other-read",
			"group-exec", "group-write", "group-read",
			"owner-exec", "owner-write", "owner-read"
		];
		for (let i = 0; i < mode_bits.length; i++) {
			var bit_check = 1 << i;
			var result = this.stat["mode"] & bit_check;
			document.getElementById(mode_bits[i]).checked = (result != 0);
		}
		document.getElementById("nav-edit-owner").value = this.stat["owner"];
		document.getElementById("nav-edit-group").value = this.stat["group"];
	}

	style_selected() {
		this.dom_element.classList.add("nav-item-selected");
	}

	unstyle_selected() {
		this.dom_element.classList.remove("nav-item-selected");
	}

	/**
	 * 
	 * @returns {boolean}
	 */
	is_dangerous_path() {
		return this.nav_window_ref.dangerous_dirs.includes(this.path_str());
	}
}
