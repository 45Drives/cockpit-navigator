<template>
	<DirectoryEntry v-for="entry, index in visibleEntries" :key="entry.path" :host="host" :entry="entry"
		:inheritedSortCallback="sortCallback" :searchFilterRegExp="searchFilterRegExp"
		@sortEntries="sortEntries"
		@startProcessing="(...args) => $emit('startProcessing', ...args)"
		@stopProcessing="(...args) => $emit('stopProcessing', ...args)" ref="entryRefs" :level="level" :selectedCount="selectedCount"
		@setEntryProp="(prop, value) => entry[prop] = value"
		@browserAction="(...args) => $emit('browserAction', ...args)"
		@directoryViewAction="(...args) => $emit('directoryViewAction', ...args)"
		:suppressBorderT="visibleEntries[index - cols]?.selected && !(visibleEntries[index - cols]?.dirOpen)"
		:suppressBorderB="visibleEntries[index + cols]?.selected && !(entry.dirOpen)"
		:suppressBorderL="settings.directoryView.view !== 'list' && (visibleEntries[index - 1]?.selected && (index) % cols !== 0)"
		:suppressBorderR="settings.directoryView.view !== 'list' && (visibleEntries[index + 1]?.selected && (index + 1) % cols !== 0)" />
	<tr v-if="visibleEntries.length === 0">
		<td :colspan="Object.values(settings?.directoryView?.cols ?? {}).reduce((sum, current) => current ? sum + 1 : sum, 1) ?? 100"
			class="!pl-1 text-muted text-sm">
			<div class="w-6" v-for="i in Array(level).fill(0)" v-memo="[level]"></div>
			<div class="inline-block">No entries.</div>
		</td>
	</tr>
	<Teleport to="#footer-text" v-if="selectedCount === 0">
		<div>
			<span v-if="level > 0">{{ path.split('/').slice(-1 * (level)).join('/') }}:</span>
			{{ stats }}
		</div>
	</Teleport>
</template>

<script>
import { ref, reactive, computed, inject, watch, onBeforeUnmount, onMounted, nextTick, onUnmounted } from 'vue';
import { errorStringHTML } from '@45drives/cockpit-helpers';
import { notificationsInjectionKey, settingsInjectionKey, clipboardInjectionKey } from '../keys';
import DirectoryEntry from './DirectoryEntry.vue';
import getDirEntryObjects from '../functions/getDirEntryObjects';
import FileSystemWatcher from '../functions/fileSystemWatcher';

