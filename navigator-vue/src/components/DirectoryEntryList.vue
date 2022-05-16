<template>
	<template v-for="entry, index in entries" :key="entry.path">
		<DirectoryEntry
			:show="entryFilterCallback(entry)"
			:entry="entry"
			:inheritedSortCallback="sortCallback"
			:searchFilterRegExp="searchFilterRegExp"
			@cd="(...args) => $emit('cd', ...args)"
			@edit="(...args) => $emit('edit', ...args)"
			@sortEntries="sortEntries"
			@updateStats="emitStats"
			@startProcessing="(...args) => $emit('startProcessing', ...args)"
			@stopProcessing="(...args) => $emit('stopProcessing', ...args)"
			ref="entryRefs"
			:level="level"
		/>
	</template>
	<tr
		v-if="show && entries.reduce((sum, entry) => entryFilterCallback(entry) ? sum + 1 : sum, 0) === 0"
	>
		<td
			:colspan="Object.values(settings?.directoryView?.cols ?? {}).reduce((sum, current) => current ? sum + 1 : sum, 1) ?? 100"
			class="!pl-1 text-muted text-sm"
		>
			<div class="inline-block" :style="{ width: `${24 * level}px` }"></div>
			<div class="inline-block">No entries.</div>
		</td>
	</tr>
</template>

<script>
import { ref, reactive, computed, inject, watch, onBeforeUnmount, onMounted } from 'vue';
import { useSpawn, errorString, errorStringHTML, canonicalPath } from '@45drives/cockpit-helpers';
import { notificationsInjectionKey, settingsInjectionKey } from '../keys';
import DirectoryEntry from './DirectoryEntry.vue';

