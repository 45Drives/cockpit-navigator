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

/**
 * 
 * @param {string} key 
 * @param {string} value 
 * @returns {string}
 */
function property_entry_html(key, value) {
	var html = '<div class="nav-property-pair">';
	html += '<span class="nav-property-pair-key">' + key + '</span>';
	html += '<span class="nav-property-pair-value">' + value + '</span>';
	html += '</div>';
	return html;
}

/**
 * 
 * @param {number} bytes 
 * @returns {string}
 */
function format_bytes(bytes) {
	if (bytes === 0)
		return "0 B";
	var units = [" B", " KiB", " MiB", " GiB", " TiB", " PiB"];
	var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	var pow = Math.pow(1024, index);
	var formatted = bytes / pow;
	return formatted.toFixed(2).toString() + units[index];
}

/**
 * 
 * @param {number} timestamp 
 * @returns {string}
 */
function format_time(timestamp) {
	var date = new Date(timestamp * 1000);
	return date.toLocaleString();
}

/**
 * 
 * @param {number} seconds 
 * @returns {string}
 */
function format_time_remaining(seconds_) {
	var hours = Math.floor(seconds_ / 3600);
	var seconds = seconds_ % 3600;
	var minutes = Math.floor(seconds / 60);
	seconds = Math.floor(seconds % 60);
	var out = "";
	if (hours) {
		out = String(hours).padStart(2, '0') + ":";
	}
	if (minutes) {
		out += String(minutes).padStart(2, '0') + ":";
	}
	out += String(seconds).padStart(2, '0');
	return out;
}

/**
 * 
 * @param {number} mode 
 * @returns {string}
 */
function format_permissions(mode) {
	var bit_list = ["x", "w", "r"];
	var result = "";
	for (let bit = 8; bit >= 0; bit--) {
		var test_bit = 1 << bit;
		var test_result = mode & test_bit;
		if (test_result != 0) {
			result += bit_list[bit % bit_list.length];
		} else {
			result += "-";
		}
	}
	return result;
}

/**
 * 
 * @param {NavWindow} nav_window 
 */
function load_hidden_file_state(nav_window) {
	const state = localStorage.getItem('show-hidden-files') === 'true';
	const element = document.querySelector('#nav-show-hidden');

	if (state) {
		element.checked = true;
		nav_window.toggle_show_hidden({ target: element });
	}
}

/**
 * 
 * @param {NavWindow} nav_window 
 */
 function load_item_display_state(nav_window) {
	const state = localStorage.getItem('item-display');

	if (state === 'list') {
		nav_window.switch_item_display();
	}
}

function set_last_theme_state() {
	var toggle_switch = document.getElementById("toggle-theme");
	var state = localStorage.getItem("houston-theme-state");
	var icon = document.getElementById("houston-theme-icon");
	var logo = document.getElementById("logo-45d");
	if (state === "light") {
		toggle_switch.checked = false;
		document.documentElement.setAttribute("data-theme", "light");
		icon.classList.remove("fa-moon");
		icon.classList.add("fa-sun");
		logo.src = "branding/logo-light.svg";
	} else if (state === "dark") {
		toggle_switch.checked = true;
		document.documentElement.setAttribute("data-theme", "dark");
		icon.classList.remove("fa-sun");
		icon.classList.add("fa-moon");
		logo.src = "branding/logo-dark.svg";
	} else {
		toggle_switch.checked = false;
		state = "light";
		localStorage.setItem("houston-theme-state", state);
		logo.src = "branding/logo-light.svg";
	}
}

/**
 * 
 * @param {Event} e 
 */
function switch_theme(e) {
	var icon = document.getElementById("houston-theme-icon");
	var logo = document.getElementById("logo-45d");
	var state = "";
	if (e.target.checked) {
		state = "dark";
		icon.classList.remove("fa-sun");
		icon.classList.add("fa-moon");
		logo.src = "branding/logo-dark.svg";
	} else {
		state = "light";
		icon.classList.remove("fa-moon");
		icon.classList.add("fa-sun");
		logo.src = "branding/logo-light.svg";
	}
	document.documentElement.setAttribute("data-theme", state);
	localStorage.setItem("houston-theme-state", state);
}

class NavDownloader {
	/**
	 * 
	 * @param {NavFile} file 
	 */
	constructor(file) {
		this.path = file.path_str();
		this.filename = file.filename();
		this.read_size = file.stat["size"];
	}

