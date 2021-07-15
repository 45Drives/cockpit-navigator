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
import {format_bytes, property_entry_html, format_time} from "../functions.js";

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
		this.dom_element = document.createElement("div");
		this.dom_element.classList.add("nav-item");
		let icon = this.dom_element.nav_item_icon = document.createElement("i");
		icon.classList.add("nav-item-icon");
		let title = this.dom_element.nav_item_title = document.createElement("div");
		title.classList.add("nav-item-title", "no-select");
		title.innerText = this.filename();
		this.dom_element.appendChild(icon);
		this.dom_element.appendChild(title);
		this.stat = stat;
		if (stat && stat["inaccessible"]) {
			this.dom_element.style.cursor = "not-allowed";
		} else {
			this.dom_element.addEventListener("click", this);
			this.dom_element.addEventListener("contextmenu", this);
		}
		this.is_hidden_file = this.filename().startsWith('.');
		if (this.is_hidden_file)
			icon.style.opacity = 0.5;
		this.dom_element.title = this.filename();
		if (nav_window_ref && nav_window_ref.item_display === "list") {
			let mode = document.createElement("div");
			let owner = document.createElement("div");
			let group = document.createElement("div");
			let size = document.createElement("div");
			mode.title = mode.innerText = this.stat["mode-str"];
			owner.title = owner.innerText = this.stat["owner"];
			group.title = group.innerText = this.stat["group"];
			size.title = size.innerText = format_bytes(this.stat["size"]);
			mode.classList.add("nav-item-title", "no-select", "monospace-sm");
			owner.classList.add("nav-item-title", "no-select");
			group.classList.add("nav-item-title", "no-select");
			size.classList.add("nav-item-title", "no-select");
			this.dom_element.appendChild(mode);
			this.dom_element.appendChild(owner);
			this.dom_element.appendChild(group);
			this.dom_element.appendChild(size);
		}
	}

	/**
	 * 
	 * @param {Event} e 
	 */
	handleEvent(e) {
		switch (e.type) {
			case "click":
				this.nav_window_ref.set_selected(this, e.shiftKey, e.ctrlKey);
				this.context_menu_ref.hide();
				e.stopPropagation();
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
	filename() {
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
		this.dom_element.style.display = "flex";
	}

	hide() {
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
	 * @param {string} extra_properties 
	 */
	show_properties(extra_properties = "") {
		var selected_name_fields = document.getElementsByClassName("nav-info-column-filename");
		for (let elem of selected_name_fields) {
			elem.innerHTML = this.filename();
			elem.title = this.filename();
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
		document.getElementById("nav-edit-filename").innerText = this.filename();
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
}
