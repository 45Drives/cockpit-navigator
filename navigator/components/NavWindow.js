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
import { NavDir } from "./NavDir.js";
import { NavContextMenu } from "./NavContextMenu.js";
import { NavDragDrop } from "./NavDragDrop.js";
import { SortFunctions } from "./SortFunctions.js";
import { ModalPrompt } from "./ModalPrompt.js";
import { format_bytes, format_permissions } from "../functions.js";

export class NavWindow {
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
		window.addEventListener("keydown", this);

		this.context_menu = new NavContextMenu("nav-context-menu", this);

		this.clip_board = [];

		this.uploader = new NavDragDrop(this.window, this);

		this.sort_function = new SortFunctions();

		this.modal_prompt = new ModalPrompt();

		this.dangerous_dirs = [
			"/",
			"/bin",
			"/boot",
			"/dev",
			"/etc",
			"/home",
			"/lib",
			"/lib32",
			"/lib64",
			"/mnt",
			"/opt",
			"/proc",
			"/root",
			"/run",
			"/sbin",
			"/srv",
			"/sys",
			"/tmp",
			"/usr",
			"/usr/bin",
			"/usr/include",
			"/usr/lib",
			"/usr/lib32",
			"/usr/lib64",
			"/usr/sbin",
			"/usr/share",
			"/var"
		];
	}

	/**
	 * 
	 * @param {Event} e 
	 */
	handleEvent(e) {
		switch (e.type) {
			case "click":
				if (e.target === this.window) {
					this.reset_selection();
					this.show_selected_properties();
				}
				break;
			case "contextmenu":
				this.context_menu.show(e, this.pwd());
				e.preventDefault();
				break;
			case "keydown":
				if (e.keyCode === 46 && e.target === document.body) {
					this.delete_selected();
				} else if (e.keyCode === 65 && e.ctrlKey) {
					this.select_all();
					e.preventDefault();
				} else if (e.keyCode === 27) {
					this.reset_selection();
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
			this.modal_prompt.alert(e);
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
		this.reset_selection();
		this.show_selected_properties();
		document.getElementById("nav-num-dirs").innerText = `${num_dirs} Director${(num_dirs === 1)? "y" : "ies"}`;
		document.getElementById("nav-num-files").innerText = `${num_files} File${(num_files === 1)? "" : "s"}`;
		document.getElementById("nav-num-bytes").innerText = format_bytes(bytes_sum);
		this.stop_load();
		this.set_nav_button_state();
	}

	set_nav_button_state() {
		document.getElementById("nav-back-btn").disabled = (this.path_stack_index === 1);
		document.getElementById("nav-forward-btn").disabled = (this.path_stack_index === this.path_stack.length - 1);
		document.getElementById("nav-up-dir-btn").disabled = (this.pwd().path_str() === "/");
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
	
	clear_selected() {
		if (this.editing_permissions)
			return;
		for (let entry of this.selected_entries) {
			entry.unstyle_selected();
		}
		this.selected_entries.clear();
	}

	/**
	 * 
	 * @param {NavEntry} entry 
	 */
	select_one(entry) {
		if (this.editing_permissions)
			return;
		entry.style_selected();
		this.selected_entries.add(entry);
	}

	deselect_one(entry) {
		if (this.editing_permissions)
			return;
		entry.unstyle_selected();
		this.selected_entries.delete(entry);
	}

	/**
	 * 
	 * @param {NavEntry} start 
	 * @param {NavEntry} end 
	 */
	select_range(start, end) {
		if (this.editing_permissions)
			return;
		let start_ind = this.entries.indexOf(start);
		let end_ind = this.entries.indexOf(end);
		if (start_ind === -1 || end_ind === -1)
			return;
		if (end_ind === start_ind)
			this.select_one(start);
		else if (end_ind < start_ind)
			[start_ind, end_ind] = [end_ind, start_ind];
		for (let i = start_ind; i <= end_ind; i++) {
			let entry = this.entries[i];
			if (entry.visible && (!entry.is_hidden_file || this.show_hidden))
				this.select_one(entry);
		}
	}

	reset_selection() {
		if (this.editing_permissions)
			return;
		this.clear_selected();
		this.select_one(this.pwd());
		this.last_selected_entry = null;
		this.update_selection_info();
		var edit_btn = document.getElementById("nav-edit-contents-btn");
		edit_btn.keep_disabled = edit_btn.disabled = true;
		edit_btn.onclick = () => {};
	}

	/**
	 * 
	 * @param {NavEntry} target 
	 * @param {Boolean} shift 
	 * @param {Boolean} ctrl 
	 */
	set_selected(target, shift, ctrl) {
		if (this.editing_permissions)
			return;
		if (!ctrl && !shift)
			this.clear_selected();
		if (!shift || !this.last_selected_entry)
			this.last_selected_entry = target;
		if (shift) {
			if (!ctrl)
				this.clear_selected();
			this.select_range(
				this.last_selected_entry ?? this.entries[0],
				target
			);
		} else if (ctrl && this.selected_entries.has(target)) {
			this.deselect_one(target)
		} else {
			this.select_one(target);
		}
		this.update_selection_info();

		var edit_btn = document.getElementById("nav-edit-contents-btn")
		if (target.nav_type === "file") {
			edit_btn.keep_disabled = edit_btn.disabled = false;
			edit_btn.onclick = () => {
				target.open();
			};
		} else {
			edit_btn.onclick = () => {};
			edit_btn.keep_disabled = edit_btn.disabled = true;
		}
	}

	select_all() {
		if (this.editing_permissions)
			return;
		this.clear_selected();
		this.select_range(this.entries[0], this.entries[this.entries.length - 1]);
		this.update_selection_info();
	}

	selected_entry() {
		return [...this.selected_entries][this.selected_entries.size - 1];
	}

	none_selected() {
		return this.selected_entries.size === 1 && this.selected_entry() === this.pwd();
	}
	
	show_selected_properties() {
		this.selected_entry()?.show_properties?.();
	}

	update_selection_info() {
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
	}

	async show_edit_selected() {
		var dangerous_selected = [];
		for (let i of this.selected_entries) {
			var path = i.path_str();
			if (this.dangerous_dirs.includes(path)) {
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
			if (!await this.modal_prompt.confirm(
				"Warning: editing " +
				dangerous_selected_str +
				" can be dangerous.",
				"Are you sure?",
				true
			)) {
				return;
			}
		} else if (this.selected_entries.size > 1) {
			if (!await this.modal_prompt.confirm(
				"Warning: editing permissions for " +
				this.selected_entries.size +
				" files.",
				"Are you sure?",
				true
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
				targets.push(target.filename);
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
		this.editing_permissions = true;
	}
	
	hide_edit_selected() {
		document.getElementById("nav-show-properties").style.display = "flex";
		document.getElementById("nav-edit-properties").style.display = "none";
		this.editing_permissions = false;
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
		text += " (" + (new_perms & 0o777).toString(8).padStart(3, '0') + ")";
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
					this.modal_prompt.alert(e);
				}
			}
			if (this.changed_mode && (new_perms & 0o777) !== (entry.stat["mode"] & 0o777)) {
				try {
					await entry.chmod(new_perms);
				} catch(e) {
					this.modal_prompt.alert(e);
				}
			}
		}
		this.refresh();
		this.hide_edit_selected();
	}

	async delete_selected() {
		if (await this.check_if_dangerous("delete"))
			return;
		var prompt = "";
		if (this.selected_entries.size > 1) {
			prompt = "Deleting " + this.selected_entries.size + " files.";
		} else {
			prompt = "Deleting `" + this.selected_entry().path_str() + "`.";
		}
		if (!await this.modal_prompt.confirm(prompt, "This cannot be undone. Are you sure?", true)) {
			return;
		}
		this.start_load();
		for (let target of this.selected_entries) {
			try {
				await target.rm();
			} catch(e) {
				this.modal_prompt.alert(e);
			}
		}
		this.stop_load();
		this.refresh();
	}

	async mkdir() {
		let response = await this.modal_prompt.prompt("Creating Directory",
			{
				new_name: {
					label: "Name: ",
					type: "text"
				}
			}
		);
		if (response === null)
			return;
		var new_dir_name = response.new_name;
		if (new_dir_name === "") {
			this.modal_prompt.alert("Directory name can't be empty.");
			return;
		}
		if (new_dir_name.includes("/")) {
			this.modal_prompt.alert("Directory name can't contain `/`.");
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
			this.modal_prompt.alert(e);
		}
		this.refresh();
	}

	async touch() {
		let response = await this.modal_prompt.prompt("Creating File",
			{
				new_name: {
					label: "Name: ",
					type: "text"
				}
			}
		);
		if (response === null)
			return;
		var new_file_name = response.new_name;
		if (new_file_name === "") {
			this.modal_prompt.alert("File name can't be empty.");
			return;
		}
		if (new_file_name.includes("/")) {
			this.modal_prompt.alert("File name can't contain `/`.");
			return;
		}
		var promise = new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				["/usr/share/cockpit/navigator/scripts/touch.py3", this.pwd().path_str() + "/" + new_file_name],
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
			this.modal_prompt.alert(e);
		}
		this.refresh();
	}

	async ln(default_target = "") {
		let response = await this.modal_prompt.prompt("Creating Symbolic Link",
			{
				target: {
					label: "Target: ",
					type: "text",
					default: default_target
				},
				name: {
					label: "Name: ",
					type: "text"
				}
			}
		);
		if (response === null)
			return;
		var link_target = response.target;
		if (link_target === "") {
			this.modal_prompt.alert("Link target can't be empty.");
			return;
		}
		var link_name = response.name;
		if (link_name === "") {
			this.modal_prompt.alert("Link name can't be empty.");
			return;
		}
		if (link_name.includes("/")) {
			this.modal_prompt.alert("Link name can't contain `/`.");
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
			this.modal_prompt.alert(e);
		}
		this.refresh();
	}

	async cut() {
		if (await this.check_if_dangerous("move"))
			return;
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
		var cmd = ["/usr/share/cockpit/navigator/scripts/paste.py3"];
		var dest = this.pwd().path_str();
		if (this.copy_or_move === "move") {
			cmd.push("-m");
		}
		cmd.push(this.paste_cwd);
		for (let item of this.clip_board) {
			cmd.push(item.path_str());
		}
		cmd.push(dest);
		this.clip_board.length = 0; // clear clipboard
		var promise = new Promise((resolve, reject) => {
			var proc = cockpit.spawn(
				cmd,
				{superuser: "try", err: "ignore"}
			);
			proc.stream(async (data) => {
				var payload = JSON.parse(data);
				if (payload["wants-response"]) {
					if (payload.hasOwnProperty("conflicts")) {
						let requests = {};
						for (let conflict of payload["conflicts"]) {
							requests[conflict[0]] = {
								label: conflict[1],
								type: "checkbox",
								default: false
							}
						}
						this.stop_load();
						let responses = await this.modal_prompt.prompt("Overwrite?", requests);
						this.start_load();
						if (responses === null) {
							proc.input(JSON.stringify("abort") + "\n");
							return;
						}
						let keepers = [];
						for (let response of Object.keys(responses)) {
							if (responses[response])
								keepers.push(response)
						}
						proc.input(JSON.stringify(keepers) + "\n", true);
					} else {
						var user_response = await this.modal_prompt.confirm(payload["message"]);
						proc.input(JSON.stringify(user_response) + "\n", true);
					}
				} else {
					await this.modal_prompt.alert(payload["message"]);
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
			this.modal_prompt.alert(e);
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
		e.stopPropagation();
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
		var buttons = document.getElementsByClassName("disable-while-loading");
		for (let button of buttons) {
			button.disabled = true;
		}
	}

	stop_load() {
		document.getElementById("nav-loader-container").style.display = "none";
		var buttons = document.getElementsByClassName("disable-while-loading");
		for (let button of buttons) {
			if (!button.keep_disabled)
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
			passwd_entries.sort((first, second) => {
				return first.split(":")[0].localeCompare(second.split(":")[0]);
			});
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
			group_entries.sort((first, second) => {
				return first.split(":")[0].localeCompare(second.split(":")[0]);
			});
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
		this.set_nav_button_state();
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
		let search_func;
		if (search_name[0] === '*')
			search_func = (entry) => entry.filename.toLowerCase().includes(search_name.slice(1).toLowerCase());
		else
			search_func = (entry) => entry.filename.toLowerCase().startsWith(search_name.toLowerCase());
		this.entries.forEach((entry) => {
			if (search_func(entry))
				entry.show();
			else
				entry.hide();
		});
	}

	/**
	 * 
	 * @param {string} verb 
	 * @returns {Promise<boolean>}
	 */
	check_if_dangerous(verb) {
		return new Promise(async (resolve, reject) => {
			let dangerous_selected = [];
			for (let entry of this.selected_entries) {
				let path = entry.path_str();
				if (this.dangerous_dirs.includes(path)) {
					dangerous_selected.push(path);
				}
			}
			if (dangerous_selected.length) {
				await this.modal_prompt.alert(
					`Cannot ${verb} system-critical paths.`,
					`The following path(s) are very dangerous to ${verb}: ${dangerous_selected.join(", ")}. If you think you need to ${verb} them, use the terminal.`
				);
				resolve(true);
			} else {
				resolve(false);
			}
		});
	}
}
