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
	<div
		class="h-full"
		@keydown="keyHandler($event)"
		tabindex="-1"
		:class="{ '!cursor-wait': processing }"
	>
		<DragSelectArea
			class="h-full"
			@selectRectangle="selectRectangle"
			@mouseup.exact="deselectAll"
			@contextmenu.prevent="contextMenuCallback"
		>
			<Table
				:key="host + path"
				v-if="settings.directoryView?.view === 'list'"
				emptyText="No entries."
				noHeader
				stickyHeaders
				noShrink
				noShrinkHeight="h-full"
				class="border-x-0"
			>
				<template #thead>
					<tr>
						<th class="!pl-1 border-l-2 border-l-transparent last:border-r-2 last:border-r-transparent">
							<div class="flex flex-row flex-nowrap gap-1 items-center">
								<div class="flex items-center justify-center w-6">
									<LoadingSpinner
										v-if="processing"
										class="size-icon"
									/>
								</div>
								<div class="grow">Name</div>
								<SortCallbackButton
									initialFuncIsMine
									v-model="sortCallback"
									:compareFunc="sortCallbacks.name"
								/>
							</div>
						</th>
						<th
							class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.mode"
						>
							Mode</th>
						<th
							class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.owner"
						>
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Owner</div>
								<SortCallbackButton
									v-model="sortCallback"
									:compareFunc="sortCallbacks.owner"
								/>
							</div>
						</th>
						<th
							class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.group"
						>
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Group</div>
								<SortCallbackButton
									v-model="sortCallback"
									:compareFunc="sortCallbacks.group"
								/>
							</div>
						</th>
						<th
							class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.size"
						>
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow text-right">Size</div>
								<SortCallbackButton
									v-model="sortCallback"
									:compareFunc="sortCallbacks.size"
								/>
							</div>
						</th>
						<th
							class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.btime"
						>
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Created</div>
								<SortCallbackButton
									v-model="sortCallback"
									:compareFunc="sortCallbacks.btime"
								/>
							</div>
						</th>
						<th
							class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.mtime"
						>
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Modified</div>
								<SortCallbackButton
									v-model="sortCallback"
									:compareFunc="sortCallbacks.mtime"
								/>
							</div>
						</th>
						<th
							class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.atime"
						>
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Accessed</div>
								<SortCallbackButton
									v-model="sortCallback"
									:compareFunc="sortCallbacks.atime"
								/>
							</div>
						</th>
					</tr>
				</template>
				<template #tbody>
					<DirectoryEntryList
						:host="host"
						:path="path"
						:sortCallback="sortCallback"
						:searchFilterRegExp="searchFilterRegExp"
						:level="0"
						:cols="1"
						:selectedCount="selectedCount"
						@tallySelected="tallySelected"
						@startProcessing="processing++"
						@stopProcessing="processing--"
						@browserAction="(...args) => $emit('browserAction', ...args)"
						@directoryViewAction="handleAction"
						ref="directoryEntryListRef"
					/>
				</template>
			</Table>
			<div
				v-else
				class="h-full flex flex-col items-stretch"
			>
				<div
					class="grow-0 flex flex-row justify-start items-center px-6 py-2 gap-4 text-sm border-t border-default">
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Name</div>
						<SortCallbackButton
							initialFuncIsMine
							v-model="sortCallback"
							:compareFunc="sortCallbacks.name"
						/>
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Owner</div>
						<SortCallbackButton
							v-model="sortCallback"
							:compareFunc="sortCallbacks.owner"
						/>
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Group</div>
						<SortCallbackButton
							v-model="sortCallback"
							:compareFunc="sortCallbacks.group"
						/>
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Size</div>
						<SortCallbackButton
							v-model="sortCallback"
							:compareFunc="sortCallbacks.size"
						/>
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Created</div>
						<SortCallbackButton
							v-model="sortCallback"
							:compareFunc="sortCallbacks.btime"
						/>
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Modified</div>
						<SortCallbackButton
							v-model="sortCallback"
							:compareFunc="sortCallbacks.mtime"
						/>
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Accessed</div>
						<SortCallbackButton
							v-model="sortCallback"
							:compareFunc="sortCallbacks.atime"
						/>
					</div>
				</div>
				<div
					:key="host + path"
					class="grow flex flex-wrap bg-well overflow-y-auto content-start"
					ref="gridRef"
					@wheel="scrollHandler"
				>
					<DirectoryEntryList
						:host="host"
						:path="path"
						:sortCallback="sortCallback"
						:searchFilterRegExp="searchFilterRegExp"
						:level="0"
						:cols="cols"
						:selectedCount="selectedCount"
						@startProcessing="processing++"
						@stopProcessing="processing--"
						@browserAction="(...args) => $emit('browserAction', ...args)"
						@directoryViewAction="handleAction"
						@tallySelected="tallySelected"
						ref="directoryEntryListRef"
					/>
				</div>
			</div>
		</DragSelectArea>
	</div>
	<Teleport to="#footer-text">
		<div v-if="selectedCount > 1">
			{{ selectedCount }} items selected
		</div>
	</Teleport>