export default {
	name: 'DirectoryEntryList',
	props: {
		host: String,
		path: String,
		searchFilterRegExp: RegExp,
		sortCallback: {
			type: Function,
			required: false,
			default: (() => 0),
		},
		level: Number,
		cols: {
			type: Number,
			required: false,
			default: 1,
		},
		selectedCount: Number,
	},
	setup(props, { emit }) {
		const settings = inject(settingsInjectionKey);
		const clipboard = inject(clipboardInjectionKey);
		/**
		 * @type {Ref<DirectoryEntryObj[]>}
		 */
		const entries = ref([]);
		/**
		 * @type {Ref<DirectoryEntryObj[]>}
		 */
		const visibleEntries = ref([]);
		const notifications = inject(notificationsInjectionKey);
		const entryRefs = ref([]);
		const stats = ref("");
		const sortCallbackComputed = computed(() => {
			return (a, b) => {
				if (settings.directoryView?.separateDirs) {
					if (a.resolvedType === 'd' && b.resolvedType !== 'd')
						return -1;
					else if (a.resolvedType !== 'd' && b.resolvedType === 'd')
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
			// console.time('getEntries-' + props.path);
			try {
				const cwd = props.path;
				const tmpEntries = (
					await getDirEntryObjects(
						cwd,
						props.host,
						[],
						(message) => notifications.value.constructNotification("Error getting files", message, 'error')
					)
				);
				if (props.path !== cwd) {
					return; // changed directory before could finish
				}
				const selectedIds = gatherEntries([], false).filter(entry => entry.selected).map(entry => entry.uniqueId);
				const clipboardIds = clipboard.content.map(item => item.uniqueId);
				tmpEntries.map(entry => {
					entry.selected = selectedIds.includes(entry.uniqueId);
					entry.cut = clipboardIds.includes(entry.uniqueId);
				});
				entries.value = [...tmpEntries.sort(sortCallbackComputed.value)];
			} catch (error) {
				entries.value = [];
				notifications.value.constructNotification("Error getting directory entries", errorStringHTML(error), 'error');
				emit('cancelShowEntries');
			} finally {
				// console.timeEnd('getEntries-' + props.path);
				processingHandler.stop();
			}
		}

		const refresh = async () => {
			processingHandler.start();
			await Promise.all([
				getEntries(),
				...entryRefs.value.filter(entryRef => entryRef.showEntries).map(entryRef => entryRef.refresh())
			]);
			processingHandler.stop();
		}

		const sortEntries = () => {
			processingHandler.start();
			entries.value = [...entries.value].sort(sortCallbackComputed.value);
			processingHandler.stop();
		}

		const entryFilterCallback = (entry) =>
			(!/^\./.test(entry.name) || settings?.directoryView?.showHidden)
			&& (props.searchFilterRegExp?.test(entry.name) ?? true);

		/**
		 * Recursive get all entries for browser
		 * 
		 * @param {DirectoryEntryObj[]} - Holds all entries
		 * 
		 * @returns {DirectoryEntryObj[]} - the accumulator
		 */
		const gatherEntries = (accumulator = [], onlyVisible = true) => {
			const subset = onlyVisible ? visibleEntries.value : entries.value;
			return accumulator.concat(
				subset,
				entryRefs.value
					.filter(entryRef => entryRef.showEntries)
					.map(entryRef => entryRef.gatherEntries(accumulator, onlyVisible)).flat(1)
			);
		}

		const fileSystemWatcher = FileSystemWatcher(props.path, { superuser: 'try', host: props.host, ignoreSelf: true });

		fileSystemWatcher.onCreated = async (eventObj) => {
			const entryName = eventObj.path.replace(props.path, '').replace(/^\//, '');
			const [entry] = await getDirEntryObjects(
				props.path,
				props.host,
				['-name', entryName],
				(message) => notifications.value.constructNotification("Failed to parse file name", message, 'error')
			);
			if (!entry)
				return; // temp file deleted too quickly
			entries.value = [...entries.value, reactive(entry)].sort(sortCallbackComputed.value);
		}

		fileSystemWatcher.onChanged = async (eventObj) => {
			const entryName = eventObj.path.replace(props.path, '').replace(/^\//, '');
			const entry = entries.value.find(entry => entry.name === entryName);
			if (entry) {
				const [newContent] = await getDirEntryObjects(
					props.path,
					props.host,
					['-name', entryName],
					(message) => notifications.value.constructNotification("Failed to parse file name", message, 'error'),
				);
				if (!newContent)
					return; // temp file deleted too quickly
				const attrsChanged = ["name", "owner", "group", "size", "btime", "mtime", "atime"].map(key => String(entry[key]) !== String(newContent[key])).includes(true);
				Object.assign(entry, newContent, { cut: entry.cut, selected: entry.selected });
				if (attrsChanged) sortEntries();
			}
			else
				console.error("Failed to find entry for update", entryName);
		}

		fileSystemWatcher.onAttributeChanged = fileSystemWatcher.onChanged;

		fileSystemWatcher.onDeleted = async (eventObj) => {
			const entryName = eventObj.path.replace(props.path, '').replace(/^\//, '');
			entries.value = entries.value.filter(entry => entry.name !== entryName);
		}

		fileSystemWatcher.onError = (error) => notifications.value.constructNotification("File System Watcher Error", errorStringHTML(error), 'error');

		onBeforeUnmount(() => {
			processingHandler.resolveDangling();
			fileSystemWatcher.stop();
			// console.time('unmount-' + props.path);
		});

		// onUnmounted(() => console.timeEnd('unmount-' + props.path));

		watch(() => props.sortCallback, sortEntries);
		watch(() => settings.directoryView?.separateDirs, sortEntries);

		watch([entries, () => settings?.directoryView?.showHidden, () => props.searchFilterRegExp], () => {
			// console.time('updateVisibleEntries-' + props.path);
			visibleEntries.value = entries.value.filter(entryFilterCallback);
			// nextTick(() => console.timeEnd('updateVisibleEntries-' + props.path));
			const _stats = visibleEntries.value.reduce((_stats, entry) => {
				if (entry.resolvedType === 'd')
					_stats.dirs++;
				else
					_stats.files++;
				_stats.size += entry.size;
				return _stats;
			}, { files: 0, dirs: 0, size: 0 });
			stats.value = `${_stats.files} file${_stats.files === 1 ? '' : 's'}, ${_stats.dirs} director${_stats.dirs === 1 ? 'y' : 'ies'} (${cockpit.format_bytes(_stats.size, 1000).replace(/(?<!B)$/, ' B')})`;
			nextTick(() => emit('tallySelected'));
		});

		watch(() => props.path, (current, old) => {
			if (current === old)
				return;
			getEntries().then(() => fileSystemWatcher.path = current);
		}, { immediate: true });

		watch(() => props.host, (current, old) => {
			if (current === old)
				return;
			getEntries().then(() => fileSystemWatcher.host = current);
		})

		return {
			console,
			settings,
			entries,
			visibleEntries,
			entryRefs,
			stats,
			getEntries,
			refresh,
			sortEntries,
			entryFilterCallback,
			gatherEntries,
		}
	},
	components: {
		DirectoryEntry,
	},
	emits: [
		'startProcessing',
		'stopProcessing',
		'cancelShowEntries',
		'deselectAll',
		'browserAction',
		'directoryViewAction',
		'tallySelected',
	]
}
</script>
