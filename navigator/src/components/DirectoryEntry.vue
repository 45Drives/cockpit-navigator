<!--
Copyright (C) 2022 Josh Boudreau <jboudreau@45drives.com>

This file is part of Cockpit Navigator.

Cockpit Navigator is free software: you can redistribute it and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation, either version 3
of the License, or (at your option) any later version.

Cockpit Navigator is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Cockpit Navigator.
If not, see <https://www.gnu.org/licenses/>. 
-->

<template>
	<template v-if="settings.directoryView?.view === 'list'">
		<tr
			:class="{ 'select-none dir-entry': true, '!bg-red-600/10': hover && !entry.selected, '!bg-red-600/20': hover && entry.selected, 'dir-entry-selected': entry.selected, 'suppress-border-t': suppressBorderT, 'suppress-border-b': suppressBorderB }">
			<td class="!pl-1 relative">
				<div :class="[entry.cut ? 'line-through' : '', 'flex items-center gap-1']">
					<div class="indent-gap" />
					<div
						class="relative w-6"
						:class="[entry.cut ? 'text-gray-500/50' : 'icon-default']"
					>
						<FolderIcon
							v-if="entry.resolvedType === 'd'"
							class="size-icon"
						/>
						<DocumentIcon
							v-else
							class="size-icon"
						/>
						<LinkIcon
							v-if="entry.type === 'l'"
							class="w-2 h-2 absolute right-0 bottom-0 text-default"
						/>
					</div>
					<button
						class="z-10 icon-default"
						v-if="entry.resolvedType === 'd'"
						@click.stop="toggleShowEntries"
						@mouseenter="hover = true"
						@mouseleave="hover = false"
					>
						<ChevronDownIcon
							v-if="!showEntries"
							class="size-icon"
						/>
						<ChevronUpIcon
							v-else
							class="size-icon"
						/>
					</button>
					<div
						v-html="entry.nameHTML"
						:title="entry.name"
					></div>
					<div
						v-if="entry.type === 'l'"
						class="inline-flex gap-1 items-center"
					>
						<div class="inline relative">
							<ArrowNarrowRightIcon class="text-default size-icon-sm inline" />
							<XIcon
								v-if="entry.linkBroken"
								class="icon-danger size-icon-sm absolute inset-x-0 bottom-0"
							/>
						</div>
						<div
							v-html="entry.linkRawPathHTML ?? ''"
							:title="entry.linkRawPath"
						></div>
					</div>
				</div>
				<div
					class="absolute left-0 top-0 bottom-0 w-full max-w-[50vw]"
					@mouseup.stop
					@click.prevent="$emit('directoryViewAction', 'toggleSelected', entry, $event)"
					@contextmenu.prevent.stop="$emit('browserAction', 'contextMenu', entry, $event)"
					@dblclick="doubleClickCallback"
					@mouseenter="hover = true"
					@mouseleave="hover = false"
					ref="selectIntersectElement"
				/>
			</td>
			<td
				v-if="settings?.directoryView?.cols?.mode"
				class="font-mono"
			>{{ entry.modeStr }}</td>
			<td v-if="settings?.directoryView?.cols?.owner">{{ entry.owner }}</td>
			<td v-if="settings?.directoryView?.cols?.group">{{ entry.group }} </td>
			<td
				v-if="settings?.directoryView?.cols?.size"
				class="font-mono text-right"
			>{{ entry.sizeHuman }}</td>
			<td v-if="settings?.directoryView?.cols?.btime">{{ entry.btimeStr }}</td>
			<td v-if="settings?.directoryView?.cols?.mtime">{{ entry.mtimeStr }}</td>
			<td v-if="settings?.directoryView?.cols?.atime">{{ entry.atimeStr }}</td>
		</tr>
		<component
			:is="DirectoryEntryList"
			v-if="entry.resolvedType === 'd' && showEntries"
			:host="host"
			:path="entry.path"
			:isChild="true"
			:sortCallback="inheritedSortCallback"
			:searchFilterRegExp="searchFilterRegExp"
			:level="level + 1"
			:selectedCount="selectedCount"
			@browserAction="(...args) => $emit('browserAction', ...args)"
			@directoryViewAction="(...args) => $emit('directoryViewAction', ...args)"
			@startProcessing="(...args) => $emit('startProcessing', ...args)"
			@stopProcessing="(...args) => $emit('stopProcessing', ...args)"
			@cancelShowEntries="showEntries = false"
			ref="directoryEntryListRef"
		/>
	</template>
	<div
		v-else
		class="select-none dir-entry flex flex-col items-center overflow-hidden dir-entry-width p-2"
		:class="{ '!bg-red-600/10': hover && !entry.selected, '!bg-red-600/20': hover && entry.selected, 'dir-entry-selected': entry.selected, '!border-t-transparent': suppressBorderT, '!border-b-transparent': suppressBorderB, '!border-l-transparent': suppressBorderL, '!border-r-transparent': suppressBorderR }"
	>
		<div
			class="w-full"
			@dblclick="doubleClickCallback"
			@click.prevent="$emit('directoryViewAction', 'toggleSelected', entry, $event)"
			@mouseup.stop
			@contextmenu.prevent.stop="$emit('browserAction', 'contextMenu', entry, $event)"
			@mouseenter="hover = true"
			@mouseleave="hover = false"
			ref="selectIntersectElement"
		>
			<div
				class="relative w-full"
				:class="[entry.cut ? 'text-gray-500/50' : 'icon-default']"
			>
				<FolderIcon
					v-if="entry.resolvedType === 'd'"
					class="w-full h-auto"
				/>
				<DocumentIcon
					v-else
					class="w-full h-auto"
				/>
				<div
					:class="[entry.resolvedType === 'd' ? 'right-[15%] bottom-[25%]' : 'right-[25%] bottom-[15%]', 'inline absolute w-[20%]']"
					:title="`-> ${entry.linkRawPath ?? '?'}`"
				>
					<LinkIcon
						v-if="entry.type === 'l'"
						:class="[entry.linkBroken ? 'text-red-300 dark:text-red-800' : 'text-gray-100 dark:text-gray-900']"
					/>
				</div>
			</div>
			<div
				class="text-center w-full text-sm break-words"
				:class="{ 'multiline-ellipsis': entry.selected && selectedCount > 1, 'truncate': !entry.selected, 'line-through': entry.cut }"
				:title="entry.name"
				v-html="entry.nameHTML"
			></div>
		</div>
	</div>
	<Teleport
		to="#footer-text"
		v-if="entry.selected && selectedCount === 1"
	>
		<div>
			<span v-if="level > 0">{{ entry.path.split('/').slice(-1 * (level + 1)).join('/') }}:</span>
			<span v-else>{{ entry.name }}:</span>
			{{ entry.mode.toString(8) }}, {{ entry.owner }}:{{ entry.group }}, {{ entry.sizeHuman }},
			modified: {{ entry.mtimeStr }}
		</div>
	</Teleport>
</template>

<script>
import { ref, inject, nextTick, onMounted, onUpdated } from 'vue';
import { DocumentIcon, FolderIcon, LinkIcon, DocumentRemoveIcon, ArrowNarrowRightIcon, XIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/solid';
import { notificationsInjectionKey, settingsInjectionKey } from '../keys';
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
		const notifications = inject(notificationsInjectionKey);
		const showEntries = ref(false);
		const directoryEntryListRef = ref();
		const selectIntersectElement = ref();
		const hover = ref(false);

		const doubleClickCallback = () => {
			if (props.entry.resolvedType === 'd') {
				emit('browserAction', 'cd', props.entry);
			} else {
				emit('browserAction', 'openFilePrompt', props.entry);
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

		onUpdated(() => {
			emit('setEntryProp', 'DOMElement', selectIntersectElement.value);
		});

		return {
			settings,
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
			hover,
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
		'startProcessing',
		'stopProcessing',
		'setEntryProp',
		'browserAction',
		'directoryViewAction',
	]
}
</script>

<style>
.indent-gap {
	width: v-bind("`${24 * level}px`");
}
</style>
