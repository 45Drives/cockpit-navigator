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

export class SortFunctions {
	constructor() {
		this.orders = {
			name: "asc",
			owner: "asc",
			group: "asc",
			size: "asc",
			modified: "asc",
			created: "asc",
		}
		this.icons = {};
		for (let option of ["name", "owner", "group", "size", "modified", "created"]) {
			this.icons[option] = document.getElementById(`sort-${option}-icon`);
		}
		this.current_choice = "name";
	}

	get_func() {
		return this[`${this.current_choice}_${this.orders[this.current_choice]}`];
	}

	set_func(option) {
		if (this.current_choice === option) {
			if (this.orders[this.current_choice] === "asc") {
				this.orders[this.current_choice] = "desc";
				this.icons[this.current_choice].classList.remove("fa-chevron-up");
				this.icons[this.current_choice].classList.add("fa-chevron-down");
			} else {
				this.orders[this.current_choice] = "asc";
				this.icons[this.current_choice].classList.remove("fa-chevron-down");
				this.icons[this.current_choice].classList.add("fa-chevron-up");
			}
		} else {
			this.icons[this.current_choice].classList.remove("fa-chevron-up", "fa-chevron-down");
			this.current_choice = option;
			if (this.orders[this.current_choice] === "asc") {
				this.icons[this.current_choice].classList.add("fa-chevron-up");
			} else {
				this.icons[this.current_choice].classList.add("fa-chevron-down");
			}
		}
		
	}

	name_asc(first, second) {
		return first.filename.localeCompare(second.filename);
	}

	name_desc(first, second) {
		return second.filename.localeCompare(first.filename);
	}

	owner_asc(first, second) {
		return first.stat["owner"].localeCompare(second.stat["owner"]);
	}

	owner_desc(first, second) {
		return second.stat["owner"].localeCompare(first.stat["owner"]);
	}

	group_asc(first, second) {
		return first.stat["group"].localeCompare(second.stat["group"]);
	}

	group_desc(first, second) {
		return second.stat["group"].localeCompare(first.stat["group"]);
	}

	size_asc(first, second) {
		return first.stat["size"] - second.stat["size"];
	}

	size_desc(first, second) {
		return second.stat["size"] - first.stat["size"];
	}

	modified_asc(first, second) {
		return first.stat["mtime"] - second.stat["mtime"];
	}

	modified_desc(first, second) {
		return second.stat["mtime"] - first.stat["mtime"];
	}

	created_asc(first, second) {
		return first.stat["ctime"] - second.stat["ctime"];
	}

	created_desc(first, second) {
		return second.stat["ctime"] - first.stat["ctime"];
	}
}