	async download() {
		let query = window.btoa(JSON.stringify({
			payload: 'fsread1',
			binary: 'raw',
			path: this.path,
			superuser: true,
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

class NavEntry {
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
		this.dom_element.addEventListener("click", this);
		this.dom_element.addEventListener("contextmenu", this);
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

class NavFile extends NavEntry {
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
		switch(e.type){
			case "click":
				if (this.double_click)
					this.open();
				else { // single click
					this.double_click = true;
					if(this.timeout)
						clearTimeout(this.timeout)
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
	
	async open() {
		var proc_output = await cockpit.spawn(["file", "--mime-type", this.path_str()], {superuser: "try"});
		var fields = proc_output.split(/:(?=[^:]+$)/); // ensure it's the last : with lookahead
		var type = fields[1].trim();
		
		if ((/^text/.test(type) || /^inode\/x-empty$/.test(type) || this.stat["size"] === 0)) {
			this.show_edit_file_contents();
		} else {
			console.log("Unknown mimetype: " + type);
			if (window.confirm("Can't open " + this.filename() + " for editing. Download?")) {
				var download = new NavDownloader(this);
				download.download();
			}
		}
	}

	async show_edit_file_contents() {
		this.nav_window_ref.disable_buttons_for_editing();
		var contents = "";
		try {
			contents = await cockpit.file(this.path_str(), {superuser: "try"}).read();
		} catch (e) {
			this.nav_window_ref.enable_buttons();
			window.alert(e.message);
			return;
		}
		var text_area = document.getElementById("nav-edit-contents-textarea");
		text_area.value = contents;
		text_area.addEventListener("keydown", this);
		document.getElementById("nav-cancel-edit-contents-btn").onclick = this.hide_edit_file_contents.bind(this);
		document.getElementById("nav-continue-edit-contents-btn").onclick = this.write_to_file.bind(this);
		document.getElementById("nav-edit-contents-header").innerText = "Editing " + this.path_str();
		document.getElementById("nav-contents-view").style.display = "none";
		document.getElementById("nav-edit-contents-view").style.display = "flex";
	}
	
	async write_to_file() {
		var new_contents = document.getElementById("nav-edit-contents-textarea").value;
		try {
			if (new_contents.length)
				await cockpit.file(this.path_str(), {superuser: "try"}).replace(new_contents);
			else
				await cockpit.script("echo -n > $1", [this.path_str()], {superuser: "try"});
		} catch (e) {
			window.alert(e.message);
		}
		this.nav_window_ref.refresh();
		this.hide_edit_file_contents();
	}
	
	hide_edit_file_contents() {
		document.getElementById("nav-edit-contents-textarea").removeEventListener("keydown", this);
		document.getElementById("nav-edit-contents-view").style.display = "none";
		document.getElementById("nav-contents-view").style.display = "flex";
		this.nav_window_ref.enable_buttons();
	}
}

class NavFileLink extends NavFile{
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
		var proc_output = await cockpit.spawn(["file", "--mime-type", target_path], {superuser: "try"});
		var fields = proc_output.split(/:(?=[^:]+$)/); // ensure it's the last : with lookahead
		var type = fields[1].trim();
		
		if ((/^text/.test(type) || /^inode\/x-empty$/.test(type) || this.stat["size"] === 0)) {
			this.show_edit_file_contents();
		} else {
			console.log("Unknown mimetype: " + type);
			window.alert("Can't open " + this.filename() + " for editing.");
		}
	}

	async show_edit_file_contents() {
		this.nav_window_ref.disable_buttons_for_editing();
		document.getElementById("pwd").disabled = true;
		var target_path = this.get_link_target_path();
		var contents = "";
		try {
			contents = await cockpit.file(target_path, {superuser: "try"}).read();
		} catch(e) {
			this.nav_window_ref.enable_buttons();
			window.alert(e.message);
			return;
		}
		var text_area = document.getElementById("nav-edit-contents-textarea");
		text_area.value = contents;
		text_area.addEventListener("keydown", this);
		document.getElementById("nav-cancel-edit-contents-btn").onclick = this.hide_edit_file_contents.bind(this);
		document.getElementById("nav-continue-edit-contents-btn").onclick = this.write_to_file.bind(this);
		document.getElementById("nav-edit-contents-header").innerHTML = "Editing " + this.path_str() + ' <i class="fas fa-long-arrow-alt-right"></i> ' + this.get_link_target_path();
		document.getElementById("nav-contents-view").style.display = "none";
		document.getElementById("nav-edit-contents-view").style.display = "flex";
	}

	async write_to_file() {
		var target_path = this.get_link_target_path();
		var new_contents = document.getElementById("nav-edit-contents-textarea").value;
		try {
			await cockpit.file(target_path, {superuser: "try"}).replace(new_contents);
		} catch (e) {
			window.alert(e.message);
		}
		this.nav_window_ref.refresh();
		this.hide_edit_file_contents();
	}
}

class NavDir extends NavEntry {
	/**
	 * 
	 * @param {string|string[]} path 
	 * @param {object} stat 
	 * @param {NavWindow} nav_window_ref 
	 */
	constructor(path, stat, nav_window_ref) {
		super(path, stat, nav_window_ref);
		this.nav_type = "dir";
		this.dom_element.nav_item_icon.classList.add("fas", "fa-folder");
		this.double_click = false;
	}

	/**
	 * 
	 * @param {Event} e 
	 */
	handleEvent(e) {
		switch (e.type) {
			case "click":
				if (this.double_click)
					this.nav_window_ref.cd(this);
				else {
					// single click
					this.double_click = true;
					if (this.timeout)
						clearTimeout(this.timeout);
					this.timeout = setTimeout(() => {
						this.double_click = false;
					}, 500);
				}
				break;
		}
		super.handleEvent(e);
	}

	/**
	 * 
	 * @param {NavWindow} nav_window_ref 
	 * @returns {Promise<NavEntry[]>}
	 */
	get_children(nav_window_ref) {
		return new Promise(async (resolve, reject) => {
			var children = [];
			var proc = cockpit.spawn(
				["/usr/share/cockpit/navigator/scripts/ls.py", this.path_str()],
				{err:"out", superuser: "try"}
			);
			proc.fail((e, data) => {
				reject(data);
			});
			var data;
			try {
				data = await proc;
			} catch(e) {
				reject(e);
				return;
			}
			var response = JSON.parse(data);
			this.stat = response["."]["stat"];
			var entries = response["children"];
			var filename, path, stat;
			entries.forEach((entry) => {
				filename = entry["filename"];
				path = (this.path.length >= 1 && this.path[0]) ? [...this.path, filename] : [filename];
				stat = entry["stat"];
				switch(stat["mode-str"].charAt(0)) {
					case 'd':
						children.push(new NavDir(path, stat, nav_window_ref));
						break;
					case 'l':
						if(entry["isdir"])
							children.push(new NavDirLink(path, stat, nav_window_ref, entry["link-target"]));
						else
							children.push(new NavFileLink(path, stat, nav_window_ref, entry["link-target"]));
						break;
					default:
						children.push(new NavFile(path, stat, nav_window_ref));
						break;
				}
			});
			resolve(children);
		});
	}

	/**
	 * 
	 * @returns {Promise<void>}
	 */
	rm() {
		return new Promise(async (resolve, reject) => {
			var proc = cockpit.spawn(
				["rmdir", this.path_str()],
				{superuser: "try", err: "out"}
			);
			proc.done((data) => {
				resolve();
			});
			proc.fail((e, data) => {
				if (/^rmdir: failed to remove .*: Directory not empty\n?$/.test(data)) {
					if (window.confirm("WARNING: '" + this.path_str() + "' is not empty. Delete recursively? This can NOT be undone.")) {
						this.rm_recursive(resolve, reject);
					}
				} else {
					reject(data);
				}
			});
		});
	}

	/**
	 * 
	 * @param {Function} resolve 
	 * @param {Function} reject 
	 */
	rm_recursive(resolve, reject) {
		var proc = cockpit.spawn(
			["rm", "-rf", this.path_str()],
			{superuser: "try", err: "out"}
		);
		proc.done((data) => {
			resolve();
		});
		proc.fail((e, data) => {
			reject(data);
		});
	}
	
	/**
	 * 
	 * @returns {Object}
	 */
	async cephfs_dir_stats() {
		try {
			var proc = await cockpit.spawn(
				["/usr/share/cockpit/navigator/scripts/cephfs-dir-stats.py", "-j", this.path_str()],
				{err: "ignore"}
			);
			return JSON.parse(proc)[0];
		} catch {
			return null;
		}
	}

	/**
	 * 
	 * @param {string} extra_properties 
	 */
	async show_properties(extra_properties = "") {
		if(!this.hasOwnProperty("ceph_stats"))
			this.ceph_stats = await this.cephfs_dir_stats();
		// See if a JSON object exists for folder we are currently looking at
		if (this.ceph_stats !== null) {
			extra_properties +=
				'<div class="vertical-spacer"></div><h2 class="nav-info-column-filename">Ceph Status</h2>';
			extra_properties += property_entry_html(
				"Files",
				this.ceph_stats.hasOwnProperty("files") ? this.ceph_stats.files : "N/A"
			);
			extra_properties += property_entry_html(
				"Directories",
				this.ceph_stats.hasOwnProperty("subdirs") ? this.ceph_stats.subdirs : "N/A"
			);
			extra_properties += property_entry_html(
				"Recursive files",
				this.ceph_stats.hasOwnProperty("rfiles") ? this.ceph_stats.rfiles : "N/A"
			);
			extra_properties += property_entry_html(
				"Recursive directories",
				this.ceph_stats.hasOwnProperty("rsubdirs") ? this.ceph_stats.rsubdirs : "N/A"
			);
			extra_properties += property_entry_html(
				"Total size",
				this.ceph_stats.hasOwnProperty("rbytes") ? this.ceph_stats.rbytes : "N/A"
			);
			extra_properties += property_entry_html(
				"Layout pool",
				this.ceph_stats.hasOwnProperty("layout.pool") ? this.ceph_stats["layout.pool"] : "N/A"
			);
			extra_properties += property_entry_html(
				"Max files",
				this.ceph_stats.hasOwnProperty("max_files") ? this.ceph_stats.max_files : "N/A"
			);
			extra_properties += property_entry_html(
				"Max bytes",
				this.ceph_stats.hasOwnProperty("max_bytes") ? this.ceph_stats.max_bytes : "N/A"
			);
		}
		super.show_properties(extra_properties);
	}
}

class NavDirLink extends NavDir{
	/**
	 * 
	 * @param {string|string[]} path 
	 * @param {object} stat 
	 * @param {NavWindow} nav_window_ref 
	 * @param {string} link_target 
	 */
	constructor(path, stat, nav_window_ref, link_target) {
		super(path, stat, nav_window_ref);
		var link_icon = this.dom_element.nav_item_icon.link_icon = document.createElement("i");
		link_icon.classList.add("fas", "fa-link", "nav-item-symlink-symbol-dir");
		this.dom_element.nav_item_icon.appendChild(link_icon);
		this.double_click = false;
		this.link_target = link_target;
		this.dom_element.nav_item_title.style.fontStyle = "italic";
		if (nav_window_ref.item_display === "list")
			this.dom_element.nav_item_title.innerHTML += " &#8594; " + this.link_target;
	}

	/**
	 * 
	 * @returns {Promise<void>} 
	 */
	rm() {
		return new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				["rm", "-f", this.path_str()],
				{superuser: "try", err: "out"}
			);
			proc.done((data) => {
				resolve();
			})
			proc.fail((e, data) => {
				reject(data);
			});
		});
	}

	show_properties() {
		var extra_properties = property_entry_html("Link Target", this.link_target);
		super.show_properties(extra_properties);
	}
}

class NavContextMenu {
	/**
	 * 
	 * @param {string} id 
	 */
	constructor(id, nav_window_ref) {
		this.dom_element = document.getElementById(id);
		this.nav_window_ref = nav_window_ref;
		this.menu_options = {};
		document.documentElement.addEventListener("click", (event) => {
			if (event.target !== this.dom_element)
				this.hide();
		});
		
		var functions = [
			["new_dir", '<div><i class="fas fa-folder-plus"></i></div>'],
			["new_file", '<div><i class="fas fa-file-medical"></i></div>'],
			["new_link", '<div><i class="fas fa-link nav-icon-decorated"><i class="fas fa-plus nav-icon-decoration"></i></i></div>'],
			["cut", '<div><i class="fas fa-cut"></i></div>'],
			["copy", '<div><i class="fas fa-copy"></i></div>'],
			["paste", '<div><i class="fas fa-paste"></i></div>'],
			["rename", '<div><i class="fas fa-i-cursor"></i></div>'],
			["delete", '<div><i class="fas fa-trash-alt"></i></div>'],
			["download", '<div><i class="fas fa-download"></i></div>'],
			["properties", '<div><i class="fas fa-sliders-h"></i></div>']
		];
		for (let func of functions) {
			var elem = document.createElement("div");
			var name_list = func[0].split("_");
			name_list.forEach((word, index) => {name_list[index] = word.charAt(0).toUpperCase() + word.slice(1)});
			elem.innerHTML = func[1] + name_list.join(" ");
			elem.addEventListener("click", (e) => {this[func[0]].bind(this).apply()});
			elem.classList.add("nav-context-menu-item")
			elem.id = "nav-context-menu-" + func[0];
			this.dom_element.appendChild(elem);
			this.menu_options[func[0]] = elem;
		}
		this.menu_options["paste"].style.display = "none";
	}

	new_dir() {
		this.nav_window_ref.mkdir();
	}

	new_file() {
		this.nav_window_ref.touch();
	}

	new_link() {
		var default_target = "";
		if (this.nav_window_ref.selected_entries.size <= 1 && this.target !== this.nav_window_ref.pwd())
			default_target = this.target.filename();
		this.nav_window_ref.ln(default_target);
	}

	cut() {
		this.nav_window_ref.cut();
	}

	copy() {
		this.nav_window_ref.copy();
	}

	paste() {
		this.nav_window_ref.paste();
	}

	async rename() {
		this.hide();
		var new_name = window.prompt("New Name: ", this.target.filename());
		if (new_name === null)
			return;
		if (new_name.includes("/")) {
			window.alert("File name can't contain `/`.");
			return;
		}
		try {
			await this.target.mv(new_name);
		} catch(e) {
			window.alert(e);
			return;
		}
		this.nav_window_ref.refresh();
	}

	zip_for_download() {
		return new Promise((resolve, reject) => {
			var cmd = [
				"/usr/share/cockpit/navigator/scripts/zip-for-download.py",
				this.nav_window_ref.pwd().path_str()
			];
			for (let entry of this.nav_window_ref.selected_entries) {
				cmd.push(entry.path_str());
			}
			var proc = cockpit.spawn(cmd, {superuser: "try", err: "out"});
			proc.fail((e, data) => {
				reject(JSON.parse(data));
			});
			proc.done((data) => {
				resolve(JSON.parse(data));
			});
		});
	}

	async download() {
		var download_target = "";
		if (this.nav_window_ref.selected_entries.size === 1 && !(this.target instanceof NavDir)) {
			download_target = this.target;
		} else {
			this.nav_window_ref.start_load();
			var result;
			try {
				result = await this.zip_for_download();
			} catch(e) {
				this.nav_window_ref.stop_load();
				window.alert(e.message);
				return;
			}
			this.nav_window_ref.stop_load();
			download_target = new NavFile(result["archive-path"], result["stat"], this.nav_window_ref);
		}
		var download = new NavDownloader(download_target);
		download.download();
	}

	delete() {
		this.nav_window_ref.delete_selected();
	}

	properties() {
		this.nav_window_ref.show_edit_selected();
	}

	/**
	 * 
	 * @param {Event} event 
	 * @param {NavEntry} target 
	 */
	show(event, target) {
		if (this.nav_window_ref.selected_entries.size > 1) {
			if (event.shiftKey || event.ctrlKey)
				this.nav_window_ref.set_selected(target, event.shiftKey, event.ctrlKey);
		} else {
			this.nav_window_ref.set_selected(target, false, false);
		}
		this.menu_options["download"].style.display = "flex";
		if (target === this.nav_window_ref.pwd()) {
			this.menu_options["copy"].style.display = "none";
			this.menu_options["cut"].style.display = "none";
			this.menu_options["delete"].style.display = "none";
		} else {
			this.menu_options["copy"].style.display = "flex";
			this.menu_options["cut"].style.display = "flex";
			this.menu_options["delete"].style.display = "flex";
		}
		if (this.nav_window_ref.selected_entries.size > 1) {
			this.menu_options["rename"].style.display = "none";
		} else {
			this.menu_options["rename"].style.display = "flex";
			if (target instanceof NavFileLink)
				this.menu_options["download"].style.display = "none";
		}
		this.target = target;
		this.dom_element.style.display = "inline";
		this.dom_element.style.left = event.clientX + "px";
		var height = this.dom_element.getBoundingClientRect().height;
		var max_height = window.innerHeight;
		if (event.clientY > max_height - height) {
			this.dom_element.style.top = event.clientY - height + "px";
		} else {
			this.dom_element.style.top = event.clientY + "px";
		}
	}

	hide() {
		this.dom_element.style.display = "none";
	}

	hide_paste() {
		this.menu_options["paste"].style.display = "none";
	}
}

class FileUpload {
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
			var proc = cockpit.spawn(["/usr/share/cockpit/navigator/scripts/fail-if-exists.py", this.path], {superuser: "try"});
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
			if (!window.confirm(this.filename + ": File exists. Replace?"))
				return;
		}
		this.make_html_element();
		this.proc = cockpit.spawn(["/usr/share/cockpit/navigator/scripts/write-chunks.py", this.path], {err: "out", superuser: "try"});
		this.proc.fail((e, data) => {
			this.reader.onload = () => {}
			this.done();
			window.alert(data);
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

class NavDragDrop {
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
							if (file.type === "") {
								window.alert(file.name + ": Cannot upload folders.");
								continue;
							}
							var uploader = new FileUpload(file, this.nav_window_ref);
							uploader.upload();
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

class SortFunctions {
	constructor() {
		this.orders = {
			name: "asc",
			owner: "asc",
			group: "asc",
			size: "asc",
		}
		this.icons = {};
		for (let option of ["name", "owner", "group", "size"]) {
			this.icons[option] = document.getElementById(`sort-${option}-icon`);
		}
		this.current_choice = "name";
	}

	get_func() {
		return this[`${this.current_choice}_${this.orders[this.current_choice]}`];
	}

	set_func(option) {
		if (this.current_choice === option) {
			if (this.orders[this.current_choice] === "asc") {
				this.orders[this.current_choice] = "desc";
				this.icons[this.current_choice].classList.remove("fa-chevron-up");
				this.icons[this.current_choice].classList.add("fa-chevron-down");
			} else {
				this.orders[this.current_choice] = "asc";
				this.icons[this.current_choice].classList.remove("fa-chevron-down");
				this.icons[this.current_choice].classList.add("fa-chevron-up");
			}
		} else {
			this.icons[this.current_choice].classList.remove("fa-chevron-up", "fa-chevron-down");
			this.current_choice = option;
			if (this.orders[this.current_choice] === "asc") {
				this.icons[this.current_choice].classList.add("fa-chevron-up");
			} else {
				this.icons[this.current_choice].classList.add("fa-chevron-down");
			}
		}
		
	}

	name_asc(first, second) {
		return first.filename().localeCompare(second.filename());
	}

	name_desc(first, second) {
		return second.filename().localeCompare(first.filename());
	}

	owner_asc(first, second) {
		return first.stat["owner"].localeCompare(second.stat["owner"]);
	}

	owner_desc(first, second) {
		return second.stat["owner"].localeCompare(first.stat["owner"]);
	}

	group_asc(first, second) {
		return first.stat["group"].localeCompare(second.stat["group"]);
	}

	group_desc(first, second) {
		return second.stat["group"].localeCompare(first.stat["group"]);
	}

	size_asc(first, second) {
		return first.stat["size"] - second.stat["size"];
	}

	size_desc(first, second) {
		return second.stat["size"] - first.stat["size"];
	}
}

class NavWindow {
	constructor() {
		this.item_display = "grid";
		this.path_stack = (localStorage.getItem('navigator-path') ?? '/').split('/');
		this.path_stack = this.path_stack.map((_, index) => new NavDir([...this.path_stack.slice(0, index + 1)].filter(part => part != ''), this));

		this.path_stack_index = this.path_stack.length - 1;
		this.selected_entries = new Set([this.pwd()]);
		this.entries = [];
		this.window = document.getElementById("nav-contents-view");
		this.window.addEventListener("click", this);
		this.window.addEventListener("contextmenu", this);
		this.window.addEventListener("keydown", this);
		this.last_selected_index = -1;

		this.context_menu = new NavContextMenu("nav-context-menu", this);

		this.clip_board = [];

		this.uploader = new NavDragDrop(this.window, this);

		this.sort_function = new SortFunctions();
	}

	/**
	 * 
	 * @param {Event} e 
	 */
	handleEvent(e) {
		switch (e.type) {
			case "click":
				this.clear_selected();
				this.show_selected_properties();
				break;
			case "contextmenu":
				this.context_menu.show(e, this.pwd());
				e.preventDefault();
				break;
			case "keydown":
				if (e.keyCode === 46) {
					this.delete_selected();
				} else if (e.keyCode === 65 && e.ctrlKey) {
					this.select_all();
					e.preventDefault();
				} else if (e.keyCode === 67 && e.ctrlKey) {
					this.copy();
				} else if (e.keyCode === 86 && e.ctrlKey) {
					this.paste();
				} else if (e.keyCode === 88 && e.ctrlKey) {
					this.cut();
				}
				break;
			default:
				break;
		}
	}

	async refresh() {
		localStorage.setItem('navigator-path', `/${this.path_stack[this.path_stack_index].path.join('/')}`);

		var num_dirs = 0;
		var num_files = 0;
		var bytes_sum = 0;
		this.show_hidden = document.getElementById("nav-show-hidden").checked;
		this.start_load();
		try {
			var files = await this.pwd().get_children(this);
		} catch(e) {
			this.up();
			window.alert(e);
			return;
		}
		while (this.entries.length) {
			var entry = this.entries.pop();
			entry.destroy();
		}
		files.sort((first, second) => {
			if (first.nav_type === second.nav_type) {
				return this.item_display === "list" 
					? this.sort_function.get_func()(first, second)
					: this.sort_function.name_asc(first, second); // default to sort by name in grid view
			}
			if (first.nav_type === "dir")
				return -1;
			return 1;
		});
		files.forEach((file) => {
			if (file.nav_type === "dir")
				num_dirs++;
			else {
				num_files++;
				bytes_sum += file.stat["size"];
			}
			if(!file.is_hidden_file || this.show_hidden) {
				this.window.appendChild(file.dom_element);
				this.entries.push(file);
			}
			file.context_menu_ref = this.context_menu;
		});
		document.getElementById("pwd").value = this.pwd().path_str();
		this.set_selected(this.pwd(), false, false);
		this.show_selected_properties();
		document.getElementById("nav-num-dirs").innerText = num_dirs.toString();
		document.getElementById("nav-num-files").innerText = num_files.toString();
		document.getElementById("nav-num-bytes"). innerText = format_bytes(bytes_sum);
		this.stop_load();
	}

	/**
	 * 
	 * @returns {NavDir}
	 */
	pwd() {
		return this.path_stack[this.path_stack_index];
	}

	/**
	 * 
	 * @param {NavDir} new_dir 
	 */
	cd(new_dir) {
		this.path_stack.length = this.path_stack_index + 1;
		this.path_stack.push(new_dir);
		this.path_stack_index = this.path_stack.length - 1;
		this.refresh();
	}

	back() {
		this.path_stack_index = Math.max(this.path_stack_index - 1, 0);
		this.refresh();
	}
	
	forward() {
		this.path_stack_index = Math.min(this.path_stack_index + 1, this.path_stack.length - 1);
		this.refresh();
	}
	
	up() {
		if(this.pwd().path_str() !== '/')
			this.cd(new NavDir(this.pwd().parent_dir()));
	}
	
	/**
	 * 
	 * @param {NavEntry} entry 
	 * @param {Boolean} select_range 
	 * @param {Boolean} append 
	 */
	set_selected(entry, select_range, append) {
		this.hide_edit_selected();
		for (let i of this.selected_entries) {
			i.dom_element.classList.remove("nav-item-selected");
			if (i.nav_type === "dir") {
				i.dom_element.nav_item_icon.classList.remove("fa-folder-open");
				i.dom_element.nav_item_icon.classList.add("fa-folder");
			}
		}
		var to_be_selected = [];
		if (append && this.selected_entries.has(entry)) {
			this.selected_entries.delete(entry);
			if (this.selected_entries.size === 0) {
				this.clear_selected();
			}
		} else if (select_range && this.last_selected_index !== -1) {
			var start = this.last_selected_index;
			var end = this.entries.indexOf(entry);
			if (end < start)
				[start, end] = [end, start];
			if (end === -1)
				return;
			to_be_selected = this.entries.slice(start, end + 1);
		} else {
			if (!append)
				this.selected_entries.clear();
			to_be_selected = [entry];
		}
		for (let i of to_be_selected) {
			this.selected_entries.add(i);
		}
		for (let i of this.selected_entries) {
			i.dom_element.classList.add("nav-item-selected");
			if (i.nav_type === "dir") {
				i.dom_element.nav_item_icon.classList.remove("fa-folder");
				i.dom_element.nav_item_icon.classList.add("fa-folder-open");
			}
		}
		if (this.selected_entries.size > 1){
			var name_fields = document.getElementsByClassName("nav-info-column-filename");
			for (let name_field of name_fields) {
				name_field.innerText = this.selected_entries.size.toString() + " selected"
				name_field.title = name_field.innerText;
			}
			document.getElementById("nav-info-column-properties").innerHTML = "";
		} else {
			this.show_selected_properties();
		}
		this.last_selected_index = this.entries.indexOf(entry);
	}
	
	clear_selected() {
		this.set_selected(this.pwd(), false, false);
	}

	selected_entry() {
		return [...this.selected_entries][this.selected_entries.size - 1];
	}
	
	show_selected_properties() {
		this.selected_entry().show_properties();
	}

	show_edit_selected() {
		var dangerous_dirs = [
			"/",
			"/usr",
			"/bin",
			"/sbin",
			"/lib",
			"/lib32",
			"/lib64",
			"/usr/bin",
			"/usr/include",
			"/usr/lib",
			"/usr/lib32",
			"/usr/lib64",
			"/usr/sbin",
		];
		var dangerous_selected = [];
		for (let i of this.selected_entries) {
			var path = i.path_str();
			if (dangerous_dirs.includes(path)) {
				dangerous_selected.push(path);
			}
		}
		if (dangerous_selected.length > 0) {
			var dangerous_selected_str = "";
			if (dangerous_selected.length > 2) {
				var last = dangerous_selected.pop();
				dangerous_selected_str = dangerous_selected.join(", ");
				dangerous_selected_str += ", and " + last;
			} else if (dangerous_selected.length === 2) {
				dangerous_selected_str = dangerous_selected.join(" and ");
			} else {
				dangerous_selected_str = dangerous_selected[0];
			}
			if (!window.confirm(
				"Warning: editing " +
				dangerous_selected_str +
				" can be dangerous. Are you sure?"
			)) {
				return;
			}
		} else if (this.selected_entries.size > 1) {
			if (!window.confirm(
				"Warning: are you sure you want to edit permissions for " +
				this.selected_entries.size +
				" files?"
			)) {
				return;
			}
		}
		if (this.selected_entries.size === 1) {
			this.selected_entry().populate_edit_fields();
			document.getElementById("selected-files-list-header").innerText = "";
			document.getElementById("selected-files-list").innerText = "";
		} else {
			for (let field of ["owner", "group"]) {
				document.getElementById("nav-edit-" + field).value = "";
			}
			var filename = document.getElementById("nav-edit-filename");
			filename.value = "N/A";
			filename.disabled = true;
			for (let checkbox of document.getElementsByClassName("mode-checkbox")) {
				checkbox.checked = false;
			}
			var targets = [];
			for (let target of this.selected_entries) {
				targets.push(target.filename());
			}
			var targets_str = targets.join(", ");
			document.getElementById("selected-files-list-header").innerText = "Applying edits to:";
			document.getElementById("selected-files-list").innerText = targets_str;
		}
		this.update_permissions_preview();
		this.changed_mode = false;
		document.getElementById("nav-mode-preview").innerText = "unchanged";
		document.getElementById("nav-edit-properties").style.display = "flex";
		document.getElementById("nav-show-properties").style.display = "none";
	}
	
	hide_edit_selected() {
		document.getElementById("nav-show-properties").style.display = "flex";
		document.getElementById("nav-edit-properties").style.display = "none";
	}
	
	/**
	 * 
	 * @returns {number}
	 */
	get_new_permissions() {
		var category_list = ["other", "group", "owner"];
		var action_list = ["exec", "write", "read"];
		var result = 0;
		var bit = 0;
		for (let category of category_list) {
			for (let action of action_list) {
				if (document.getElementById(category + "-" + action).checked)
					result |= 1 << bit;
				bit++;
			}
		}
		return result;
	}
	
	update_permissions_preview() {
		var new_perms = this.get_new_permissions();
		var text = format_permissions(new_perms);
		text += " (" + (new_perms & 0o777).toString(8) + ")";
		document.getElementById("nav-mode-preview").innerText = text;
		this.changed_mode = true;
	}

	async apply_edit_selected() {
		var new_owner = document.getElementById("nav-edit-owner").value;
		var new_group = document.getElementById("nav-edit-group").value;
		var new_perms = this.get_new_permissions();

		for (let entry of this.selected_entries) {
			if (
				new_owner !== entry.stat["owner"] ||
				new_group !== entry.stat["group"]
			) {
				try {
					await entry.chown(new_owner, new_group);
				} catch(e) {
					window.alert(e);
				}
			}
			if (this.changed_mode && (new_perms & 0o777) !== (entry.stat["mode"] & 0o777)) {
				try {
					await entry.chmod(new_perms);
				} catch(e) {
					window.alert(e);
				}
			}
		}
		this.refresh();
		this.hide_edit_selected();
	}

	async delete_selected() {
		var prompt = "";
		if (this.selected_entries.size > 1) {
			prompt = "Deleting " + this.selected_entries.size + " files. This cannot be undone. Are you sure?";
		} else {
			prompt = "Deleting `" + this.selected_entry().path_str() + "` cannot be undone. Are you sure?";
		}
		if (!window.confirm(prompt)) {
			return;
		}
		for (let target of this.selected_entries) {
			try {
				await target.rm();
			} catch(e) {
				window.alert(e);
			}
		}
		this.refresh();
	}

	async mkdir() {
		var new_dir_name = window.prompt("Directory Name: ");
		if (new_dir_name === null)
			return;
		if (new_dir_name.includes("/")) {
			window.alert("Directory name can't contain `/`.");
			return;
		}
		var promise = new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				["mkdir", this.pwd().path_str() + "/" + new_dir_name],
				{superuser: "try", err: "out"}
			);
			proc.done((data) => {
				resolve();
			});
			proc.fail((e, data) => {
				reject(data);
			});
		});
		try {
			await promise;
		} catch(e) {
			window.alert(e);
		}
		this.refresh();
	}

	async touch() {
		var new_file_name = window.prompt("File Name: ");
		if (new_file_name === null)
			return;
		if (new_file_name.includes("/")) {
			window.alert("File name can't contain `/`.");
			return;
		}
		var promise = new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				["/usr/share/cockpit/navigator/scripts/touch.py", this.pwd().path_str() + "/" + new_file_name],
				{superuser: "try", err: "out"}
			);
			proc.done((data) => {
				resolve();
			});
			proc.fail((e, data) => {
				reject(data);
			});
		});
		try {
			await promise;
		} catch(e) {
			window.alert(e);
		}
		this.refresh();
	}

	async ln(default_target = "") {
		var link_target = window.prompt("Link Target: ", default_target);
		if (link_target === null)
			return;
		var link_name = window.prompt("Link Name: ");
		if (link_name === null)
			return;
		if (link_name.includes("/")) {
			window.alert("Link name can't contain `/`.");
			return;
		}
		var link_path = this.pwd().path_str() + "/" + link_name;
		var promise = new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				["ln", "-sn", link_target, link_path],
				{superuser: "try", err: "out"}
			);
			proc.done((data) => {
				resolve();
			});
			proc.fail((e, data) => {
				reject(data);
			});
		});
		try {
			await promise;
		} catch(e) {
			window.alert(e);
		}
		this.refresh();
	}

	cut() {
		this.clip_board = [...this.selected_entries];
		this.copy_or_move = "move";
		this.paste_cwd = this.pwd().path_str();
		this.context_menu.menu_options["paste"].style.display = "flex";
	}

	copy() {
		this.clip_board = [...this.selected_entries];
		this.copy_or_move = "copy";
		this.paste_cwd = this.pwd().path_str();
		this.context_menu.menu_options["paste"].style.display = "flex";
	}

	paste() {
		this.paste_clipboard();
		this.context_menu.hide_paste();
	}

	async paste_clipboard() {
		this.start_load();
		this.context_menu.hide_paste();
		var cmd = ["/usr/share/cockpit/navigator/scripts/paste.py"];
		var dest = this.pwd().path_str();
		if (this.copy_or_move === "move") {
			cmd.push("-m");
		}
		cmd.push(this.paste_cwd);
		for (let item of this.clip_board) {
			cmd.push(item.path_str());
		}
		cmd.push(dest);
		var promise = new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				cmd,
				{superuser: "try", err: "ignore"}
			);
			proc.stream((data) => {
				var payload = JSON.parse(data);
				if (payload["wants-response"]) {
					var user_response = window.confirm(payload["message"]);
					proc.input(JSON.stringify(user_response) + "\n", true);
				} else {
					window.alert(payload["message"]);
				}
			});
			proc.done((data) => {
				resolve();
			});
			proc.fail((e, data) => {
				reject("Paste failed.");
			});
		});
		try {
			await promise;
		} catch(e) {
			window.alert(e);
		}
		this.stop_load();
		this.refresh();
	}

	/**
	 * 
	 * @param {Event} e 
	 */
	nav_bar_event_handler(e) {
		switch(e.key){
			case 'Enter':
				this.nav_bar_cd();
				break;
			default:
				break;
		}
	}

	nav_bar_cd() {
		var new_path = document.getElementById("pwd").value;
		while (new_path.charAt(new_path.length - 1) === '/' && new_path.length > 1)
			new_path = new_path.substr(0, new_path.length - 1);
		this.cd(new NavDir(new_path));
	}

	async nav_bar_update_choices() {
		var list = document.getElementById("possible-paths");
		var partial_path_str = document.getElementById("pwd").value;
		var last_delim = partial_path_str.lastIndexOf('/');
		if(last_delim === -1)
			return;
		var parent_path_str = partial_path_str.slice(0, last_delim);
		if(this.nav_bar_last_parent_path_str === parent_path_str)
			return;
		this.nav_bar_last_parent_path_str = parent_path_str;
		var parent_dir = new NavDir(parent_path_str);
		var objs;
		try {
			objs = await parent_dir.get_children(this);
		} catch(e) {
			return;
		}
		objs = objs.filter((child) => {return child.nav_type === "dir"});
		while(list.firstChild)
			list.removeChild(list.firstChild);
		objs.forEach((obj) => {
			var option = document.createElement("option");
			option.value = obj.path_str();
			list.appendChild(option);
		});
	}

	start_load() {
		document.getElementById("nav-loader-container").style.display = "block";
		var buttons = document.getElementsByTagName("button");
		for (let button of buttons) {
			button.disabled = true;
		}
	}

	stop_load() {
		document.getElementById("nav-loader-container").style.display = "none";
		var buttons = document.getElementsByTagName("button");
		for (let button of buttons) {
			button.disabled = false;
		}
	}

	/**
	 * 
	 * @param {Event} e 
	 */
	toggle_show_hidden(e) {
		localStorage.setItem('show-hidden-files', e.target.checked);

		var icon = document.getElementById("nav-show-hidden-icon");
		if (e.target.checked) {
			icon.classList.remove("fa-low-vision");
			icon.classList.add("fa-eye");
		} else {
			icon.classList.remove("fa-eye");
			icon.classList.add("fa-low-vision");
		}
		this.refresh();
	}

	/**
	 * 
	 * @returns {Promise<void>} 
	 */
	get_system_users() {
		return new Promise(async (resolve, reject) => {
			var proc = cockpit.spawn(["getent", "passwd"], {err: "ignore", superuser: "try"});
			proc.fail((e, data) => {
				reject(data);
			});
			var list = document.getElementById("possible-owners");
			while(list.firstChild) {
				list.removeChild(list.firstChild);
			}
			var passwd;
			try {
				passwd = await proc;
			} catch(e) {
				reject(e);
				return;
			}
			var passwd_entries = passwd.split("\n");
			for (let entry of passwd_entries) {
				var cols = entry.split(":");
				var username = cols[0];
				var option = document.createElement("option");
				option.value = username;
				list.appendChild(option);
			}
			resolve();
		});
	}

	/**
	 * 
	 * @returns {Promise<void>} 
	 */
	get_system_groups() {
		return new Promise(async (resolve, reject) => {
			var proc = cockpit.spawn(["getent", "group"], {err: "ignore", superuser: "try"});
			proc.fail((e, data) => {
				reject(data);
			});
			var list = document.getElementById("possible-groups");
			while(list.firstChild) {
				list.removeChild(list.firstChild);
			}
			var group
			try {
				group = await proc;
			} catch(e) {
				reject(e);
				return;
			}
			var group_entries = group.split("\n");
			for (let entry of group_entries) {
				var cols = entry.split(":");
				var groupname = cols[0];
				var option = document.createElement("option");
				option.value = groupname;
				list.appendChild(option);
			}
			resolve();
		});
	}

	disable_buttons_for_editing() {
		for (let button of document.getElementsByTagName("button")) {
			if (!button.classList.contains("editor-btn"))
				button.disabled = true;
		}
		document.getElementById("pwd").disabled = true;
	}

	enable_buttons() {
		for (let button of document.getElementsByTagName("button")) {
			button.disabled = false;
		}
		document.getElementById("pwd").disabled = false;
	}

	select_all() {
		this.selected_entries.clear();
		for (let entry of this.entries) {
			if (!entry.is_hidden_file || this.show_hidden) {
				this.set_selected(entry, false, true);
			}
		}
	}

	async switch_item_display() {
		var button = document.getElementById("nav-item-display-icon");
		if (this.item_display === "grid") {
			this.item_display = "list";
			await this.refresh();
			this.window.classList.remove("contents-view-grid");
			this.window.classList.add("contents-view-list");
			button.classList.remove("fa-list");
			button.classList.add("fa-th");
		} else {
			this.item_display = "grid";
			await this.refresh();
			this.window.classList.remove("contents-view-list");
			this.window.classList.add("contents-view-grid");
			button.classList.remove("fa-th");
			button.classList.add("fa-list");
		}
		
		localStorage.setItem("item-display", this.item_display);
	}

	search_filter(event) {
		var search_name = event.target.value;
		this.entries.forEach((entry) => {
			if (entry.filename().toLowerCase().startsWith(search_name.toLowerCase()))
				entry.show();
			else
				entry.hide();
		});
	}
}

