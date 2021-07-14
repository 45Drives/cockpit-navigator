/**
 * 
 * @param {string} key 
 * @param {string} value 
 * @returns {string}
 */
 export function property_entry_html(key, value) {
	var html = '<div class="nav-property-pair">';
	html += '<span class="nav-property-pair-key">' + key + '</span>';
	html += '<span class="nav-property-pair-value">' + value + '</span>';
	html += '</div>';
	return html;
}

/**
 * 
 * @param {number} bytes 
 * @returns {string}
 */
export function format_bytes(bytes) {
	if (bytes === 0)
		return "0 B";
	var units = [" B", " KiB", " MiB", " GiB", " TiB", " PiB"];
	var index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	var pow = Math.pow(1024, index);
	var formatted = bytes / pow;
	return formatted.toFixed(2).toString() + units[index];
}

/**
 * 
 * @param {number} timestamp 
 * @returns {string}
 */
export function format_time(timestamp) {
	var date = new Date(timestamp * 1000);
	return date.toLocaleString();
}

/**
 * 
 * @param {number} seconds 
 * @returns {string}
 */
export function format_time_remaining(seconds_) {
	var hours = Math.floor(seconds_ / 3600);
	var seconds = seconds_ % 3600;
	var minutes = Math.floor(seconds / 60);
	seconds = Math.floor(seconds % 60);
	var out = "";
	if (hours) {
		out = String(hours).padStart(2, '0') + ":";
	}
	if (minutes) {
		out += String(minutes).padStart(2, '0') + ":";
	}
	out += String(seconds).padStart(2, '0');
	return out;
}

/**
 * 
 * @param {number} mode 
 * @returns {string}
 */
export function format_permissions(mode) {
	var bit_list = ["x", "w", "r"];
	var result = "";
	for (let bit = 8; bit >= 0; bit--) {
		var test_bit = 1 << bit;
		var test_result = mode & test_bit;
		if (test_result != 0) {
			result += bit_list[bit % bit_list.length];
		} else {
			result += "-";
		}
	}
	return result;
}