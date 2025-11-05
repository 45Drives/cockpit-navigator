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
import { NavFile, NavFileLink } from "./NavFile.js";
import { NavDir, NavDirLink } from "./NavDir.js";
import { NavDownloader } from "./NavDownloader.js";

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
			elem.addEventListener("click", (e) => {this[func[0]].bind(this, e).apply()});
			elem.classList.add("nav-context-menu-item")
			elem.id = "nav-context-menu-" + func[0];
			this.dom_element.appendChild(elem);
			this.menu_options[func[0]] = elem;
		}
	}

	new_dir(e) {
		this.nav_window_ref.mkdir();
	}

	new_file(e) {
		this.nav_window_ref.touch();
	}

	new_link(e) {
		var default_target = "";
		if (this.nav_window_ref.selected_entries.size <= 1 && this.target !== this.nav_window_ref.pwd())
			default_target = this.target.filename;
		this.nav_window_ref.ln(default_target);
	}

	cut(e) {
		this.nav_window_ref.cut();
	}

	copy(e) {
		this.nav_window_ref.copy();
	}

	paste(e) {
		this.nav_window_ref.paste();
	}

	async rename(e) {
		this.hide();
		if (this.target.is_dangerous_path()) {
			await this.nav_window_ref.modal_prompt.alert(
				"Cannot rename system-critical paths.",
				"If you think you need to, use the terminal."
			);
		} else {
			this.target.show_edit(this.target.dom_element.nav_item_title);
		}
		e.stopPropagation();
	}
	zip_for_download() {
		return new Promise((resolve, reject) => {
		  const cmd = ["/usr/share/cockpit/navigator/scripts/zip-for-download.py3", 
						this.nav_window_ref.pwd().path_str()];
		  for (const entry of this.nav_window_ref.selected_entries) cmd.push(entry.path_str());
		  const proc = cockpit.spawn(cmd, { superuser: "try", err: "out" });
	  
		  const safeParse = (raw) => {
			const s = (raw || "").trim();
			const start = s.indexOf("{");
			const end = s.lastIndexOf("}");
			if (start === -1 || end === -1 || end < start) {
			  throw new Error("No JSON object in output: " + s.slice(0, 200));
			}
			return JSON.parse(s.slice(start, end + 1));
		  };
	  
		  proc.done((data) => {
			try {
			  resolve(safeParse(data));
			} catch (e) {
			  console.error("zip_for_download done(raw):", data);
			  reject({ message: e.message });
			}
		  });
	  
		  proc.fail((e, data) => {
			try {
			  reject(safeParse(data));
			} catch {
			  console.error("zip_for_download fail(raw):", data);
			  reject({ message: String(data || e || "zip_for_download failed") });
			}
		  });
		});
	  }
	  
	  async download(e) {
		let download_target = "";
		let result; 
	  
		if (this.nav_window_ref.selected_entries.size === 1 &&
			!(this.nav_window_ref.selected_entry() instanceof NavDir)) {
		  download_target = this.nav_window_ref.selected_entry();
		} else {
		  this.nav_window_ref.start_load();
		  try {
			result = await this.zip_for_download();
			download_target = new NavFile(result["archive-path"], result["stat"], this.nav_window_ref);
		  } catch (err) {
			this.nav_window_ref.stop_load();
			this.nav_window_ref.modal_prompt.alert(err.message);
			return;
		  } finally {
			this.nav_window_ref.stop_load();
		  }
		}
		if (result?.["archive-path"]) {
			const unitName = `nav-clean-sweep-on-close-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
		  
			const script = `
		  set -euo pipefail
		  
		  ARCHIVE="$ARCHIVE"
		  DIR="$(dirname -- "$ARCHIVE")"
		  BASE="$(basename -- "$ARCHIVE")"
		  ROOT="/tmp/navigator"
		  PATTERN="navigator-download*"
		  
		  if ! command -v inotifywait >/dev/null 2>&1; then
			sleep 300
			rm -f -- "$ARCHIVE" || true
			# Sweep everything matching PATTERN that's not in use
			find "$ROOT" -mindepth 1 -maxdepth 1 -name "$PATTERN" -print0 | \
			while IFS= read -r -d '' p; do
			  if command -v lsof >/dev/null 2>&1 && lsof -t -- "$p" >/dev/null 2>&1; then
				continue
			  fi
			  rm -rf -- "$p"
			done
			[ -n "\${TEMPDIR:-}" ] && [[ "$TEMPDIR" == /tmp/navigator-* ]] && rm -rf -- "$TEMPDIR" || :
			exit 0
		  fi
		  
		  if ! timeout 1800 bash -lc '
			inotifywait -q -m -e open --format "%e %f" -- "$DIR" |
			while read ev f; do
			  if [ "$f" = "$BASE" ]; then exit 0; fi
			done
		  '; then
			find "$ROOT" -mindepth 1 -maxdepth 1 -name "$PATTERN" -print0 | \
			while IFS= read -r -d '' p; do
			  if command -v lsof >/dev/null 2>&1 && lsof -t -- "$p" >/dev/null 2>&1; then
				continue
			  fi
			  rm -rf -- "$p"
			done
			exit 0
		  fi
		  
		  if command -v lsof >/dev/null 2>&1; then
			# Ensure no process holds ARCHIVE open
			sleep 1
			while lsof -t -- "$ARCHIVE" >/dev/null 2>&1; do sleep 1; done
		  else
			timeout 86400 bash -lc '
			  inotifywait -q -m -e close --format "%e %f" -- "$DIR" |
			  while read ev f; do
				if [ "$f" = "$BASE" ]; then exit 0; fi
			  done
			' || true
		  fi
		  
		  rm -f -- "$ARCHIVE" || true
		  
		  #    (uncomment -mmin +5 to keep very fresh ones)
		  find "$ROOT" -mindepth 1 -maxdepth 1 -name "$PATTERN" -print0 | \
		  while IFS= read -r -d '' p; do
			if command -v lsof >/dev/null 2>&1 && lsof -t -- "$p" >/dev/null 2>&1; then
			  continue
			fi
			rm -rf -- "$p"
		  done		  
		  [ -n "\${TEMPDIR:-}" ] && [[ "$TEMPDIR" == /tmp/navigator-* ]] && rm -rf -- "$TEMPDIR" || :
		  `;
			const cmd = [
			  'systemd-run',
			  '--property=CollectMode=inactive-or-failed',
			  '--property=RuntimeMaxSec=90000',
			  '--unit', unitName,
			  '--setenv=ARCHIVE=' + result['archive-path'],
			  ...(result['temp-dir'] ? ['--setenv=TEMPDIR=' + result['temp-dir']] : []),
			  '/bin/bash','-lc', script
			];		  
			await cockpit.spawn(cmd, { superuser: 'require', err: 'out' });
		  }	  
		const downloader = new NavDownloader(download_target);
		downloader.download();
	  }
	  

	delete(e) {
		this.nav_window_ref.delete_selected();
	}

	properties(e) {
		this.nav_window_ref.show_edit_selected();
	}

	/**
	 * 
	 * @param {Event} event 
	 * @param {NavEntry} target 
	 */
	show(event, target) {
		if (!this.nav_window_ref.none_selected()) {
			// if (event.shiftKey || event.ctrlKey)
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
