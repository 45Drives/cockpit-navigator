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
