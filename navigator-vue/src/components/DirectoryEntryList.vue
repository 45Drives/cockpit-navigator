<template>
	<template v-for="entry, index in entries" :key="entry.path">
		<DirectoryEntry
			:show="entryFilterCallback(entry)"
			:entry="entry"
			:inheritedSortCallback="sortCallback"
			:searchFilterRegExp="searchFilterRegExp"
			@cd="(...args) => $emit('cd', ...args)"
			@edit="(...args) => $emit('edit', ...args)"
			@toggleSelected="modifiers => selection.toggle(entry, index, modifiers)"
			@deselectAll="selection.deselectAllBackward()"
			@sortEntries="sortEntries"
			@updateStats="emitStats"
			@startProcessing="(...args) => $emit('startProcessing', ...args)"
			@stopProcessing="(...args) => $emit('stopProcessing', ...args)"
			ref="entryRefs"
			:level="level"
			:neighboursSelected="{ above: entries[index - 1]?.selected ?? false, below: entries[index + 1]?.selected ?? false }"
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
import getDirListing from '../functions/getDirListing';
import getDirEntryObjects from '../functions/getDirEntryObjects';

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
		const selection = reactive({
			lastSelectedInd: null,
			toggle: (entry, index, modifiers) => {
				const entrySelectedValue = entry.selected;
				if (!modifiers.ctrlKey) {
					const tmpLastSelectedInd = selection.lastSelectedInd;
					selection.deselectAllBackward();
					selection.lastSelectedInd = tmpLastSelectedInd;
				}
				if (modifiers.shiftKey && selection.lastSelectedInd !== null) {
					let [startInd, endInd] = [selection.lastSelectedInd, index];
					if (endInd < startInd)
						[startInd, endInd] = [endInd, startInd];
					entries.value
						.slice(startInd, endInd + 1)
						.filter(entryFilterCallback)
						.map(entry => entry.selected = true);
				} else {
					entry.selected = modifiers.ctrlKey ? !entrySelectedValue : true;
					if (entry.selected)
						selection.lastSelectedInd = index;
					else
						selection.lastSelectedInd = null;
				}
			},
			getSelected: () => [
				...entries.value.filter(entry => entry.selected),
				...entryRefs.value
					.filter(entryRef => entryRef.showEntries)
					.map(entryRef => entryRef.getSelected())
					.flat(1),
			],
			clear: () => {
				entries.value.map(entry => entry.selected = false);
			},
			selectAll: () => {
				entries.value
					.filter(entryFilterCallback)
					.map(entry => entry.selected = true);
				entryRefs.value
					.map(entryRef => entryRef.selectAll());
			},
			deselectAllBackward: () => {
				if (props.level > 0)
					emit('deselectAll');
				else
					selection.deselectAllForward();
			},
			deselectAllForward: () => {
				selection.clear();
				selection.lastSelectedInd = null;
				entryRefs.value
					.map(entryRef => entryRef.deselectAllForward());
			},
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
			selection.lastSelectedInd = null;
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
				procs.push(...entryRefs.value.filter(entryRef => entryRef.showEntries).map(entryRef => entryRef.getEntries()));
				const entryNames = await getDirListing(cwd, (message) => notifications.value.constructNotification("Failed to parse file name", message, 'error'));
				const tmpEntries = (
					await getDirEntryObjects(
						entryNames,
						cwd,
						(message) => notifications.value.constructNotification("Failed to parse file name", message, 'error')
					)
				).map(entry => reactive(entry));
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
			selection,
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
		'cancelShowEntries',
		'deselectAll',
	]
}
</script>
