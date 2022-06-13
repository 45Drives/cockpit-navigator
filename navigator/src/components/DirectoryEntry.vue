<template>
	<template v-if="settings.directoryView?.view === 'list'">
		<tr v-show="show || showEntries" @dblclick="doubleClickCallback"
			@click.prevent="$emit('toggleSelected', entry, $event)"
			:class="['hover:!bg-red-600/10 select-none dir-entry', entry.selected ? 'dir-entry-selected' : '']"
			ref="selectIntersectElement">
			<td class="!pl-1" :class="{ '!border-t-0': suppressBorders.top, '!border-b-0': suppressBorders.bottom }">
				<div :class="[entry.cut ? 'line-through' : '', 'flex items-center gap-1']">
					<div :style="{ width: `${24 * level}px` }"></div>
					<div class="relative w-6">
						<component :is="icon" class="size-icon icon-default" :class="{ 'text-gray-500/50': entry.cut }" />
						<LinkIcon v-if="entry.type === 'l'" class="w-2 h-2 absolute right-0 bottom-0 text-default" />
					</div>
					<button v-if="directoryLike" @click.stop="toggleShowEntries">
						<ChevronDownIcon v-if="!showEntries" class="size-icon icon-default" />
						<ChevronUpIcon v-else class="size-icon icon-default" />
					</button>
					<div v-html="escapeStringHTML(entry.name)" :title="entry.name"></div>
					<div v-if="entry.type === 'l'" class="inline-flex gap-1 items-center">
						<div class="inline relative">
							<ArrowNarrowRightIcon class="text-default size-icon-sm inline" />
							<XIcon v-if="entry.target?.broken"
								class="icon-danger size-icon-sm absolute inset-x-0 bottom-0" />
						</div>
						<div v-html="escapeStringHTML(entry.target?.rawPath ?? '')" :title="entry.target.rawPath"></div>
					</div>
				</div>
			</td>
			<td v-if="settings?.directoryView?.cols?.mode" class="font-mono"
				:class="{ '!border-t-0': suppressBorders.top, '!border-b-0': suppressBorders.bottom }">{{ entry.modeStr
				}}</td>
			<td v-if="settings?.directoryView?.cols?.owner"
				:class="{ '!border-t-0': suppressBorders.top, '!border-b-0': suppressBorders.bottom }">{{ entry.owner }}
			</td>
			<td v-if="settings?.directoryView?.cols?.group"
				:class="{ '!border-t-0': suppressBorders.top, '!border-b-0': suppressBorders.bottom }">{{ entry.group }}
			</td>
			<td v-if="settings?.directoryView?.cols?.size" class="font-mono text-right"
				:class="{ '!border-t-0': suppressBorders.top, '!border-b-0': suppressBorders.bottom }">{{
						entry.sizeHuman
				}}</td>
			<td v-if="settings?.directoryView?.cols?.ctime"
				:class="{ '!border-t-0': suppressBorders.top, '!border-b-0': suppressBorders.bottom }">{{
						entry.ctime?.toLocaleString() ?? '-'
				}}</td>
			<td v-if="settings?.directoryView?.cols?.mtime"
				:class="{ '!border-t-0': suppressBorders.top, '!border-b-0': suppressBorders.bottom }">{{
						entry.mtime?.toLocaleString() ?? '-'
				}}</td>
			<td v-if="settings?.directoryView?.cols?.atime"
				:class="{ '!border-t-0': suppressBorders.top, '!border-b-0': suppressBorders.bottom }">{{
						entry.atime?.toLocaleString() ?? '-'
				}}</td>
		</tr>
		<component :show="show || showEntries" :is="DirectoryEntryList" v-if="directoryLike && showEntries" :host="host"
			:path="entry.path" :isChild="true" :sortCallback="inheritedSortCallback"
			:searchFilterRegExp="searchFilterRegExp" @cd="(...args) => $emit('cd', ...args)"
			@edit="(...args) => $emit('edit', ...args)"
			@startProcessing="(...args) => $emit('startProcessing', ...args)"
			@stopProcessing="(...args) => $emit('stopProcessing', ...args)" @cancelShowEntries="showEntries = false"
			ref="directoryEntryListRef" :level="level + 1"
			@toggleSelected="(...args) => $emit('toggleSelected', ...args)" />
	</template>
	<template v-else>
		<div v-show="show" @dblclick="doubleClickCallback"
		@click.prevent="$emit('toggleSelected', entry, $event)"
		ref="selectIntersectElement"
		class="hover:!bg-red-600/10 select-none dir-entry flex flex-col items-center overflow-hidden entry-width p-2"
		:class="{ 'dir-entry-selected': entry.selected, '!border-t-transparent': suppressBorders.top, '!border-b-transparent': suppressBorders.bottom, '!border-l-transparent': suppressBorders.left, '!border-r-transparent': suppressBorders.right }">
			<div class="relative w-full">
				<component :is="icon" class="icon-default w-full h-auto" :class="{ 'text-gray-500/50': entry.cut }" />
				<div :class="[directoryLike ? 'right-[15%] bottom-[25%]' : 'right-[25%] bottom-[15%]', 'inline absolute w-[20%]']"
					:title="`-> ${entry.target?.rawPath ?? '?'}`">
					<LinkIcon v-if="entry.type === 'l'"
						:class="[entry.target?.broken ? 'text-red-300 dark:text-red-800' : 'text-gray-100 dark:text-gray-900']" />
				</div>
			</div>
			<div class="text-center w-full" :class="{ truncate: !entry.selected, 'line-through': entry.cut }" style="overflow-wrap: break-word;" v-html="escapeStringHTML(entry.name)" :title="entry.name"></div>
		</div>
	</template>
