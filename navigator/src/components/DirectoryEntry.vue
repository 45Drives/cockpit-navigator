<template>
	<template v-if="settings.directoryView?.view === 'list'">
		<tr @dblclick="doubleClickCallback" @click.prevent="$emit('toggleSelected', entry, $event)"
			:class="{'hover:!bg-red-600/10 select-none dir-entry': true, 'dir-entry-selected': entry.selected, 'suppress-border-t': suppressBorderT, 'suppress-border-b': suppressBorderB }"
			ref="selectIntersectElement">
			<td class="!pl-1" >
				<div :class="[entry.cut ? 'line-through' : '', 'flex items-center gap-1']">
					<div class="w-6" v-for="i in Array(level).fill(0)" v-memo="[level]"></div>
					<div class="relative w-6">
						<component :is="icon" class="size-icon icon-default"
							:class="{ 'text-gray-500/50': entry.cut }" />
						<LinkIcon v-if="entry.type === 'l'" class="w-2 h-2 absolute right-0 bottom-0 text-default" />
					</div>
					<button v-if="directoryLike" @click.stop="toggleShowEntries">
						<ChevronDownIcon v-if="!showEntries" class="size-icon icon-default" />
						<ChevronUpIcon v-else class="size-icon icon-default" />
					</button>
					<div v-html="entry.nameHTML" :title="entry.name"></div>
					<div v-if="entry.type === 'l'" class="inline-flex gap-1 items-center">
						<div class="inline relative">
							<ArrowNarrowRightIcon class="text-default size-icon-sm inline" />
							<XIcon v-if="entry.target?.broken"
								class="icon-danger size-icon-sm absolute inset-x-0 bottom-0" />
						</div>
						<div v-html="entry.target?.rawPathHTML ?? ''" :title="entry.target.rawPath"></div>
					</div>
				</div>
			</td>
			<td v-if="settings?.directoryView?.cols?.mode" class="font-mono"
				>{{ entry.modeStr
				}}</td>
			<td v-if="settings?.directoryView?.cols?.owner"
				>{{ entry.owner }}
			</td>
			<td v-if="settings?.directoryView?.cols?.group"
				>{{ entry.group }}
			</td>
			<td v-if="settings?.directoryView?.cols?.size" class="font-mono text-right"
				>{{
						entry.sizeHuman
				}}</td>
			<td v-if="settings?.directoryView?.cols?.ctime"
				>{{
						entry.ctimeStr
				}}</td>
			<td v-if="settings?.directoryView?.cols?.mtime"
				>{{
						entry.mtimeStr
				}}</td>
			<td v-if="settings?.directoryView?.cols?.atime"
				>{{
						entry.atimeStr
				}}</td>
		</tr>
		<component :is="DirectoryEntryList" v-if="directoryLike && showEntries" :host="host" :path="entry.path"
			:isChild="true" :sortCallback="inheritedSortCallback" :searchFilterRegExp="searchFilterRegExp"
			@cd="(...args) => $emit('cd', ...args)" @edit="(...args) => $emit('edit', ...args)"
			@startProcessing="(...args) => $emit('startProcessing', ...args)"
			@stopProcessing="(...args) => $emit('stopProcessing', ...args)" @cancelShowEntries="showEntries = false"
			ref="directoryEntryListRef" :level="level + 1" :selectedCount="selectedCount"
			@toggleSelected="(...args) => $emit('toggleSelected', ...args)"
			@entryAction="(...args) => $emit('entryAction', ...args)" />
	</template>
	<div v-else @dblclick="doubleClickCallback" @click.prevent="$emit('toggleSelected', entry, $event)"
		ref="selectIntersectElement"
		class="hover:!bg-red-600/10 select-none dir-entry flex flex-col items-center overflow-hidden dir-entry-width p-2"
		:class="{ 'dir-entry-selected': entry.selected, '!border-t-transparent': suppressBorderT, '!border-b-transparent': suppressBorderB, '!border-l-transparent': suppressBorderL, '!border-r-transparent': suppressBorderR }">
		<div class="relative w-full">
			<component :is="icon" class="icon-default w-full h-auto" :class="{ 'text-gray-500/50': entry.cut }" />
			<div :class="[directoryLike ? 'right-[15%] bottom-[25%]' : 'right-[25%] bottom-[15%]', 'inline absolute w-[20%]']"
				:title="`-> ${entry.target?.rawPath ?? '?'}`">
				<LinkIcon v-if="entry.type === 'l'"
					:class="[entry.target?.broken ? 'text-red-300 dark:text-red-800' : 'text-gray-100 dark:text-gray-900']" />
			</div>
		</div>
		<div class="text-center w-full break-words"
			:class="{ truncate: !entry.selected, 'line-through': entry.cut }" v-html="escapeStringHTML(entry.name)"
			:title="entry.name"></div>
	</div>
	<Teleport to="#footer-text" v-if="entry.selected && selectedCount === 1">
		<div>
			<span v-if="level > 0">{{ entry.path.split('/').slice(-1 * (level+1)).join('/') }}:</span>
			<span v-else>{{ entry.name }}:</span>
			{{ entry.mode.toString(8) }}, {{ entry.owner }}:{{ entry.group }}, {{ entry.sizeHuman }}
		</div>
	</Teleport>
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
		searchFilterRegExp: RegExp,
		inheritedSortCallback: {
			type: Function,
			required: false,
			default: null,
		},
		level: Number,
		selectedCount: Number,
		suppressBorderL: Boolean,
		suppressBorderR: Boolean,
		suppressBorderT: Boolean,
		suppressBorderB: Boolean,
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
				emit('entryAction', 'openPrompt', props.entry);
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
		'entryAction',
	]
}
</script>
