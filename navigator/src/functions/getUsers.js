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

export async function getUsers() {
	let users = [];
	const passwdDB = (await useSpawn(['getent', 'passwd'], { superuser: 'try' }).promise()).stdout;
	passwdDB.split('\n').forEach((record) => {
		const fields = record.split(':');
		const user = fields[0];
		const uid = fields[2];
		if (uid >= 1000 || uid === '0') // include root
			users.push({ user: user, domain: false, pretty: user });
	})
	try {
		await useSpawn(['realm', 'list'], { superuser: 'try' }).promise(); // throws if not domain
		const domainUsersDB = (await useSpawn(['wbinfo', '-u'], { superuser: 'try' }).promise()).stdout;
		domainUsersDB.split('\n').forEach((record) => {
			if (/^\s*$/.test(record))
				return;
			users.push({ user: record.replace(/^[^\\]+\\/, ""), domain: true, pretty: record.replace(/^[^\\]+\\/, "") + " (domain)" });
		})
	} catch { }
	users.sort((a, b) => a.pretty.localeCompare(b.pretty));
	return users;
}
