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

import { FileUpload } from "./FileUpload.js";
import { NavWindow } from "./NavWindow.js";

export class FileUploadManager {
    /**
     * 
     * @param {NavWindow} nav_window_ref 
     * @param {number} max_concurrent 
     */
    constructor(nav_window_ref, max_concurrent = 10) {
        this.nav_window_ref = nav_window_ref;
        this.running = 0;
        this.remaining_uploads = [];
        this.max_concurrent = max_concurrent;
        this.start_next = () => {
            let next_upload = this.remaining_uploads.pop();
            if (next_upload) {
                next_upload?.upload?.();
                this.running++;
            }
        }
    }

    /**
     * 
     * @param  {...FileUpload} uploads 
     */
    add(...uploads) {
        let done_hook = () => {
            this.running--;
            this.start_next();
            if (!this.running)
                this.nav_window_ref.refresh();
        }
        for (let upload of uploads) {
            upload.done_hook = done_hook;
            this.remaining_uploads.unshift(upload);
        }
        while (this.remaining_uploads.length && this.running < this.max_concurrent) {
            this.start_next();
        }
    }
}