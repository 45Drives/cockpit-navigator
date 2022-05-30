<template>
	<template v-if="settings.directoryView?.view === 'list'">
		<tr
			v-show="show || showEntries"
			@dblclick.stop="doubleClickCallback"
			@click.stop.prevent="$emit('toggleSelected', { ctrlKey: $event.ctrlKey, shiftKey: $event.shiftKey })"
			:class="['hover:!bg-red-600/10 select-none']"
		>
			<td :class="['!pl-1', ...selectedClasses]">
				<div :class="['flex items-center gap-1']">
					<div :style="{ width: `${24 * level}px` }"></div>
					<div class="relative w-6">
						<component :is="icon" class="size-icon icon-default" />
						<LinkIcon
							v-if="entry.type === 'symbolic link'"
							class="w-2 h-2 absolute right-0 bottom-0 text-default"
						/>
					</div>
					<button v-if="directoryLike" @click.stop="toggleShowEntries">
						<ChevronDownIcon v-if="!showEntries" class="size-icon icon-default" />
						<ChevronUpIcon v-else class="size-icon icon-default" />
					</button>
					<div v-html="escapeStringHTML(entry.name)" :title="entry.name"></div>
					<div v-if="entry.type === 'symbolic link'" class="inline-flex gap-1 items-center">
						<div class="inline relative">
							<ArrowNarrowRightIcon class="text-default size-icon-sm inline" />
							<XIcon
								v-if="entry.target?.broken"
								class="icon-danger size-icon-sm absolute inset-x-0 bottom-0"
							/>
						</div>
						<div v-html="escapeStringHTML(entry.target?.rawPath ?? '')" :title="entry.target.rawPath"></div>
					</div>
				</div>
			</td>
			<td
				v-if="settings?.directoryView?.cols?.mode"
				:class="['font-mono', ...(selectedClasses)]"
			>{{ entry.modeStr }}</td>
			<td v-if="settings?.directoryView?.cols?.owner" :class="selectedClasses">{{ entry.owner }}</td>
			<td v-if="settings?.directoryView?.cols?.group" :class="selectedClasses">{{ entry.group }}</td>
			<td
				v-if="settings?.directoryView?.cols?.size"
				:class="['font-mono text-right', ...(selectedClasses)]"
			>{{ entry.sizeHuman }}</td>
			<td
				v-if="settings?.directoryView?.cols?.ctime"
				:class="selectedClasses"
			>{{ entry.ctime?.toLocaleString() ?? '-' }}</td>
			<td
				v-if="settings?.directoryView?.cols?.mtime"
				:class="selectedClasses"
			>{{ entry.mtime?.toLocaleString() ?? '-' }}</td>
			<td
				v-if="settings?.directoryView?.cols?.atime"
				:class="selectedClasses"
			>{{ entry.atime?.toLocaleString() ?? '-' }}</td>
		</tr>
		<component
			:show="show || showEntries"
			:is="DirectoryEntryList"
			v-if="directoryLike && showEntries"
			:host="host"
			:path="entry.path"
			:isChild="true"
			:sortCallback="inheritedSortCallback"
			:searchFilterRegExp="searchFilterRegExp"
			@cd="(...args) => $emit('cd', ...args)"
			@edit="(...args) => $emit('edit', ...args)"
			@startProcessing="(...args) => $emit('startProcessing', ...args)"
			@stopProcessing="(...args) => $emit('stopProcessing', ...args)"
			@cancelShowEntries="showEntries = false"
			@deselectAll="$emit('deselectAll')"
			ref="directoryViewRef"
			:level="level + 1"
		/>
	</template>
	<div
		v-else
		v-show="show"
		@dblclick.stop="doubleClickCallback"
		@click.stop.prevent="$emit('toggleSelected', { ctrlKey: $event.ctrlKey, shiftKey: $event.shiftKey })"
	>
		<div :class="[...selectedClasses, 'flex flex-col items-center w-20 overflow-hidden select-none']">
			<div class="relative w-20">
				<component :is="icon" class="icon-default w-20 h-auto" />
				<div
					:class="[directoryLike ? 'right-3 bottom-5' : 'right-5 bottom-3', 'inline absolute']"
					:title="`-> ${entry.target?.rawPath ?? '?'}`"
				>
					<LinkIcon
						v-if="entry.type === 'symbolic link'"
						:class="[entry.target?.broken ? 'text-red-300 dark:text-red-800' : 'text-gray-100 dark:text-gray-900', 'w-4 h-auto']"
					/>
				</div>
			</div>
			<div class="text-center w-full" style="overflow-wrap: break-word;">{{ entry.name }}</div>
		</div>
	</div>
