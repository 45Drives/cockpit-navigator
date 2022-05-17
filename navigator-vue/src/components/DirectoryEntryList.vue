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
			processingHandler.start();
			const readLink = (target, cwd, symlinkStr) => {
				return new Promise((resolve, reject) => {
					const linkTargetRaw = symlinkStr.split(/\s*->\s*/)[1].trim().replace(/^['"]|['"]$/g, '');
					Object.assign(target, {
						rawPath: linkTargetRaw,
						path: canonicalPath(linkTargetRaw.replace(/^(?!\/)/, `${cwd}/`)),
					});
					useSpawn(['stat', '-c', '%F', target.path], { superuser: 'try' }).promise()
						.then(state => {
							target.type = state.stdout.trim();
							target.broken = false;
						})
						.catch(() => {
							target.broken = true;
						})
						.finally(resolve);
				})
			}
			const US = '\x1F';
			const RS = '\x1E';
			try {
				const cwd = props.path;
				const procs = [];
				procs.push(...entryRefs.value.filter(entryRef => entryRef.showEntries).map(entryRef => entryRef.getEntries()));
				const entryNames =
					(await useSpawn(['dir', '--almost-all', '--dereference-command-line-symlink-to-dir', '--quoting-style=c', '-1', cwd], { superuser: 'try' }).promise()).stdout
						.split('\n')
						.filter(name => name)
						.map(escaped => {
							try {
								return JSON.parse(escaped);
							} catch (error) {
								notifications.constructNotification("Failed to parse file name", `${errorStringHTML(error)}\ncaused by ${escaped}`, 'error');
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
				entries.value =
					entryNames.length
						? (await useSpawn(['stat', `--printf=${fields.join(US)}${RS}`, ...entryNames], { superuser: 'try', directory: cwd }).promise()).stdout
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
										path: canonicalPath(`/${cwd}/${name}`),
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
									});
									if (type === 'symbolic link')
										procs.push(readLink(entry.target, cwd, symlinkStr));
									return entry;
								} catch (error) {
									console.error(errorString(error));
									return null;
								}
							}).filter(entry => entry !== null)
						: [];
				processingHandler.start();
				console.log("resolving", procs.length, 'symlinks');
				return Promise.all(procs)
					.then(() => {
						emitStats();
						sortEntries();
					})
					.finally(() => processingHandler.stop());
			} catch (error) {
				entries.value = [];
				notifications.value.constructNotification("Error getting directory entries", errorStringHTML(error), 'error');
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

		onBeforeUnmount(() => {
			processingHandler.resolveDangling();
		});

		watch(() => props.sortCallback, sortEntries);
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
