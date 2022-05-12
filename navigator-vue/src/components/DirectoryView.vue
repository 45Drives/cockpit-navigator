<template>
	<Table
		v-if="settings.directoryView?.view === 'list'"
		emptyText="No entries."
		noHeader
		stickyHeaders
		noShrink
		noShrinkHeight="h-full"
		class="rounded-lg"
	>
		<template #thead>
			<tr>
				<th class="w-6 !p-0">
					<div class="flex items-center justify-center">
						<LoadingSpinner v-if="processing" class="size-icon" />
					</div>
				</th>
				<th class="!pl-1">
					<div class="flex flex-row flex-nowrap gap-2">
						<div class="grow">Name</div>
						<SortCallbackButton
							initialFuncIsMine
							v-model="sortCallback"
							:compareFunc="sortCallbacks.name"
						/>
					</div>
				</th>
				<th v-if="settings?.directoryView?.cols?.mode">Mode</th>
				<th v-if="settings?.directoryView?.cols?.owner">
					<div class="flex flex-row flex-nowrap gap-2">
						<div class="grow">Owner</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.owner" />
					</div>
				</th>
				<th v-if="settings?.directoryView?.cols?.group">
					<div class="flex flex-row flex-nowrap gap-2">
						<div class="grow">Group</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.group" />
					</div>
				</th>
				<th v-if="settings?.directoryView?.cols?.size">
					<div class="flex flex-row flex-nowrap gap-2">
						<div class="grow">Size</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.size" />
					</div>
				</th>
				<th v-if="settings?.directoryView?.cols?.ctime">
					<div class="flex flex-row flex-nowrap gap-2">
						<div class="grow">Created</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.ctime" />
					</div>
				</th>
				<th v-if="settings?.directoryView?.cols?.mtime">
					<div class="flex flex-row flex-nowrap gap-2">
						<div class="grow">Modified</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.mtime" />
					</div>
				</th>
				<th v-if="settings?.directoryView?.cols?.atime">
					<div class="flex flex-row flex-nowrap gap-2">
						<div class="grow">Accessed</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.atime" />
					</div>
				</th>
			</tr>
		</template>
		<template #tbody>
			<DirectoryEntry
				v-for="entry, index in entries"
				:hidden="!settings.directoryView.showHidden && /^\./.test(entry.name)"
				:key="entry.path"
				:entry="entry"
				listView
				@cd="(...args) => $emit('cd', ...args)"
				@edit="(...args) => $emit('edit', ...args)"
				@sortEntries="sortEntries"
				@updateStats="emitStats"
			/>
		</template>
	</Table>
	<div v-else class="flex flex-wrap gap-well p-well bg-well h-full overflow-y-auto">
		<DirectoryEntry
			v-for="entry, index in entries"
			:hidden="!settings.directoryView.showHidden && /^\./.test(entry.name)"
			:key="entry.path"
			:entry="entry"
			@cd="(...args) => $emit('cd', ...args)"
			@edit="(...args) => $emit('edit', ...args)"
			@sortEntries="sortEntries"
			@updateStats="emitStats"
		/>
	</div>
</template>

<script>
import { ref, reactive, computed, inject, watch } from 'vue';
import DirectoryEntry from './DirectoryEntry.vue';
import { useSpawn, errorStringHTML, canonicalPath } from '@45drives/cockpit-helpers';
import Table from './Table.vue';
import { notificationsInjectionKey, settingsInjectionKey } from '../keys';
import LoadingSpinner from './LoadingSpinner.vue';
import SortCallbackButton from './SortCallbackButton.vue';

export default {
	props: {
		path: String,
	},
	setup(props, { emit }) {
		const settings = inject(settingsInjectionKey);
		const entries = ref([]);
		const processing = ref(0);
		const notifications = inject(notificationsInjectionKey);

		const sortCallbacks = {
			name: (a, b) => a.name.localeCompare(b.name),
			owner: (a, b) => a.owner.localeCompare(b.owner),
			group: (a, b) => a.group.localeCompare(b.group),
			size: (a, b) => a.size - b.size,
			ctime: (a, b) => a.ctime.getTime() - b.ctime.getTime(),
			mtime: (a, b) => a.mtime.getTime() - b.mtime.getTime(),
			atime: (a, b) => a.atime.getTime() - b.atime.getTime(),
		}
		const sortCallback = ref(() => 0);
		const sortCallbackComputed = computed({
			get() {
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
					return sortCallback.value(a, b);
				}
			},
			set(value) {
				sortCallback.value = value;
			}
		})

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
							path: canonicalPath(linkTargetRaw.replace(/^(?!=\/)/, cwd + '/')),
						};
						processing.value++;
						procs.push(useSpawn(['stat', '-c', '%A', entry.target.path]).promise()
							.then(state => {
								getAsyncEntryStats(cwd, entry.target, state.stdout.trim());
								entry.target.broken = false;
							})
							.catch(() => {
								entry.target.broken = true;
							})
							.finally(() => processing.value--)
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
				processing.value++;
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
					.finally(() => processing.value--)
				);
			}
			if (path) {
				processing.value++;
				procs.push(useSpawn(['stat', '-c', '%W:%Y:%X', path], { superuser: 'try' }).promise() // birth:modification:access
					.then(state => {
						const [ctimeStr, mtimeStr, atimeStr] = state.stdout.trim().split(':');
						Object.assign(entry, {
							ctime: new Date(parseInt(ctimeStr) * 1000),
							mtime: new Date(parseInt(mtimeStr) * 1000),
							atime: new Date(parseInt(atimeStr) * 1000),
						});
					})
					.catch(state =>
						notifications.value.constructNotification(`Failed to get stats for ${path}`, errorStringHTML(state), 'error')
					)
					.finally(() => processing.value--)
				);
			}
			return Promise.all(procs);
		}

		const getEntries = async () => {
			processing.value++;
			try {
				const cwd = props.path;
				let lsOutput;
				try {
					lsOutput = (await useSpawn(['ls', '-al', '--color=never', '--time-style=full-iso', '--quote-name', '--dereference-command-line-symlink-to-dir', cwd], { superuser: 'try' }).promise()).stdout
				} catch (state) {
					if (state.exit_code === 1)
						lsOutput = state.stdout; // non-fatal ls error
					else
						throw new Error(state.stderr);
				}
				const procs = [];
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
				Promise.all(procs).then(() => {
					emitStats();
					sortEntries();
				})
			} catch (error) {
				entries.value = [];
				notifications.value.constructNotification("Error getting directory entries", errorStringHTML(error), 'error');
			} finally {
				processing.value--;
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
			processing.value++;
			entries.value.sort(sortCallbackComputed.value);
			processing.value--;
		}

		watch(sortCallback, sortEntries);
		watch(entries, sortEntries);
		watch(() => settings.directoryView?.separateDirs, sortEntries);

		watch(() => props.path, getEntries, { immediate: true });

		return {
			settings,
			entries,
			processing,
			sortCallbacks,
			sortCallback,
			getEntries,
			emitStats,
			sortEntries,
		}
	},
	components: {
		DirectoryEntry,
		Table,
		LoadingSpinner,
		SortCallbackButton,
	},
	emits: [
		'cd',
		'edit',
		'updateStats',
	]
}
</script>