</template>

<script>
import { ref, inject, watch, onMounted, onBeforeUnmount, onUpdated } from 'vue';
import Table from './Table.vue';
import { clipboardInjectionKey, notificationsInjectionKey, settingsInjectionKey } from '../keys';
import LoadingSpinner from './LoadingSpinner.vue';
import SortCallbackButton from './SortCallbackButton.vue';
import DirectoryEntryList from './DirectoryEntryList.vue';
import DragSelectArea from './DragSelectArea.vue';
import { commonPath } from '../functions/commonPath';

export default {
	props: {
		host: String,
		path: String,
		searchFilterRegExp: RegExp,
	},
	setup(props, { emit }) {
		/**
		 * @type {NavigatorSettings}
		 */
		const settings = inject(settingsInjectionKey);
		const clipboard = inject(clipboardInjectionKey);
		const notifications = inject(notificationsInjectionKey);
		const processing = ref(0);
		const directoryEntryListRef = ref();
		const gridRef = ref();
		const cols = ref(1);
		const selectedCount = ref(0);

		const sortCallbacks = {
			name: (a, b) => a.name.localeCompare(b.name),
			owner: (a, b) => a.owner.localeCompare(b.owner),
			group: (a, b) => a.group.localeCompare(b.group),
			size: (a, b) => a.size - b.size,
			btime: (a, b) => (a.btime?.getTime() ?? 0) - (b.btime?.getTime() ?? 0),
			mtime: (a, b) => (a.mtime?.getTime() ?? 0) - (b.mtime?.getTime() ?? 0),
			atime: (a, b) => (a.atime?.getTime() ?? 0) - (b.atime?.getTime() ?? 0),
		}
		const sortCallback = ref(() => 0);

		const refresh = () => {
			return directoryEntryListRef.value?.refresh?.();
		}

		/**
		 * Recursive get all entries for browser
		 * 
		 * @param {DirectoryEntryObj[]} - Holds all entries
		 * 
		 * @returns {DirectoryEntryObj[]} - the accumulator
		 */
		const gatherEntries = (accumulator = [], onlyVisible = true) => directoryEntryListRef.value?.gatherEntries(accumulator, onlyVisible) ?? [];

		const getSelected = () => gatherEntries().filter(entry => entry.selected);

		const tallySelected = () => {
			selectedCount.value = getSelected().length;
		}

		let lastSelectedEntry = null;
		const toggleSelected = (entry, { ctrlKey, shiftKey }) => {
			try {
				const entrySelectedValue = entry.selected;
				if (!ctrlKey)
					deselectAll();
				if (shiftKey && lastSelectedEntry !== null) {
					const entries = gatherEntries();
					let [startInd, endInd] = [entries.indexOf(lastSelectedEntry), entries.indexOf(entry)];
					if (startInd != -1 && endInd != -1) {
						if (endInd < startInd)
							[startInd, endInd] = [endInd, startInd];
						entries
							.slice(startInd, endInd + 1)
							.map(entry => entry.selected = true);
						return;
					}
				}
				entry.selected = ctrlKey ? !entrySelectedValue : true;
				if (entry.selected)
					lastSelectedEntry = entry;
				else
					lastSelectedEntry = null;
			} finally {
				tallySelected();
			}
		}

		const selectAll = () => {
			selectedCount.value = gatherEntries().map(entry => entry.selected = true).length ?? 0;
		}

		const deselectAll = () => {
			gatherEntries([], false).map(entry => entry.selected = false);
			selectedCount.value = 0;
		}

		const selectRectangle = (rect, { ctrlKey, shiftKey }) => {
			if (!(ctrlKey || shiftKey))
				deselectAll();

			gatherEntries().map(entry => {
				const entryRect = entry.DOMElement?.getBoundingClientRect();
				if (
					!entryRect
					|| rect.x1 > entryRect.right || rect.x2 < entryRect.left
					|| rect.y1 > entryRect.bottom || rect.y2 < entryRect.top
				)
					return;
				entry.selected = ctrlKey ? !entry.selected : true;
			});
			tallySelected();
		}

		const unCutEntries = () => gatherEntries([], false).map(entry => entry.cut = false);

		const clipboardStore = (items, cut = false, append = false) => {
			if (!append)
				unCutEntries();
			const newContent = items.map(entry => {
				entry.cut = cut;
				return {
					uniqueId: entry.uniqueId,
					host: entry.host,
					path: entry.path,
					name: entry.name,
					cut,
					clipboardRelativePath: entry.path.slice(props.path.length).replace(/^\//, '')
				};
			});
			if (append)
				clipboard.content = [...newContent, ...clipboard.content].filter((a, index, arr) => arr.findIndex(b => b.uniqueId === a.uniqueId) === index);
			else
				clipboard.content = newContent;
			const message = append
				? `Added ${newContent.length} items to clipboard.\n(${clipboard.content.length} items total)`
				: `${cut ? 'Cut' : 'Copied'} ${newContent.length} items to clipboard.`;
			notifications.value.constructNotification('Clipboard', message, 'info', 2000);
		}

		const paste = (destinations) => {
			let destination;
			if (destinations.length === 1) {
				destination = destinations[0];
				if (destination.resolvedType !== 'd') {
					notifications.value.constructNotification("Paste Failed", 'Cannot paste to non-directory.', 'error');
					return;
				}
			} else if (destinations.length === 0) {
				destination = { host: props.host, path: props.path };
			} else {
				notifications.value.constructNotification("Paste Failed", 'Cannot paste to multiple directories.', 'error');
				return;
			}
			console.log("paste", clipboard.content, destination);
			const fullSources = [...clipboard.content];
			const { common } = commonPath(fullSources.map(item => item.path));
			const groupedByHost = fullSources.reduce((res, item) => {
				if (!res[item.host])
					res[item.host] = [];
				res[item.host].push(item);
				return res;
			}, {});
			for (const host of Object.keys(groupedByHost)) {
				console.log(`rsync -avh ${groupedByHost[host].map(a => a.path).join(' ')} ${destination.host}:${destination.path}`);
			}
		}

		/**
		 * @param {KeyboardEvent} event
		 */
		const keyHandler = (event) => {
			const keypress = event.key.toLowerCase();
			const handleExact = (keypress) => {
				switch (keypress) {
					case 'delete':
						emit('browserAction', 'delete', getSelected());
						break;
					case 'escape':
						if (getSelected().length === 0) {
							if (clipboard.content.length) {
								unCutEntries();
								clipboard.content = [];
								notifications.value.constructNotification('Clipboard', 'Cleared clipboard.', 'info', 2000);
							}
						} else {
							deselectAll();
						}
						break;
					default:
						return;
				}
				event.preventDefault();
			}
			const handleCtrl = (keypress) => {
				switch (keypress) {
					case 'a':
						selectAll();
						break;
					case 'h':
						settings.directoryView.showHidden = !settings.directoryView.showHidden;
						notifications.value.constructNotification('Directory View Settings Updated', `Hidden files/directories are now ${settings.directoryView.showHidden ? '' : 'in'}visible.`, 'info', 2000);
						break;
					case 'c':
					case 'x':
						clipboardStore(getSelected(), keypress === 'x', event.shiftKey);
						break;
					case 'v':
						paste(getSelected());
						break;
					default:
						return;
				}
				event.preventDefault();
			}
			const handleShift = (keypress) => {
				switch(keypress) {
					default:
						return;
				}
				event.preventDefault();
			}
			const handleCtrlShift = (keypress) => {
				switch(keypress) {
					default:
						return;
				}
				event.preventDefault();
			}
			const handleAny = (keypress) => {
				switch(keypress) {
					default:
						return;
				}
				event.preventDefault();
			}
			if (event.ctrlKey && event.shiftKey) {
				handleCtrlShift(keypress);
			} else if (event.ctrlKey && !event.shiftKey) {
				handleCtrl(keypress);
			} else if (!event.ctrlKey && event.shiftKey) {
				handleShift(keypress);
			} else {
				handleExact(keypress);
			}
			handleAny(keypress);
		}

		const scrollHandler = (event) => {
			if (event.ctrlKey) {
				event.preventDefault();
				event.stopPropagation();
				console.log(event.deltaY);
				if (!event.deltaY)
					return;
				const direction = -event.deltaY / Math.abs(event.deltaY);
				const scale = Math.pow(1.1, direction);
				const candidate = settings.directoryView.gridEntrySize * scale;
				settings.directoryView.gridEntrySize = Math.max(40, Math.min(candidate, gridRef.value?.getBoundingClientRect().width ?? candidate));
			}
		}

		const contextMenuCallback = (event) => {
			if (!(event.ctrlKey || event.shiftKey)) {
				deselectAll();
			}
			emit('browserAction', 'contextMenu', event);
		}

		const handleAction = (action, ...args) => {
			switch (action) {
				case 'toggleSelected':
					toggleSelected(...args);
					break;
				case 'copy':
					clipboardStore(args?.flat(1) ?? getSelected(), false, false);
					break;
				case 'cut':
					clipboardStore(args?.flat(1) ?? getSelected(), true, false);
					break;
				case 'paste':
					paste(args?.flat(1) ?? getSelected());
					break;
				default:
					console.error('Unknown directoryViewAction:', action, args);
					break;
			}
		}

		const getCols = () => {
			const gridWidth = gridRef.value?.clientWidth;
			if (!gridWidth)
				return cols.value = 1;
			const entryWidth = settings.directoryView?.gridEntrySize;
			if (!entryWidth)
				return cols.value = 1;
			return cols.value = Math.floor(gridWidth / entryWidth);
		}

		onMounted(() => {
			getCols();
			watch(() => settings.directoryView.gridEntrySize, getCols);
			window.addEventListener('resize', getCols);
		});

		onUpdated(getCols);

		onBeforeUnmount(() => {
			window.removeEventListener('resize', getCols);
		});

		return {
			settings,
			processing,
			directoryEntryListRef,
			cols,
			selectedCount,
			gridRef,
			sortCallbacks,
			sortCallback,
			refresh,
			getSelected,
			keyHandler,
			scrollHandler,
			getSelected,
			toggleSelected,
			selectAll,
			deselectAll,
			selectRectangle,
			contextMenuCallback,
			handleAction,
			tallySelected,
		}
	},
	components: {
		DirectoryEntryList,
		Table,
		LoadingSpinner,
		SortCallbackButton,
		DragSelectArea,
	},
	emits: [
		'browserAction',
	]
}
</script>

<style>
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

tr.dir-entry-selected.suppress-border-t>td {
	@apply  !border-t-0;
}

tr.dir-entry-selected.suppress-border-b>td {
	@apply  !border-b-0;
}

tr.dir-entry-selected.suppress-border-l>td {
	@apply  !border-l-0;
}

tr.dir-entry-selected.suppress-border-r>td {
	@apply  !border-r-0;
}

div.dir-entry-width {
	width: v-bind('`${settings.directoryView?.gridEntrySize ?? 80}px`');
}

div.dir-entry div.multiline-ellipsis {
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}
</style>
