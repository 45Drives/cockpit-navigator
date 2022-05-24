<template>
	<template v-for="entry, index in entries" :key="entry.path">
		<DirectoryEntry
			:show="entryFilterCallback(entry)"
			:entry="entry"
			:inheritedSortCallback="sortCallback"
			:searchFilterRegExp="searchFilterRegExp"
			@cd="(...args) => $emit('cd', ...args)"
			@edit="(...args) => $emit('edit', ...args)"
			@toggleSelected="entry.selected = !entry.selected"
			@sortEntries="sortEntries"
			@updateStats="emitStats"
			@startProcessing="(...args) => $emit('startProcessing', ...args)"
			@stopProcessing="(...args) => $emit('stopProcessing', ...args)"
			ref="entryRefs"
			:level="level"
			:class="['border-2 box-border', entry.selected ? 'border-dashed border-x-red-600/50' : 'border-x-transparent', (entry.selected && !entries[index - 1]?.selected) ? 'border-t-red-600/50' : 'border-t-transparent', (entry.selected && !entries[index + 1]?.selected) ? 'border-b-red-600/50' : 'border-b-transparent']"
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
					const checkA = a.type === 'symbolic link' ? (a.target?.type ?? null) : a.type;
					const checkB = b.type === 'symbolic link' ? (b.target?.type ?? null) : b.type;
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

		const getEntries = async () => {
			if (!props.path) {
				return;
			}
			processingHandler.start();
			const US = '\x1F';
			const RS = '\x1E';
			const processLinks = (linkTargets) => {
				if (linkTargets.length === 0)
					return null;
				const callback = state => state.stdout
					.trim()
					.split('\n')
					.filter(record => record)
					.map((record, index) => {
						if (record.includes(US)) {
							const [type, mode] = record.split(US);
							linkTargets[index].type = type;
							linkTargets[index].mode = mode;
							linkTargets[index].broken = false;
						} else { // error
							linkTargets[index].broken = true;
						}
					});
				return new Promise((resolve, reject) =>
					useSpawn(['stat', `--printf=%F${US}%f\n`, ...linkTargets.map(target => target.path)], { superuser: 'try', err: 'out' }).promise()
						.then(callback)
						.catch(callback)
						.finally(resolve)
				)
			}
			try {
				const cwd = props.path;
				const procs = [];
				let tmpEntries;
				procs.push(...entryRefs.value.filter(entryRef => entryRef.showEntries).map(entryRef => entryRef.getEntries()));
				const entryNames =
					(await useSpawn(['dir', '--almost-all', '--dereference-command-line-symlink-to-dir', '--quoting-style=c', '-1', cwd], { superuser: 'try' }).promise()).stdout
						.split('\n')
						.filter(name => name)
						.map(escaped => {
							try {
								return JSON.parse(escaped);
							} catch (error) {
								notifications.value.constructNotification("Failed to parse file name", `${errorStringHTML(error)}\ncaused by ${escaped}`, 'error');
								return null;
							}
						})
						.filter(entry => entry !== null);
				const fields = [
					'%n', // path
					'%f', // mode (raw hex)
					'%A', // modeStr
					'%s', // size
					'%U', // owner
					'%G', // group
					'%W', // ctime
					'%Y', // mtime
					'%X', // atime
					'%F', // type
					'%N', // quoted name with symlink
				]
				tmpEntries =
					entryNames.length
						? (await useSpawn(['stat', `--printf=${fields.join(US)}${RS}`, ...entryNames], { superuser: 'try', directory: cwd }).promise().catch(state => state)).stdout
							.split(RS)
							.filter(record => record) // remove empty lines
							.map(record => {
								try {
									let [name, mode, modeStr, size, owner, group, ctime, mtime, atime, type, symlinkStr] = record.split(US);
									[size, ctime, mtime, atime] = [size, ctime, mtime, atime].map(num => parseInt(num));
									[ctime, mtime, atime] = [ctime, mtime, atime].map(ts => ts ? new Date(ts * 1000) : null);
									mode = parseInt(mode, 16);
									const entry = reactive({
										name,
										path: `${cwd}/${name}`.replace(/\/+/g, '/'),
										mode,
										modeStr,
										size,
										sizeHuman: cockpit.format_bytes(size, 1000).replace(/(?<!B)$/, ' B'),
										owner,
										group,
										ctime,
										mtime,
										atime,
										type,
										target: {},
										selected: false,
									});
									if (type === 'symbolic link') {
										entry.target.rawPath = symlinkStr.split(/\s*->\s*/)[1].trim().replace(/^['"]|['"]$/g, '');
										entry.target.path = entry.target.rawPath.replace(/^(?!\/)/, `${cwd}/`);
									}
									return entry;
								} catch (error) {
									console.error(errorString(error));
									return null;
								}
							}).filter(entry => entry !== null)
						: [];
				procs.push(processLinks(tmpEntries.filter(entry => entry.type === 'symbolic link').map(entry => entry.target)));
				processingHandler.start();
				return Promise.all(procs)
					.then(() => {
						if (props.path !== cwd)
							return;
						entries.value = [...tmpEntries];
						emitStats();
						sortEntries();
					})
					.finally(() => processingHandler.stop());
			} catch (error) {
				entries.value = [];
				notifications.value.constructNotification("Error getting directory entries", errorStringHTML(error), 'error');
				emit('cancelShowEntries');
			} finally {
				processingHandler.stop();
			}
		}

		const emitStats = () => {
			emit('updateStats', entries.value.reduce((stats, entry) => {
				if (entry.type === 'directory' || (entry.type === 'symbolic link' && entry.target?.type === 'directory'))
					stats.dirs++;
				else
					stats.files++;
				return stats;
			}, { files: 0, dirs: 0 }));
		}

		const sortEntries = () => {
			if (processingHandler.count) {
				setTimeout(sortEntries, 100); // poll until nothing processing
			} else {
				processingHandler.start();
				entries.value.sort(sortCallbackComputed.value);
				processingHandler.stop();
			}
		}

		const entryFilterCallback = (entry) =>
			(!/^\./.test(entry.name) || settings?.directoryView?.showHidden)
			&& (props.searchFilterRegExp?.test(entry.name) ?? true);

		const getSelected = () => [
			...entries.value.filter(entry => entry.selected),
			...entryRefs.value.filter(entryRef => entryRef.showEntries).map(entryRef => entryRef.getSelected()).flat(1),
		];

		onBeforeUnmount(() => {
			processingHandler.resolveDangling();
		});

		watch(() => props.sortCallback, sortEntries);
		watch(() => settings.directoryView?.separateDirs, sortEntries);

		watch(() => props.path, (current, old) => {
			if (current === old)
				return;
			getEntries();
		}, { immediate: true });

		return {
			settings,
			entries,
			entryRefs,
			getEntries,
			emitStats,
			sortEntries,
			entryFilterCallback,
			getSelected,
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
		'cancelShowEntries',
	]
}
</script>
