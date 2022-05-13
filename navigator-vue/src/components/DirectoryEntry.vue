<template>
	<tr
		v-show="!/^\./.test(entry.name) || settings?.directoryView?.showHidden"
		v-if="settings.directoryView?.view === 'list'"
		@dblclick="doubleClickCallback"
		class="hover:!bg-red-600/10"
	>
		<td class="flex items-center gap-1 !pl-1">
			<div :style="{ width: `${24 * level}px` }"></div>
			<div class="relative w-6">
				<component :is="icon" class="size-icon icon-default" />
				<LinkIcon v-if="entry.type === 'link'" class="w-2 h-2 absolute right-0 bottom-0 text-default" />
			</div>
			<button v-if="directoryLike" @click.stop="showEntries = !showEntries">
				<ChevronDownIcon v-if="!showEntries" class="size-icon icon-default" />
				<ChevronUpIcon v-else class="size-icon icon-default" />
			</button>
			<div>{{ entry.name }}</div>
			<div v-if="entry.type === 'link'" class="inline-flex gap-1 items-center">
				<div class="inline relative">
					<ArrowNarrowRightIcon class="text-default size-icon-sm inline" />
					<XIcon
						v-if="entry.target?.broken"
						class="icon-danger size-icon-sm absolute inset-x-0 bottom-0"
					/>
				</div>
				<div>{{ entry.target?.rawPath ?? '' }}</div>
			</div>
		</td>
		<td v-if="settings?.directoryView?.cols?.mode" class="font-mono">{{ entry.modeStr }}</td>
		<td v-if="settings?.directoryView?.cols?.owner">{{ entry.owner }}</td>
		<td v-if="settings?.directoryView?.cols?.group">{{ entry.group }}</td>
		<td v-if="settings?.directoryView?.cols?.size">{{ entry.sizeHuman }}</td>
		<td v-if="settings?.directoryView?.cols?.ctime">{{ entry.ctime?.toLocaleString() ?? '-' }}</td>
		<td v-if="settings?.directoryView?.cols?.mtime">{{ entry.mtime?.toLocaleString() ?? '-' }}</td>
		<td v-if="settings?.directoryView?.cols?.atime">{{ entry.atime?.toLocaleString() ?? '-' }}</td>
	</tr>
	<div
		v-else
		v-show="!/^\./.test(entry.name) || settings?.directoryView?.showHidden"
		@dblclick="doubleClickCallback"
		class="flex flex-col items-center w-20 overflow-hidden"
	>
		<div class="relative w-20">
			<component :is="icon" class="icon-default w-20 h-auto" />
			<div :class="[directoryLike ? 'right-3 bottom-5' : 'right-5 bottom-3', 'inline absolute']" :title="`-> ${entry.target?.rawPath ?? '?'}`">
				<LinkIcon v-if="entry.type === 'link'" :class="[entry.target?.broken ? 'text-red-300 dark:text-red-800' : 'text-gray-100 dark:text-gray-900','w-4 h-auto']" />
			</div>
		</div>
		<div class="text-center w-full" style="overflow-wrap: break-word;">{{ entry.name }}</div>
	</div>
	<component
		:is="DirectoryEntryList"
		v-if="directoryLike && showEntries"
		:path="entry.path"
		:isChild="true"
		:inheritedSortCallback="inheritedSortCallback"
		@cd="(...args) => $emit('cd', ...args)"
		@edit="(...args) => $emit('edit', ...args)"
		@startProcessing="(...args) => $emit('startProcessing', ...args)"
		@stopProcessing="(...args) => $emit('stopProcessing', ...args)"
		ref="directoryViewRef"
		:level="level + 1"
	/>
</template>

<script>
import { ref, inject, watch } from 'vue';
import { DocumentIcon, FolderIcon, LinkIcon, DocumentRemoveIcon, ArrowNarrowRightIcon, XIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid';
import { settingsInjectionKey } from '../keys';
import DirectoryEntryList from './DirectoryEntryList.vue';

export default {
	name: 'DirectoryEntry',
	props: {
		entry: Object,
		inheritedSortCallback: {
			type: Function,
			required: false,
			default: null,
		},
		level: Number,
	},
	setup(props, { emit }) {
		const settings = inject(settingsInjectionKey);
		const icon = ref(FolderIcon);
		const directoryLike = ref(false);
		const showEntries = ref(false);
		const directoryViewRef = ref();

		const doubleClickCallback = () => {
			if (directoryLike.value) {
				emit('cd', props.entry.path);
			} else {
				emit('edit', props.entry.path);
			}
		}

		const getEntries = () => {
			return directoryViewRef.value?.getEntries?.();
		}

		watch(props.entry, () => {
			if (props.entry.type === 'directory' || (props.entry.type === 'link' && props.entry.target?.type === 'directory')) {
				icon.value = FolderIcon;
				directoryLike.value = true;
			} else {
				icon.value = DocumentIcon;
				directoryLike.value = false;
			}
		}, { immediate: true });

		return {
			settings,
			icon,
			directoryLike,
			showEntries,
			directoryViewRef,
			doubleClickCallback,
			getEntries,
			DirectoryEntryList,
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
		'startProcessing',
		'stopProcessing',
	]
}
</script>
