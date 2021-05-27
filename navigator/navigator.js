function property_entry_html(key, value) {
	var html = '<div class="nav-property-pair">';
	html += '<span class="nav-property-pair-key">' + key + '</span>';
	html += '<span class="nav-property-pair-value">' + value + '</span>';
	html += '</div>';
	return html;
}

function format_bytes(bytes) {
	if (bytes === 0)
		return "0 B";
	var units = [" B", " KiB", " MiB", " GiB", " TiB", " PiB"];
	var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	var pow = Math.pow(1024, index);
	var formatted = bytes / pow;
	return formatted.toFixed(2).toString() + units[index];
}

function format_time(timestamp) {
	var date = new Date(timestamp * 1000);
	return date.toLocaleString();
}

function format_permissions(/*int*/ mode) {
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

/*
 *	Code to change theme
 */

const toggleSwitch = document.getElementById("toggle-theme");

function switchTheme(e) {
	if (e.target.checked) {
		document.documentElement.setAttribute("data-theme", "dark");
	} else {
		document.documentElement.setAttribute("data-theme", "light");
	}
}

toggleSwitch.addEventListener("change", switchTheme, false);

/* cephfs_dir_stats
 * Receives: path to folder
 * Does: Tries command with --json flag at path to folder. If
 * command fails and gives an error then catch that error
 * Returns: JSON object or nothing
 */
async function cephfs_dir_stats(path) {
	try {
		var proc = await cockpit.spawn(
			["cephfs-dir-stats", "-j", path],
			{err: "ignore",}
		);
		return JSON.parse(proc.replace(/\[|\]/g, ""));
	} catch {
		return [];
	}
}

/* in_json
 * Receives: A boolean to see if key is in JSON object
 * and the JSON objects value if it exists
 * Does: Checks if JSON key exists; if so, return the
 * value of the key, if not, return the string "N/A"
 * Returns: The value of key or "N/A"
 */
function in_json(is_key, value) {
	if (is_key) {
		return value;
	} else {
		return "N/A";
	}
}

class NavEntry {
	constructor(/*string or array*/ path, /*dict*/ stat, /*NavWindow*/ nav_window_ref) {
		this.nav_window_ref = nav_window_ref;
		if (typeof path == "string")
			this.path = path.split("/").splice(1);
		else
			this.path = path;
		this.dom_element = document.createElement("div");
		this.dom_element.classList.add("nav-item");
		let icon = this.dom_element.nav_item_icon = document.createElement("i");
		icon.classList.add("nav-file-icon");
		let title = this.dom_element.nav_item_title = document.createElement("div");
		title.classList.add("nav-item-title");
		title.innerText = this.filename();
		this.dom_element.appendChild(icon);
		this.dom_element.appendChild(title);
		this.stat = stat;
		this.dom_element.addEventListener("click", this);
	}
	handleEvent(e) {
		switch (e.type) {
			case "click":
				this.show_properties();
				this.nav_window_ref.set_selected(this);
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
	filename() {
		var name = this.path[this.path.length - 1];
		if (name === "")
			name = "/";
		return name;
	}
	path_str() {
		return "/" + this.path.join("/");
	}
	parent_dir() {
		return this.path.slice(0, this.path.length - 1);
	}
	show() {
		document.getElementById("nav-contents-view").appendChild(this.dom_element);
	}
	get_properties() {
		return this.stat;
	}
	get_permissions() {
		return this.stat["mode"] & 0o777;
	}
	async chmod(/*int*/ new_perms) {
		var proc = cockpit.spawn(
			["chmod", (new_perms & 0o777).toString(8), this.path_str()],
			{superuser: "try", err: "out"}
		);
		proc.fail((e, data) => {
			window.alert(data);
		});
		await proc;
	}
	async chown(/*string*/ new_owner, /*string*/ new_group) {
		var proc = cockpit.spawn(
			["chown", [new_owner, new_group].join(":"), this.path_str()],
			{superuser: "try", err: "out"}
		);
		proc.fail((e, data) => {
			window.alert(data);
		});
		await proc;
	}
	async mv(/*string*/ new_path) {
		var proc = cockpit.spawn(
			["mv", "-n", this.path_str(), [this.nav_window_ref.pwd().path_str(), new_path].join("/")],
			{superuser: "try", err: "out"}
		);
		proc.fail((e, data) => {
			window.alert(data);
		});
		await proc;
	}
	show_properties(/*string*/ extra_properties = "") {
		var selected_name_fields = document.getElementsByClassName("nav-info-column-filename");
		for (let elem of selected_name_fields) {
			elem.innerText = this.filename();
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
		document.getElementById("nav-edit-filename").value = this.filename();
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
	constructor(/*string or array*/ path, /*dict*/ stat, nav_window_ref) {
		super(path, stat, nav_window_ref);
		this.nav_type = "file";
		this.dom_element.nav_item_icon.classList.add("fas", "fa-file");
		this.double_click = false;
	}
	handleEvent(e) {
		switch(e.type){
			case "click":
				if(this.double_click)
					this.show_edit_file_contents();
				else{ // single click
					this.double_click = true;
					if(this.timeout)
						clearTimeout(this.timeout)
					this.timeout = setTimeout(() => {
						this.double_click = false;
					}, 500);
				}
				break;
		}
		super.handleEvent(e);
	}
	async rm() {
		var proc = cockpit.spawn(
			["rm", "-f", this.path_str()],
			{superuser: "try", err: "out"}
		);
		proc.fail((e, data) => {
			window.alert(data);
		});
		await proc;
	}
	async show_edit_file_contents() {
		var proc_output = await cockpit.spawn(["file", "--mime-type", this.path_str()], {superuser: "try"});
		var fields = proc_output.split(':');
		var type = fields[1].trim();
		if(!(type.match(/^text/) || type.match(/^inode\/x-empty$/) || this.stat["size"] === 0)){
			if(!window.confirm("File is of type `" + type + "`. Are you sure you want to edit it?"))
				return;
		}
		var contents = await cockpit.spawn(["cat", this.path_str()], {superuser: "try"});
		document.getElementById("nav-edit-contents-textarea").value = contents;
		document.getElementById("nav-cancel-edit-contents-btn").onclick = this.hide_edit_file_contents.bind(this);
		document.getElementById("nav-continue-edit-contents-btn").onclick = this.write_to_file.bind(this);
		document.getElementById("nav-edit-contents-header").innerText = "Editing " + this.path_str();
		document.getElementById("nav-contents-view").style.display = "none";
		document.getElementById("nav-edit-contents-view").style.display = "flex";
	}
	async write_to_file() {
		var new_contents = document.getElementById("nav-edit-contents-textarea").value;
		await cockpit.script("echo -n \"$1\" > $2", [new_contents, this.path_str()], {superuser: "try"});
		this.nav_window_ref.refresh();
		this.hide_edit_file_contents();
	}
	hide_edit_file_contents() {
		document.getElementById("nav-edit-contents-view").style.display = "none";
		document.getElementById("nav-contents-view").style.display = "flex";
	}
}

class NavDir extends NavEntry {
	constructor(/*string or array*/ path, /*dict*/ stat, nav_window_ref) {
		super(path, stat, nav_window_ref);
		this.nav_type = "dir";
		this.dom_element.nav_item_icon.classList.add("fas", "fa-folder");
		this.double_click = false;
		this.ceph_stats = [];
		cephfs_dir_stats(this.path_str()).then((data) => (this.ceph_stats = data));
	}
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
	async get_children(nav_window_ref, no_alert = false) {
		var children = [];
		var proc = cockpit.spawn(
			["/usr/share/cockpit/navigator/scripts/ls.py", this.path_str()],
			{err:"out", superuser: "try"}
		);
		proc.fail((e, data) => {
			if(!no_alert)
				window.alert(data);
		});
		var data = await proc;
		var response = JSON.parse(data);
		this.stat = response["."]["stat"];
		var entries = response["children"];
		entries.forEach((entry) => {
			var filename = entry["filename"];
			var path = (this.path.length >= 1 && this.path[0]) ? [...this.path, filename] : [filename];
			var stat = entry["stat"];
			if (entry["isdir"])
				children.push(new NavDir(path, stat, nav_window_ref));
			else
				children.push(new NavFile(path, stat, nav_window_ref));
		});
		children.sort((first, second) => {
			if (first.nav_type === second.nav_type) {
				return first.filename().localeCompare(second.filename());
			}
			if (first.nav_type === "dir")
				return -1;
			return 1;
		});
		return children;
	}
	async rm() {
		var proc = cockpit.spawn(
			["rmdir", this.path_str()],
			{superuser: "try", err: "out"}
		);
		proc.fail((e, data) => {
			window.alert(data);
		});
		await proc;
	}
	show_properties() {
		var extra_properties = "";
		// See if a JSON object exists for folder we are currently looking at
		if (this.ceph_stats.length !== 0) {
			extra_properties +=
				'<div class="vertical-spacer"></div><h2 class="nav-info-column-filename">Ceph Status</h2>';
			extra_properties += property_entry_html(
				"Files",
				in_json(this.ceph_stats.hasOwnProperty("files"), this.ceph_stats.files)
			);
			extra_properties += property_entry_html(
				"Directories",
				in_json(this.ceph_stats.hasOwnProperty("subdirs"), this.ceph_stats.subdirs)
			);
			extra_properties += property_entry_html(
				"Recursive files",
				in_json(this.ceph_stats.hasOwnProperty("rfiles"), this.ceph_stats.rfiles)
			);
			extra_properties += property_entry_html(
				"Recursive directories",
				in_json(this.ceph_stats.hasOwnProperty("rsubdirs"), this.ceph_stats.rsubdirs)
			);
			extra_properties += property_entry_html(
				"Total size",
				in_json(this.ceph_stats.hasOwnProperty("rbytes"), this.ceph_stats.rbytes)
			);
			extra_properties += property_entry_html(
				"Layout pool",
				in_json(this.ceph_stats.hasOwnProperty("layout.pool"), this.ceph_stats["layout.pool"])
			);
			extra_properties += property_entry_html(
				"Max files",
				in_json(this.ceph_stats.hasOwnProperty("max_files"), this.ceph_stats.max_files)
			);
			extra_properties += property_entry_html(
				"Max bytes",
				in_json(this.ceph_stats.hasOwnProperty("max_bytes"), this.ceph_stats.max_bytes)
			);
		}
		super.show_properties(extra_properties);
	}
}

class NavWindow {
	constructor() {
		this.path_stack = [new NavDir("/", this)];
		this.path_stack_index = this.path_stack.length - 1;
		this.selected_entry = this.pwd();
		this.entries = [];
		this.window = document.getElementById("nav-contents-view");
		this.window.addEventListener("click", this);
	}
	handleEvent(e) {
		switch (e.type) {
			case "click":
				this.set_selected(this.pwd());
				this.show_selected_properties();
				break;
		}
	}
	async refresh() {
		var files = await this.pwd().get_children(this);
		while (this.entries.length) {
			var entry = this.entries.pop();
			entry.destroy();
		}
		files.forEach((file) => {
			file.show();
			this.entries.push(file);
		});
		document.getElementById("pwd").value = this.pwd().path_str();
		this.set_selected(this.pwd());
		this.show_selected_properties();
	}
	pwd() {
		return this.path_stack[this.path_stack_index];
	}
	cd(new_dir) {
		this.path_stack.length = this.path_stack_index + 1;
		this.path_stack.push(new_dir);
		this.path_stack_index = this.path_stack.length - 1;
		this.refresh().catch(() => {
			this.back();
		});
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
	show_selected_properties() {
		this.selected_entry.show_properties();
	}
	set_selected(/*NavEntry*/ entry) {
		this.hide_edit_selected();
		this.selected_entry.dom_element.classList.remove("nav-item-selected");
		if (this.selected_entry.nav_type === "dir") {
			this.selected_entry.dom_element.nav_item_icon.classList.remove("fa-folder-open");
			this.selected_entry.dom_element.nav_item_icon.classList.add("fa-folder");
		}
		this.selected_entry = entry;
		this.selected_entry.dom_element.classList.add("nav-item-selected");
		if (this.selected_entry.nav_type === "dir") {
			this.selected_entry.dom_element.nav_item_icon.classList.remove("fa-folder");
			this.selected_entry.dom_element.nav_item_icon.classList.add("fa-folder-open");
		}
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
		if (dangerous_dirs.includes(this.selected_entry.path_str())) {
			if (
				!window.confirm(
					"Warning: editing `" +
					this.selected_entry.path_str() +
					"` can be dangerous. Are you sure?"
				)
			) {
				return;
			}
		}
		this.selected_entry.populate_edit_fields();
		this.update_permissions_preview();
		document.getElementById("nav-edit-properties").style.display = "block";
		document.getElementById("nav-show-properties").style.display = "none";
	}
	hide_edit_selected() {
		document.getElementById("nav-show-properties").style.display = "block";
		document.getElementById("nav-edit-properties").style.display = "none";
	}
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
	}
	async apply_edit_selected() {
		// do mv last so the rest don't fail from not finding path
		var new_owner = document.getElementById("nav-edit-owner").value;
		var new_group = document.getElementById("nav-edit-group").value;
		if (
			new_owner !== this.selected_entry.stat["owner"] ||
			new_group !== this.selected_entry.stat["group"]
		) {
			await this.selected_entry.chown(new_owner, new_group).catch(/*ignore, caught in chown*/);
		}
		var new_perms = this.get_new_permissions();
		if ((new_perms & 0o777) !== (this.selected_entry.stat["mode"] & 0o777)) {
			await this.selected_entry.chmod(new_perms).catch(/*ignore, caught in chmod*/);
		}
		var new_name = document.getElementById("nav-edit-filename").value;
		if (new_name !== this.selected_entry.filename()) {
			await this.selected_entry.mv(new_name).catch(/*ignore, caught in mv*/);
		}
		this.refresh();
		this.hide_edit_selected();
	}
	async delete_selected() {
		if (
			!window.confirm(
				"Deleting `" + this.selected_entry.path_str() + "` cannot be undone. Are you sure?"
			)
		) {
			return;
		}
		await this.selected_entry.rm().catch(/*ignore, caught in rm*/);
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
		var proc = cockpit.spawn(
			["mkdir", this.pwd().path_str() + "/" + new_dir_name],
			{superuser: "try", err: "out"}
		);
		proc.fail((e, data) => {
			window.alert(data);
		});
		await proc;
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
		var proc = cockpit.spawn(
			["touch", this.pwd().path_str() + "/" + new_file_name],
			{superuser: "try", err: "out"}
		);
		proc.fail((e, data) => {
			window.alert(data);
		});
		await proc;
		this.refresh();
	}
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
		console.log(parent_dir.path_str());
		var error = false;
		var objs = await parent_dir.get_children(this, true).catch(() => {error = true});
		if(error)
			return;
		objs = objs.filter((child) => {return child.nav_type === "dir"});
		while(list.firstChild)
			list.removeChild(list.firstChild);
		objs.forEach((obj) => {
			var option = document.createElement("option");
			option.value = obj.path_str();
			list.appendChild(option);
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
}

async function main() {
	await nav_window.refresh();
	set_up_buttons();
}

main();
