import {FileUpload} from "./FileUpload.js";
import {NavWindow} from "./NavWindow.js";

export class NavDragDrop {
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
