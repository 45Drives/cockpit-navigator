/*
 * Copyright (C) 2022 Josh Boudreau <jboudreau@45drives.com>
 * 
 * This file is part of Cockpit Navigator.
 * 
 * Cockpit Navigator is free software: you can redistribute it and/or modify it under the terms
 * of the GNU General Public License as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 * 
 * Cockpit Navigator is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with Cockpit Navigator.
 * If not, see <https://www.gnu.org/licenses/>.
 */

import { useSpawn } from "@45drives/cockpit-helpers";

export async function getGroups() {
	let groups = [];
	const groupDB = (await useSpawn(['getent', 'group'], { superuser: 'try' }).promise()).stdout;
	groupDB.split('\n').forEach((record) => {
		const fields = record.split(':');
		const group = fields[0];
		const gid = fields[2];
		if (gid >= 1000 || gid === '0')
			groups.push({ group: group, domain: false, pretty: group });
	})
	try {
		await useSpawn(['realm', 'list'], { superuser: 'try' }).promise(); // throws if not domain
		const domainGroupsDB = (await useSpawn(['wbinfo', '-g'], { superuser: 'try' }).promise()).stdout
		domainGroupsDB.split('\n').forEach((record) => {
			if (/^\s*$/.test(record))
				return;
			groups.push({ group: record.replace(/^[^\\]+\\/, ""), domain: true, pretty: record.replace(/^[^\\]+\\/, "") + " (domain)" });
		})
	} catch {}
	groups.sort((a, b) => a.pretty.localeCompare(b.pretty));
	return groups
}
