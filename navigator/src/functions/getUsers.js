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
