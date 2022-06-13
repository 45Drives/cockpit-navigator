<template>
	<template v-for="entry, index in visibleEntries" :key="entry.path">
		<DirectoryEntry :show="true" :host="host" :entry="entry" :inheritedSortCallback="sortCallback"
			:searchFilterRegExp="searchFilterRegExp" @cd="(...args) => $emit('cd', ...args)"
			@edit="(...args) => $emit('edit', ...args)" @toggleSelected="(...args) => $emit('toggleSelected', ...args)"
			@sortEntries="sortEntries" @updateStats="emitStats"
			@startProcessing="(...args) => $emit('startProcessing', ...args)"
			@stopProcessing="(...args) => $emit('stopProcessing', ...args)" ref="entryRefs" :level="level"
			@setEntryProp="(prop, value) => entry[prop] = value"
			:suppressBorders="getBorderSuppression(entry, index)" />
	</template>
	<tr v-if="show && visibleEntries.length === 0">
		<td :colspan="Object.values(settings?.directoryView?.cols ?? {}).reduce((sum, current) => current ? sum + 1 : sum, 1) ?? 100"
			class="!pl-1 text-muted text-sm">
			<div class="inline-block" :style="{ width: `${24 * level}px` }"></div>
			<div class="inline-block">No entries.</div>
		</td>
	</tr>
</template>

<script>
import { ref, reactive, computed, inject, watch, onBeforeUnmount, onMounted } from 'vue';
import { useSpawn, errorString, errorStringHTML, canonicalPath } from '@45drives/cockpit-helpers';
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
		cols: {
			type: Number,
			required: false,
			default: 1,
		},
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
		const sortCallbackComputed = computed(() => {
			return (a, b) => {
				if (settings.directoryView?.separateDirs) {
					const checkA = a.type === 'l' ? (a.target?.type ?? null) : a.type;
					const checkB = b.type === 'l' ? (b.target?.type ?? null) : b.type;
					if (checkA === null || checkB === null)
						return 0;
					if (checkA === 'd' && checkB !== 'd')
						return -1;
					else if (checkA !== 'd' && checkB === 'd')
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
			try {
				const cwd = props.path;
				console.time('getEntries');
				const tmpEntries = (
					await getDirEntryObjects(
						cwd,
						props.host,
						[],
						(message) => notifications.value.constructNotification("Failed to parse file name", message, 'error')
					)
				);
				if (props.path !== cwd)
					return; // changed directory before could finish
				entries.value = [...tmpEntries.sort(sortCallbackComputed.value)].map(entry => reactive({ ...entry, cut: clipboard.content.find(a => a.path === entry.path && a.host === entry.host) ?? false }));
				console.timeEnd('getEntries');
			} catch (error) {
				entries.value = [];
				notifications.value.constructNotification("Error getting directory entries", errorStringHTML(error), 'error');
				emit('cancelShowEntries');
			} finally {
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

		const emitStats = () => {
			emit('updateStats', visibleEntries.value.reduce((stats, entry) => {
				if (entry.type === 'd' || (entry.type === 'l' && entry.target?.type === 'd'))
					stats.dirs++;
				else
					stats.files++;
				stats.size += entry.size;
				return stats;
			}, { files: 0, dirs: 0, size: 0 }));
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

		const getBorderSuppression = (entry, index) => {
			return {
				top: visibleEntries.value[index - props.cols]?.selected && !(visibleEntries.value[index - props.cols]?.dirOpen),
				bottom: visibleEntries.value[index + props.cols]?.selected && !(entry.dirOpen),
				left: settings.directoryView.view !== 'list' && (visibleEntries.value[index - 1]?.selected && (index) % props.cols !== 0),
				right: settings.directoryView.view !== 'list' && (visibleEntries.value[index + 1]?.selected && (index + 1) % props.cols !== 0),
			}
		};

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
				const attrsChanged = ["name", "owner", "group", "size", "ctime", "mtime", "atime"].map(key => String(entry[key]) !== String(newContent[key])).includes(true);
				Object.assign(entry, newContent);
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
		});

		watch(() => props.sortCallback, sortEntries);
		watch(() => settings.directoryView?.separateDirs, sortEntries);

		watch([() => entries.value, () => settings?.directoryView?.showHidden, () => props.searchFilterRegExp], () => {
			visibleEntries.value = entries.value.filter(entryFilterCallback);
		})

		watch(visibleEntries, emitStats);

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
			settings,
			entries,
			visibleEntries,
			entryRefs,
			getEntries,
			refresh,
			emitStats,
			sortEntries,
			entryFilterCallback,
			gatherEntries,
			getBorderSuppression,
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
		'deselectAll',
	]
}
</script>
