import {NavFile} from "./NavFile.js";

export class NavDownloader {
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