</template>

<script>
import { ref, inject, watch, nextTick } from 'vue';
import { DocumentIcon, FolderIcon, LinkIcon, DocumentRemoveIcon, ArrowNarrowRightIcon, XIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid';
import { settingsInjectionKey } from '../keys';
import DirectoryEntryList from './DirectoryEntryList.vue';
import { escapeStringHTML } from '../functions/escapeStringHTML';

export default {
	name: 'DirectoryEntry',
	props: {
		host: String,
		entry: Object,
		show: Boolean,
		searchFilterRegExp: RegExp,
		inheritedSortCallback: {
			type: Function,
			required: false,
			default: null,
		},
		level: Number,
		neighboursSelected: Object,
	},
	setup(props, { emit }) {
		const settings = inject(settingsInjectionKey);
		const icon = ref(FolderIcon);
		const directoryLike = ref(false);
		const showEntries = ref(false);
		const directoryViewRef = ref();

		const selectedClasses = ref([]);

		const doubleClickCallback = () => {
			if (directoryLike.value) {
				emit('cd', props.entry.path);
			} else {
				emit('edit', props.entry.path);
			}
		}

		const refresh = () => {
			return directoryViewRef.value?.refresh?.();
		}

		const toggleShowEntries = () => {
			emit('startProcessing');
			nextTick(() => {
				showEntries.value = !showEntries.value;
				nextTick(() => emit('stopProcessing'));
			})
		}

		const getSelected = () => directoryViewRef.value?.getSelected?.() ?? [];

		const selectAll = () => {
			directoryViewRef.value?.selection.selectAll();
		}

		const deselectAllForward = () => {
			directoryViewRef.value?.selection.deselectAllForward();
		}

		watch(props.entry, () => {
			if (props.entry.type === 'directory' || (props.entry.type === 'symbolic link' && props.entry.target?.type === 'directory')) {
				icon.value = FolderIcon;
				directoryLike.value = true;
			} else {
				icon.value = DocumentIcon;
				directoryLike.value = false;
			}
		}, { immediate: true });

		watch([() => props.neighboursSelected, () => props.entry.selected, () => settings.directoryView?.view], () => selectedClasses.value = [
			'border-dashed border-red-600/50 first:border-l-2 last:border-r-2',
			props.entry.selected ? 'bg-red-600/5 first:border-l-red-600/50 last:border-r-red-600/50' : 'first:border-l-transparent last:border-r-transparent',
			props.entry.selected && (!props.neighboursSelected.above || settings.directoryView?.view !== 'list') ? 'border-t-2' : 'border-t-0',
			props.entry.selected && (!props.neighboursSelected.below || settings.directoryView?.view !== 'list') ? 'border-b-2' : 'border-b-0',
		], { immediate: true, deep: true });

		return {
			settings,
			icon,
			directoryLike,
			selectedClasses,
			showEntries,
			directoryViewRef,
			doubleClickCallback,
			refresh,
			toggleShowEntries,
			getSelected,
			selectAll,
			deselectAllForward,
			escapeStringHTML,
			DirectoryEntryList,
			nextTick,
		}
	},
	components: {
		DocumentIcon,
		FolderIcon,
		LinkIcon,
		DocumentRemoveIcon,
		ArrowNarrowRightIcon,
		XIcon,
		DirectoryEntryList,
		ChevronDownIcon,
		ChevronUpIcon,
	},
	emits: [
		'cd',
		'edit',
		'toggleSelected',
		'startProcessing',
		'stopProcessing',
		'deselectAll',
	]
}
</script>
