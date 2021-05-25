

function property_entry_html(key, value) {
	var html = '<div class="nav-property-pair">';
	html += '<span class="nav-property-pair-key">' + key + '</span>'
	html += '<span class="nav-property-pair-value">' + value + '</span>'
	html += '</div>'
	return html;
}

function format_bytes(bytes) {
	var units = [" B", " KiB", " MiB", " GiB", " TiB", " PiB"];
	var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
	var pow = Math.pow(1024, index);
	var formatted = bytes / pow;
	return formatted.toFixed(2).toString() + units[index];
}

function format_time(timestamp) {
	var date = new Date(timestamp * 1000);
	console.log(date);
	return date.toLocaleString();
}

class NavEntry {
	constructor(/*string or array*/ path, /*dict*/ stat) {
		if(typeof path == 'string')
			this.path = path.split('/').splice(1);
		else
			this.path = path;
		this.dom_element = document.createElement("div");
		this.dom_element.classList.add("nav-item");
		let icon = this.dom_element.nav_item_icon = document.createElement("div");
		let title = this.dom_element.nav_item_title = document.createElement("div");
		title.classList.add("nav-item-title");
		title.innerText = this.filename();
		this.dom_element.appendChild(icon);
		this.dom_element.appendChild(title);
		this.stat = stat;
		this.dom_element.addEventListener("click", this)
	}
	destroy() {
		while(this.dom_element.firstChild){
			this.dom_element.removeChild(this.dom_element.firstChild);
		}
		if(this.dom_element.parentElement)
			this.dom_element.parentElement.removeChild(this.dom_element);
	}
	filename() {
		var name = this.path[this.path.length -1];
		if(name === "")
			name = "/";
		return name;
	}
	path_str() {
		return "/" + this.path.join('/');
	}
	show() {
		document.getElementById("nav-contents-view").appendChild(this.dom_element);
	}
	get_properties() {
		return this.stat;
	}
	show_properties(){
		var html =  '<div class="nav-info-column-filename">' + this.filename() + '</div>';
		html += property_entry_html("Mode", this.stat["mode-str"]);
		html += property_entry_html("Owner", this.stat["owner"] + " (" + this.stat["uid"] + ")");
		html += property_entry_html("Group", this.stat["group"] + " (" + this.stat["gid"] + ")");
		html += property_entry_html("Size", format_bytes(this.stat["size"]));
		html += property_entry_html("Accessed", format_time(this.stat["atime"]));
		html += property_entry_html("Modified", format_time(this.stat["mtime"]));
		html += property_entry_html("Created", format_time(this.stat["ctime"]));
		document.getElementById("nav-info-column").innerHTML = html;
	}
}

class NavFile extends NavEntry {
	constructor(/*string or array*/ path, /*dict*/ stat) {
		super(path, stat);
		this.nav_type = "file";
		this.dom_element.nav_item_icon.classList.add("nav-file-icon");
	}
	handleEvent(e) {
		switch(e.type){
			case "click":
				this.show_properties();
				e.stopPropagation();
				break;
		}
	}
}

class NavDir extends NavEntry {
	constructor(/*string or array*/ path, /*dict*/ stat, nav_window_ref) {
		super(path, stat);
		this.nav_type = "dir";
		this.dom_element.nav_item_icon.classList.add("nav-dir-icon");
		this.nav_window_ref = nav_window_ref;
		this.double_click = false;
	}
	handleEvent(e) {
		switch(e.type){
			case "click":
				if(this.double_click)
					this.nav_window_ref.cd(this);
				else{ // single click
					this.show_properties();
					this.double_click = true;
					if(this.timeout)
						clearTimeout(this.timeout)
					this.timeout = setTimeout(() => {
						this.double_click = false;
					}, 500);
				}
				e.stopPropagation();
				break;
		}
	}
	async get_children(nav_window_ref) {
		var children = [];
		var data = await cockpit.spawn(["/usr/share/cockpit/navigator/scripts/ls.py", this.path_str()], {err:"ignore"});
		var response = JSON.parse(data);
		this.stat = response["."]["stat"];
		var entries = response["children"];
		entries.forEach(entry => {
			var filename = entry["filename"];
			var path = (this.path.length >= 1 && this.path[0]) ? [... this.path, filename] : [filename];
			var stat = entry["stat"];
			if(entry["isdir"])
				children.push(new NavDir(path, stat, nav_window_ref));
			else
				children.push(new NavFile(path, stat));
		});
		children.sort((first, second) => {
			if(first.nav_type === second.nav_type){
				return first.filename().localeCompare(second.filename());
			}
			if(first.nav_type === "dir")
				return -1;
			return 1;
		})
		return children;
	}
}

class NavWindow {
	constructor() {
		this.path_stack = [new NavDir("/", this)];
		this.entries = [];
		this.window = document.getElementById("nav-contents-view");
		this.window.addEventListener("click", this);
	}
	handleEvent(e) {
		switch(e.type){
			case "click":
				this.show_pwd_properties();
				break;
		}
	}
	async refresh() {
		var files = await this.pwd().get_children(this);
		while(this.entries.length){
			var entry = this.entries.pop();
			entry.destroy();
		}
		files.forEach(file => {
			file.show();
			this.entries.push(file);
		});
		document.getElementById("pwd").innerText = this.pwd().path_str();
	}
	pwd() {
		return this.path_stack[this.path_stack.length - 1];
	}
	cd(new_dir) {
		this.path_stack.push(new_dir);
		this.refresh().catch(() => {
			this.path_stack.pop();
			this.refresh();
			window.alert(new_dir.path_str() + " is inaccessible.");
		});
	}
	up() {
		if(this.path_stack.length > 1)
			this.path_stack.pop();
		this.refresh();
	}
	show_pwd_properties() {
		this.pwd().show_properties();
	}
}

let nav_window = new NavWindow();

function set_up_buttons() {
	document.getElementById("nav-up-dir-btn").addEventListener("click", nav_window.up.bind(nav_window));
}

async function main() {
	await nav_window.refresh();
	set_up_buttons();
}

main();