export default {
	name: 'DirectoryEntryList',
	props: {
		path: String,
		searchFilterRegExp: RegExp,
		show: {
			type: Boolean,
			required: false,
			default: true,
		},
		sortCallback: {
			type: Function,
			required: false,
			default: (() => 0),
		},
		level: Number,
	},
	setup(props, { emit }) {
		const settings = inject(settingsInjectionKey);
		const entries = ref([]);
		const notifications = inject(notificationsInjectionKey);
		const entryRefs = ref([]);
		const sortCallbackComputed = computed(() => {
			return (a, b) => {
				if (settings.directoryView?.separateDirs) {
					const checkA = a.type === 'link' ? (a.target?.type ?? null) : a.type;
					const checkB = b.type === 'link' ? (b.target?.type ?? null) : b.type;
					if (checkA === null || checkB === null)
						return 0;
					if (checkA === 'directory' && checkB !== 'directory')
						return -1;
					else if (checkA !== 'directory' && checkB === 'directory')
						return 1;
				}
				return props.sortCallback(a, b);
			}
		});
		const processingHandler = {
			count: 0,
			start: () => {
				emit('startProcessing');
				processingHandler.count++;
			},
			stop: () => {
				if (processingHandler.count > 0) {
					emit('stopProcessing');
					processingHandler.count--;
				}
			},
			resolveDangling: () => {
				for (; processingHandler.count > 0; processingHandler.count--)
					emit('stopProcessing');
			}
		}

		const getAsyncEntryStats = (cwd, entry, modeStr, path, linkTargetRaw) => {
			const procs = [];
			Object.assign(entry, {
				permissions: {
					owner: {
						read: modeStr[1] !== '-',
						write: modeStr[2] !== '-',
						execute: modeStr[3] !== '-',
					},
					group: {
						read: modeStr[4] !== '-',
						write: modeStr[5] !== '-',
						execute: modeStr[6] !== '-',
					},
					other: {
						read: modeStr[7] !== '-',
						write: modeStr[8] !== '-',
						execute: modeStr[9] !== '-',
					},
					acl: modeStr[10] === '+' ? {} : null,
				}
			});
			switch (modeStr[0]) {
				case 'd':
					entry.type = 'directory';
					break;
				case '-':
					entry.type = 'file';
					break;
				case 'p':
					entry.type = 'pipe';
					break;
				case 'l':
					entry.type = 'link';
					if (linkTargetRaw) {
						entry.target = {
							rawPath: linkTargetRaw,
							path: canonicalPath(linkTargetRaw.replace(/^(?!\/)/, cwd + '/')),
						};
						procs.push(useSpawn(['stat', '-c', '%A', entry.target.path]).promise()
							.then(state => {
								getAsyncEntryStats(cwd, entry.target, state.stdout.trim());
								entry.target.broken = false;
							})
							.catch(() => {
								entry.target.broken = true;
							})
						);
					}
					break;
				case 's':
					entry.type = 'socket';
					break;
				case 'c':
					entry.type = 'character';
					break;
				case 'b':
					entry.type = 'block';
					break;
				default:
					entry.type = 'unk';
					break;
			}
			if (entry.permissions.acl && path) {
				procs.push(useSpawn(['getfacl', '--omit-header', '--no-effective', path], { superuser: 'try' }).promise()
					.then(state => {
						entry.permissions.acl = state.stdout
							.split('\n')
							.filter(line => line && !/^\s*(?:#|$)/.test(line))
							.reduce((acl, line) => {
								const match = line.match(/^([^:]*):([^:]+)?:(.*)$/).slice(1);
								acl[match[0]] = acl[match[0]] ?? {};
								acl[match[0]][match[1] ?? '*'] = {
									r: match[2][0] !== '-',
									w: match[2][1] !== '-',
									x: match[2][2] !== '-',
								}
								return acl;
							}, {});
					})
					.catch(state => {
						console.error(`failed to get ACL for ${path}:`, errorString(state));
					})
				);
			}
			if (path) {
				procs.push(useSpawn(['stat', '-c', '%W:%Y:%X', path], { superuser: 'try' }).promise() // birth:modification:access
					.then(state => {
						const [ctime, mtime, atime] = state.stdout.trim().split(':').map(str => parseInt(str));
						Object.assign(entry, {
							ctime: ctime ? new Date(ctime * 1000) : null,
							mtime: mtime ? new Date(mtime * 1000) : null,
							atime: atime ? new Date(atime * 1000) : null,
						});
					})
					.catch(state =>
						notifications.value.constructNotification(`Failed to get stats for ${path}`, errorStringHTML(state), 'error')
					)
				);
			}
			return Promise.all(procs);
		}

		const getEntries = async () => {
			processingHandler.start();
			try {
				const cwd = props.path;
				const procs = [];
				procs.push(entryRefs.value.map(entryRef => entryRef.getEntries()));
				let lsOutput;
				try {
					lsOutput = (await useSpawn(['ls', '-al', '--color=never', '--time-style=full-iso', '--quote-name', '--dereference-command-line-symlink-to-dir', cwd], { superuser: 'try' }).promise()).stdout
				} catch (state) {
					if (state.exit_code === 1)
						lsOutput = state.stdout; // non-fatal ls error
					else
						throw new Error(state.stderr);
				}
				entries.value = lsOutput
					.split('\n')
					.filter(line => !/^(?:\s*$|total)/.test(line)) // remove empty lines
					.map(record => {
						try {
							if (cwd !== props.path)
								return null;
							const entry = reactive({});
							const fields = record.match(/^([a-z-]+\+?)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+(?:,\s+\d+)?)\s+([^"]+)"([^"]+)"(?:\s+->\s+"([^"]+)")?/)?.slice(1);
							if (!fields) {
								console.error('regex failed to match on', record);
								return null;
							}
							entry.name = fields[6];
							if (entry.name === '.' || entry.name === '..')
								return null;
							entry.path = canonicalPath(cwd + `/${entry.name}`);
							entry.modeStr = fields[0];
							entry.hardlinkCount = parseInt(fields[1]);
							entry.owner = fields[2];
							entry.group = fields[3];
							if (/,/.test(fields[4])) {
								[entry.major, entry.minor] = fields[4].split(/,\s+/);
								entry.size = null;
							} else {
								entry.size = parseInt(fields[4]);
								entry.sizeHuman = cockpit.format_bytes(entry.size, 1000).replace(/(?<!B)$/, ' B');
								entry.major = entry.minor = null;
							}
							procs.push(getAsyncEntryStats(cwd, entry, entry.modeStr, entry.path, fields[7]));
							return entry;
						} catch (error) {
							notifications.value.constructNotification(`Error while gathering info for ${entry.path ?? record}`, errorStringHTML(error), 'error');
							return null;
						}
					})
					.filter(entry => entry !== null)
					?? [];
				processingHandler.start();
				return Promise.all(procs).then(() => {
					emitStats();
					sortEntries();
				}).finally(() => processingHandler.stop());
			} catch (error) {
				entries.value = [];
				notifications.value.constructNotification("Error getting directory entries", errorStringHTML(error), 'error');
			} finally {
				processingHandler.stop();
			}
		}

		const emitStats = () => {
			emit('updateStats', entries.value.reduce((stats, entry) => {
				if (entry.type === 'directory' || (entry.type === 'link' && entry.target?.type === 'directory'))
					stats.dirs++;
				else
					stats.files++;
				return stats;
			}, { files: 0, dirs: 0 }));
		}

		const sortEntries = () => {
			processingHandler.start();
			entries.value.sort(sortCallbackComputed.value);
			processingHandler.stop();
		}

		const entryFilterCallback = (entry) =>
			(!/^\./.test(entry.name) || settings?.directoryView?.showHidden)
			&& (props.searchFilterRegExp?.test(entry.name) ?? true);

		onBeforeUnmount(() => {
			processingHandler.resolveDangling();
		});

		watch(() => props.sortCallback, sortEntries);
		watch(entries, sortEntries);
		watch(() => settings.directoryView?.separateDirs, sortEntries);

		watch(() => props.path, getEntries, { immediate: true });

		return {
			settings,
			entries,
			entryRefs,
			getEntries,
			emitStats,
			sortEntries,
			entryFilterCallback,
		}
	},
	components: {
		DirectoryEntry,
	},
	emits: [
		'cd',
		'edit',
		'updateStats',
		'startProcessing',
		'stopProcessing',
	]
}
</script>
