export class SortFunctions {
	constructor() {
		this.orders = {
			name: "asc",
			owner: "asc",
			group: "asc",
			size: "asc",
		}
		this.icons = {};
		for (let option of ["name", "owner", "group", "size"]) {
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
		return first.filename().localeCompare(second.filename());
	}

	name_desc(first, second) {
		return second.filename().localeCompare(first.filename());
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
}
