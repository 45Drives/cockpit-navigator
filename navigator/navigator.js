

class NavEntry {
	constructor(/*string or array*/ path) {
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
	}
	destroy() {
		while(this.dom_element.firstChild){
			this.dom_element.removeChild(this.dom_element.firstChild);
		}
		if(this.dom_element.parentElement)
			this.dom_element.parentElement.removeChild(this.dom_element);
	}
	filename() {
		return this.path[this.path.length -1];
	}
	path_str() {
		return "/" + this.path.join('/');
	}
	show() {
		document.getElementById("nav-contents-view").appendChild(this.dom_element);
	}
}

class NavFile extends NavEntry {
	constructor(/*string or array*/ path) {
		super(path);
		this.nav_type = "file";
		this.dom_element.nav_item_icon.classList.add("nav-file-icon");
	}
}

class NavDir extends NavEntry {
	constructor(/*string or array*/ path, nav_window_ref) {
		super(path);
		this.nav_type = "dir";
		this.dom_element.nav_item_icon.classList.add("nav-dir-icon");
		this.nav_window_ref = nav_window_ref;
		this.dom_element.nav_item_icon.addEventListener("click", this)
	}
	handleEvent(e) {
		switch(e.type){
			case "click":
				this.nav_window_ref.cd(this);
				break;
		}
	}
	async get_children(nav_window_ref) {
		var children = [];
		var data = await cockpit.spawn(["/usr/share/cockpit/navigator/scripts/ls.py", this.path_str()], {err:"ignore"});
		var entries = JSON.parse(data);
		entries.forEach(entry => {
			var filename = entry["filename"];
			var path = (this.path.length >= 1 && this.path[0]) ? [... this.path, filename] : [filename];
			if(entry["isdir"])
				children.push(new NavDir(path, nav_window_ref));
			else
				children.push(new NavFile(path));
		});
		children.sort((first, second) => {
			if(first.nav_type === second.nav_type)
				return 0;
			if(first.nav_type == "dir")
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
