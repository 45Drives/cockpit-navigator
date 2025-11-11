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

import { format_time_remaining } from "../functions.js";
import { ModalPrompt } from "./ModalPrompt.js";

const MAX_CONCURRENT_UPLOADS = 6;
const CHUNK_SIZE = 10 * 1024 * 1024;

const gActiveUploads = new Set();

window.addEventListener("beforeunload", (e) => {
	if (gActiveUploads.size) {
		e.preventDefault();
		return "";
	}
});

class Waiter {
	constructor() {
		this.unblock = () => { };
	}
	block() {
		return new Promise(resolve => {
			this.unblock = resolve;
		});
	}
}

class LineBufferer {
	constructor() {
		this.buffer = "";
		this.decoder = new TextDecoder("utf-8");
		new TextDecoderStream();
	}

	get_lines(raw) {
		const str = this.buffer + this.decoder.decode(raw);
		const i = str.lastIndexOf("\n");
		if (i === -1) {
			// no newline found
			this.buffer = str;
			return [];
		}
		const lines = str.slice(0, i);
		this.buffer = str.slice(i + 1); // store remainder for next call
		return lines.trim().split("\n");
	}

	get_last_line(raw) {
		const str = this.buffer + this.decoder.decode(raw);
		const end = str.lastIndexOf("\n");
		if (end === -1) {
			// no newline found
			this.buffer = str;
			return null;
		}
		let start = str.lastIndexOf("\n", end - 1);
		if (start === -1) {
			start = 0;
		}
		this.buffer = str.slice(end + 1); // store remainder for next call
		return str.slice(start, end).trim();
	}
}

/**
 * 
 * @param {File|Blob} file file to upload
 * @param {string} destination where to upload on server
 */
function uploadFile(file, destination) {
	const total_bytes = file.size;
	let bytes_sent = 0;
	let bytes_received = 0;
	let cancelled = false;
	let inflight = 0;

	const stream = file.stream();

	const stdout_bufferer = new LineBufferer();

	const waiter = new Waiter();

	const cancel = () => {
		cancelled = true;
		waiter.unblock();
	};

	const promise = (async () => {
		// superuser test
		let superuser = undefined;
		try {
			await cockpit.script('DIRNAME="$(dirname "$1")"; mkdir -p "$DIRNAME" && test -d "$DIRNAME" -a -x "$DIRNAME" -a -w "$DIRNAME"', [destination], { err: "message", binary: true, superuser });
		} catch (e) {
			console.error(e);
			superuser = 'try';
		}

		let proc = cockpit.spawn(["/usr/share/cockpit/navigator/scripts/write-chunks.py3", destination], { err: "message", binary: true, superuser });
		gActiveUploads.add(proc);

		const on_output = (raw) => {
			const received = stdout_bufferer.get_last_line(raw);
			if (received === null) {
				return;
			}
			bytes_received = parseInt(received);
			waiter.unblock();
		};

		proc.done((stdout) => {
			if (stdout.length)
				on_output(stdout);
			cancel();
		});
		proc.catch(e => {
			new ModalPrompt().alert(e.message);
			cancel();
		});
		proc.finally(() => {
			gActiveUploads.delete(proc);
		});

		if (total_bytes === 0) {
			proc.input(); // close STDIN
			return proc;
		}

		proc.stream(on_output);

		const reader = stream.getReader({ mode: "byob" });
		let buffer = new ArrayBuffer(Math.min(CHUNK_SIZE, total_bytes));

		while (!cancelled) {
			inflight = (bytes_sent - bytes_received);
			if (inflight < CHUNK_SIZE * 2) {
				const result = await reader.read(new Uint8Array(buffer));
				if (result.done) {
					break;
				}
				bytes_sent += result.value.byteLength;
				proc.input(result.value, true);
				buffer = result.value.buffer;
			} else {
				await waiter.block();
			}
		};
		proc.input(); // close STDIN

		return await proc;
	})();

	const start_time = performance.now();

	let last_stat_time = start_time;
	let last_current_bytes = 0;
	let rate_avg = null;

	const getStats = () => {
		const now = performance.now();
		const delta_t = now - last_stat_time;
		last_stat_time = now;

		const delta_b = bytes_received - last_current_bytes;
		last_current_bytes = bytes_received;

		const rate = 1000 * delta_b / delta_t;
		const alpha = 0.125;
		rate_avg = alpha * rate + ((1 - alpha) * (rate_avg ?? rate));

		const eta = (total_bytes - bytes_received) / rate_avg;

		// console.log("inflight:", inflight, "rate:", cockpit.format_bytes_per_sec(rate));

		return {
			start_time,
			/**
			 * instantaneous rate
			 */
			rate,
			/**
			 * smoothed rate
			 */
			rate_avg,
			/**
			 * ETA in seconds
			 */
			eta,
			total_bytes,
			current_bytes: bytes_received,
			cancelled,
			inflight,
		};
	};

	return {
		filename: file.name,
		promise,
		cancel,
		getStats,
	};
}

