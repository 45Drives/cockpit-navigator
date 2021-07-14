import {NavEntry} from "./NavEntry.js";
import {NavFile, NavFileLink} from "./NavFile.js";
import {NavDir, NavDirLink} from "./NavDir.js";
import {NavDownloader} from "./NavDownloader.js";

export class NavContextMenu {
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
		let response = await this.nav_window_ref.modal_prompt.prompt("Renaming " + this.target.filename(),
			{
				new_name: {
					label: "New Name: ",
					type: "text",
					default: this.target.filename()
				}
			}
		);
		if (response === null)
			return;
		var new_name = response.new_name;
		if (new_name.includes("/")) {
			this.nav_window_ref.modal_prompt.alert("File name can't contain `/`.");
			return;
		}
		try {
			await this.target.mv(new_name);
		} catch(e) {
			this.nav_window_ref.modal_prompt.alert(e);
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
		if (this.nav_window_ref.selected_entries.size === 1 && !(this.nav_window_ref.selected_entry() instanceof NavDir)) {
			download_target = this.nav_window_ref.selected_entry();
		} else {
			this.nav_window_ref.start_load();
			var result;
			try {
				result = await this.zip_for_download();
			} catch(e) {
				this.nav_window_ref.stop_load();
				this.nav_window_ref.modal_prompt.alert(e.message);
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
		if (!this.nav_window_ref.none_selected()) {
			if (event.shiftKey || event.ctrlKey)
				this.nav_window_ref.set_selected(target, event.shiftKey, event.ctrlKey);
		} else {
			this.nav_window_ref.set_selected(target, false, false);
		}
		for (let option of Object.keys(this.menu_options)) {
			this.menu_options[option].style.display = "flex"; // show all
		}
		// selectively hide options based on context
		if (this.nav_window_ref.none_selected()) {
			this.menu_options["copy"].style.display = "none";
			this.menu_options["cut"].style.display = "none";
			this.menu_options["delete"].style.display = "none";
			this.menu_options["download"].style.display = "none";
		}
		if (this.nav_window_ref.selected_entries.size > 1) {
			this.menu_options["rename"].style.display = "none";
		} else {
			if (target instanceof NavDirLink || target instanceof NavFileLink)
				this.menu_options["download"].style.display = "none";
		}
		if (!this.nav_window_ref.clip_board.length)
			this.menu_options["paste"].style.display = "none";
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