let nav_window = new NavWindow();

function set_up_buttons() {
	document.getElementById("nav-back-btn").addEventListener("click", nav_window.back.bind(nav_window));
	document.getElementById("nav-forward-btn").addEventListener("click", nav_window.forward.bind(nav_window));
	document.getElementById("nav-up-dir-btn").addEventListener("click", nav_window.up.bind(nav_window));
	document.getElementById("nav-refresh-btn").addEventListener("click", nav_window.refresh.bind(nav_window));
	document.getElementById("nav-mkdir-btn").addEventListener("click", nav_window.mkdir.bind(nav_window));
	document.getElementById("nav-touch-btn").addEventListener("click", nav_window.touch.bind(nav_window));
	document.getElementById("nav-ln-btn").addEventListener("click", nav_window.ln.bind(nav_window, ""));
	document.getElementById("nav-delete-btn").addEventListener("click", nav_window.delete_selected.bind(nav_window));
	document.getElementById("nav-edit-properties-btn").addEventListener("click", nav_window.show_edit_selected.bind(nav_window));
	document.getElementById("nav-cancel-edit-btn").addEventListener("click", nav_window.hide_edit_selected.bind(nav_window));
	document.getElementById("nav-apply-edit-btn").addEventListener("click", nav_window.apply_edit_selected.bind(nav_window));
	var mode_checkboxes = document.getElementsByClassName("mode-checkbox");
	for (let checkbox of mode_checkboxes) {
		checkbox.addEventListener("change", nav_window.update_permissions_preview.bind(nav_window));
	}
	document.getElementById("pwd").addEventListener("input", nav_window.nav_bar_update_choices.bind(nav_window), false);
	document.getElementById("pwd").addEventListener("focus", nav_window.nav_bar_update_choices.bind(nav_window), false);
	document.getElementById("pwd").addEventListener("keydown", nav_window.nav_bar_event_handler.bind(nav_window));
	document.getElementById("toggle-theme").addEventListener("change", switch_theme, false);
	document.getElementById("nav-show-hidden").addEventListener("change", nav_window.toggle_show_hidden.bind(nav_window));
	document.getElementById("nav-item-display-btn").addEventListener("click", nav_window.switch_item_display.bind(nav_window));
	for (let option of ["name", "owner", "group", "size"]) {
		var elem = document.getElementById("sort-" + option + "-btn");
		elem.addEventListener("click", (event) => {
			nav_window.sort_function.set_func(option);
			nav_window.refresh();
		});
	}
	document.getElementById("search-bar").addEventListener("input", nav_window.search_filter.bind(nav_window));
	document.getElementById("search-bar").addEventListener("keydown", (e) => {
		if (e.keyCode === 13)
			nav_window.search_filter(e);
	});
	// fix tab in editor input
	document.getElementById('nav-edit-contents-textarea').addEventListener('keydown', (e) => {
		if (e.key == 'Tab') {
			e.preventDefault();
			var start = e.target.selectionStart;
			var end = e.target.selectionEnd;
			e.target.value = `${e.target.value.substring(0, start)}\t${e.target.value.substring(end)}`;
			e.target.selectionStart = e.target.selectionEnd = start + 1;
		}
	});
}

async function main() {
	set_last_theme_state();
	load_hidden_file_state(nav_window);
	load_item_display_state(nav_window);
	var get_users = nav_window.get_system_users();
	var get_groups = nav_window.get_system_groups();
	var refresh = nav_window.refresh();
	await get_users;
	await get_groups;
	await refresh;
	set_up_buttons();
}

main();