/**
 * @typedef { typeof uploadFile extends (...args: any[]) => infer U ? U : any } UploadHandle
 */

/**
 * @typedef { typeof uploadFile extends (...args: infer U) => any ? U : any } UploadArgs
 */

/**
 * 
 * @param {UploadArgs[]} uploadRequests 
 */
function uploadFiles(uploadRequests) {
	if (uploadRequests.length === 1) {
		return uploadFile(...(uploadRequests[0]));
	}
	const handles = uploadRequests.map(uploadFile);
	/**
	 * @type UploadHandle
	 */
	const handle = {
		filename: `${handles.length} files`,
		promise: Promise.allSettled(handles.map(({ promise }) => promise)),
		cancel: () => handles.forEach((h) => h.cancel()),
		getStats: () => {
			let total_bytes = 0;
			let current_bytes = 0;
			let rate = 0;
			let rate_avg = 0;
			let eta = 0;

			for (const stats of handles.map(h => h.getStats())) {
				total_bytes += stats.total_bytes;
				current_bytes += stats.current_bytes;
				rate += stats.rate;
				rate_avg += stats.rate_avg;
				eta = Math.max(eta, stats.eta);
			}

			return {
				total_bytes,
				current_bytes,
				rate,
				rate_avg,
				eta,
			};

		}
	};
	return handle;
}

/**
 * 
 * @param { UploadHandle } upload_handle 
 */
function makeUploadNotification(upload_handle) {
	const notification = document.createElement("div");
	notification.classList.add("nav-notification");

	const header = document.createElement("div");
	header.classList.add("nav-notification-header");
	header.style.display = "grid";
	header.style.gridTemplateColumns = "1fr 20px";
	header.style.gap = "5px";
	notification.appendChild(header);

	const title = document.createElement("p");
	title.innerText = "Uploading " + upload_handle.filename;
	title.title = upload_handle.filename;
	header.appendChild(title);

	const cancel_button = document.createElement("button");
	cancel_button.classList.add(..."pf-c-button pf-m-plain pf-m-danger pf-m-small".split(" "));
	cancel_button.style.justifySelf = "center";
	cancel_button.style.alignSelf = "center";
	cancel_button.title = "Cancel upload";
	cancel_button.onclick = () => {
		upload_handle.cancel();
	};
	header.appendChild(cancel_button);

	const cancel_icon = document.createElement("i");
	cancel_icon.classList.add("fa", "fa-times");
	cancel_button.appendChild(cancel_icon);

	const info = document.createElement("div");
	info.classList.add("flex-row", "space-between");
	notification.appendChild(info);

	const rate = document.createElement("div");
	rate.classList.add("monospace-sm");
	rate.innerText = "-";
	info.appendChild(rate);

	const eta = document.createElement("div");
	eta.classList.add("monospace-sm");
	eta.innerText = "-";
	info.appendChild(eta);

	const progress = document.createElement("progress");
	progress.style.width = "100%";
	notification.appendChild(progress);

	const interval = setInterval(() => {
		const stats = upload_handle.getStats();
		rate.innerText = cockpit.format_bytes_per_sec(stats.rate_avg);
		eta.innerText = format_time_remaining(stats.eta);
		progress.max = stats.total_bytes;
		progress.value = stats.current_bytes;
		cancel_button.disabled = stats.cancelled;
	}, 250);

	upload_handle.promise.finally(() => {
		clearInterval(interval);
		notification.remove();
	});

	document.getElementById("nav-notifications").appendChild(notification);
	return notification;
}

/**
 * 
 * @param  { UploadArgs } args 
 */
function uploadFileWithNotification(...args) {
	const handle = uploadFile(...args);
	makeUploadNotification(handle);
	return handle;
}

const gUploadQueue = [];
let gActiveUploadCount = 0;

function startNextUploads() {
	while (gUploadQueue.length > 0 && gActiveUploadCount < MAX_CONCURRENT_UPLOADS) {
		gUploadQueue.pop()();
	}
}

/**
 * 
 * @param  { UploadArgs } args 
 */
export function queueUpload(...args) {
	return new Promise((resolve) => {
		gUploadQueue.unshift(() => {
			gActiveUploadCount++;
			uploadFileWithNotification(...args).promise.finally(() => {
				gActiveUploadCount--;
				resolve();
				startNextUploads();
			});
		});
		startNextUploads();
	});
}
