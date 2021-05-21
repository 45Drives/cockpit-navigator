

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
		this.dom_element.nav_item_icon.classList.add("nav-file-icon");
	}
}

class NavDir extends NavEntry {
	constructor(/*string or array*/ path) {
		super(path);
		this.dom_element.nav_item_icon.classList.add("nav-dir-icon");
	}
	async get_children() {
		var children = [];
		var data = await cockpit.spawn(["ls", "-lL", this.path_str()], {err:"out"});
		var entries = data.split("\n");
		entries = entries.splice(1, entries.length - 2);
		entries.forEach(entry => {
			var entry_array = entry.split(/\s+/);
			var filename = entry_array[entry_array.length - 1];
			if(entry[0] == 'd')
				children.push(new NavDir([... this.path, filename]));
			else
				children.push(new NavFile([... this.path, filename]));
		});
		return children;
	}
}

class NavWindow {
	constructor() {
		this.path_stack = [new NavDir("/")];
		this.entries = [];
	}
	async refresh() {
		while(this.entries.length){
			var entry = this.entries.pop();
			entry.destroy();
		}
		var files = await this.pwd().get_children();
		files.forEach(file => {
			file.show();
			this.entries.push(file);
		});
	}
	pwd() {
		return this.path_stack[this.path_stack.length - 1];
	}
}

var nav_window = new NavWindow();

async function main() {
	nav_window.refresh();
}

main();

// setTimeout(function(){
// 	while(files.length){
// 		var file = files.pop();
// 		file.destroy();
// 	}
// }, 5000);