</template>

<script>
import { ref, inject, watch, nextTick, onBeforeUnmount, onMounted, onActivated, onDeactivated, onUpdated } from 'vue';
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
		suppressBorders: {
			type: Object,
			required: false,
			default: {
				top: false,
				bottom: false,
				left: false,
				right: false,
			}
		},
	},
	setup(props, { emit }) {
		const settings = inject(settingsInjectionKey);
		const icon = ref(FolderIcon);
		const directoryLike = ref(false);
		const showEntries = ref(false);
		const directoryEntryListRef = ref();
		const selectIntersectElement = ref();

		if (props.entry.type === 'd' || (props.entry.type === 'l' && props.entry.target?.type === 'd')) {
			icon.value = FolderIcon;
			directoryLike.value = true;
		} else {
			icon.value = DocumentIcon;
			directoryLike.value = false;
		}

		const doubleClickCallback = () => {
			if (directoryLike.value) {
				emit('cd', props.entry.path);
			} else {
				emit('edit', props.entry.path);
			}
		}

		const refresh = () => {
			return directoryEntryListRef.value?.refresh?.();
		}

		const toggleShowEntries = () => {
			showEntries.value = !showEntries.value;
			emit('setEntryProp', 'dirOpen', showEntries.value);
		}

		/**
		 * Recursive get all entries for browser
		 * 
		 * @param {DirectoryEntryObj[]} - Holds all entries
		 * 
		 * @returns {DirectoryEntryObj[]} - the accumulator
		 */
		const gatherEntries = (accumulator = [], onlyVisible = true) => {
			return directoryEntryListRef.value?.gatherEntries(accumulator, onlyVisible) ?? accumulator;
		}

		onMounted(() => {
			emit('setEntryProp', 'DOMElement', selectIntersectElement.value);
		})

		onUpdated(() => {
			emit('setEntryProp', 'DOMElement', selectIntersectElement.value);
		});

		onBeforeUnmount(() => {
			emit('setEntryProp', 'dirOpen', false)
			emit('setEntryProp', 'DOMElement', undefined), { immediate: true }
		});

		return {
			settings,
			icon,
			directoryLike,
			showEntries,
			directoryEntryListRef,
			doubleClickCallback,
			refresh,
			toggleShowEntries,
			gatherEntries,
			escapeStringHTML,
			DirectoryEntryList,
			nextTick,
			selectIntersectElement,
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
		'setEntryProp',
	]
}
</script>

<style scoped>
tr.dir-entry>td {
	@apply border-solid border-y-red-600/50 border-y-0 first:border-l last:border-r first:border-l-transparent last:border-r-transparent;
}

tr.dir-entry-selected>td {
	@apply border-y first:border-l-red-600/50 last:border-red-600/50 bg-red-600/10;
}

div.dir-entry {
	@apply border-solid border border-transparent;
}

div.dir-entry-selected {
	@apply border-red-600/50 bg-red-600/10;
}

div.entry-width {
	width: v-bind('`${settings.directoryView?.gridEntrySize ?? 80}px`');
}
</style>
