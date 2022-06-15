<template>
	<div class="h-full" @keydown="keyHandler($event)" tabindex="-1" :class="{ '!cursor-wait': processing }">
		<DragSelectArea class="h-full" @selectRectangle="selectRectangle" @mouseup.exact="deselectAll()">
			<Table :key="host + path" v-if="settings.directoryView?.view === 'list'" emptyText="No entries." noHeader stickyHeaders
				noShrink noShrinkHeight="h-full">
				<template #thead>
					<tr>
						<th class="!pl-1 border-l-2 border-l-transparent last:border-r-2 last:border-r-transparent">
							<div class="flex flex-row flex-nowrap gap-1 items-center">
								<div class="flex items-center justify-center w-6">
									<LoadingSpinner v-if="processing" class="size-icon" />
								</div>
								<div class="grow">Name</div>
								<SortCallbackButton initialFuncIsMine v-model="sortCallback"
									:compareFunc="sortCallbacks.name" />
							</div>
						</th>
						<th class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.mode">
							Mode</th>
						<th class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.owner">
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Owner</div>
								<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.owner" />
							</div>
						</th>
						<th class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.group">
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Group</div>
								<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.group" />
							</div>
						</th>
						<th class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.size">
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow text-right">Size</div>
								<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.size" />
							</div>
						</th>
						<th class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.ctime">
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Created</div>
								<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.ctime" />
							</div>
						</th>
						<th class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.mtime">
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Modified</div>
								<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.mtime" />
							</div>
						</th>
						<th class="last:border-r-2 last:border-r-transparent"
							v-if="settings?.directoryView?.cols?.atime">
							<div class="flex flex-row flex-nowrap gap-2 items-center">
								<div class="grow">Accessed</div>
								<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.atime" />
							</div>
						</th>
					</tr>
				</template>
				<template #tbody>
					<DirectoryEntryList :host="host" :path="path" :sortCallback="sortCallback"
						:searchFilterRegExp="searchFilterRegExp" @cd="(...args) => $emit('cd', ...args)"
						@edit="(...args) => $emit('edit', ...args)" @toggleSelected="toggleSelected"
						@startProcessing="processing++" @stopProcessing="processing--"
						@entryAction="(...args) => $emit('entryAction', ...args)" ref="directoryEntryListRef"
						:level="0" :cols="1" :selectedCount="selectedCount" />
				</template>
			</Table>
			<div v-else class="h-full">
				<div class="flex flex-row justify-start items-center px-6 py-2 gap-4 text-sm border-t border-default">
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Name</div>
						<SortCallbackButton initialFuncIsMine v-model="sortCallback"
							:compareFunc="sortCallbacks.name" />
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Owner</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.owner" />
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Group</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.group" />
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Size</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.size" />
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Created</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.ctime" />
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Modified</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.mtime" />
					</div>
					<div class="flex flex-row flex-nowrap gap-2 items-center">
						<div>Accessed</div>
						<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.atime" />
					</div>
				</div>
				<div :key="host + path" class="flex flex-wrap bg-well h-full overflow-y-auto content-start" ref="gridRef"
					@wheel="scrollHandler">
					<DirectoryEntryList :host="host" :path="path" :sortCallback="sortCallback"
						:searchFilterRegExp="searchFilterRegExp" @cd="(...args) => $emit('cd', ...args)"
						@edit="(...args) => $emit('edit', ...args)" @toggleSelected="toggleSelected"
						@startProcessing="processing++" @stopProcessing="processing--"
						@entryAction="(...args) => $emit('entryAction', ...args)" ref="directoryEntryListRef"
						:level="0" :cols="cols" :selectedCount="selectedCount" />
				</div>
			</div>
		</DragSelectArea>
	</div>
</template>

<script>
import { ref, inject, watch, onMounted, computed, onBeforeUnmount, onUpdated } from 'vue';
import Table from './Table.vue';
import { clipboardInjectionKey, notificationsInjectionKey, settingsInjectionKey } from '../keys';
import LoadingSpinner from './LoadingSpinner.vue';
import SortCallbackButton from './SortCallbackButton.vue';
import DirectoryEntryList from './DirectoryEntryList.vue';
import DragSelectArea from './DragSelectArea.vue';

export default {
	props: {
		host: String,
		path: String,
		searchFilterRegExp: RegExp,
	},
	setup(props) {
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
			ctime: (a, b) => (a.ctime?.getTime() ?? 0) - (b.ctime?.getTime() ?? 0),
			mtime: (a, b) => (a.mtime?.getTime() ?? 0) - (b.mtime?.getTime() ?? 0),
			atime: (a, b) => (a.atime?.getTime() ?? 0) - (b.atime?.getTime() ?? 0),
		}
		const sortCallback = ref(() => 0);

		const refresh = () => {
			return directoryEntryListRef.value?.refresh?.();
		}

		const getSelected = () => directoryEntryListRef.value?.gatherEntries().filter(entry => entry.selected) ?? [];

		const tallySelected = async () => selectedCount.value = getSelected().reduce((n) => n + 1, 0);

		let lastSelectedEntry = null;
		const toggleSelected = (entry, { ctrlKey, shiftKey }) => {
			try {
				const entrySelectedValue = entry.selected;
				if (!ctrlKey)
					deselectAll();
				if (shiftKey && lastSelectedEntry !== null) {
					const entries = directoryEntryListRef.value?.gatherEntries();
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
			directoryEntryListRef.value?.gatherEntries().map(entry => entry.selected = true);
			tallySelected();
		}

		const deselectAll = () => {
			directoryEntryListRef.value?.gatherEntries([], false).map(entry => entry.selected = false);
			tallySelected();
		}

		const selectRectangle = (rect, { ctrlKey, shiftKey }) => {
			if (!(ctrlKey || shiftKey))
				deselectAll();

			directoryEntryListRef.value?.gatherEntries().map(entry => {
				const entryRect = entry.DOMElement?.getBoundingClientRect();
				if (
					!entryRect
					|| rect.x1 > entryRect.right || rect.x2 < entryRect.left
					|| rect.y1 > entryRect.bottom || rect.y2 < entryRect.top
				)
					return;
				entry.selected = ctrlKey ? !entry.selected : true;
			});
		}

		/**
		 * @param {KeyboardEvent} event
		 */
		const keyHandler = (event) => {
			console.log("DirectoryView::keyHandler:", event);
			if (event.key === 'Escape') {
				if (getSelected().length === 0) {
					if (clipboard.content.length) {
						clipboard.content.map(entry => entry.cut = false);
						clipboard.content = [];
						notifications.value.constructNotification('Clipboard', 'Cleared clipboard.', 'info', 2000);
					}
				} else {
					deselectAll();
				}
			}
			if (event.ctrlKey) {
				const keypress = event.key.toLowerCase();
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
						const isCut = keypress === 'x';
						clipboard.content.map(entry => entry.cut = false);
						clipboard.content = getSelected().map(entry => {
							entry.cut = isCut;
							return entry;
						});
						notifications.value.constructNotification('Clipboard', `Copied ${clipboard.content.length} items to clipboard.`, 'info', 2000);
						break;
					case 'v':
						const selected = getSelected();
						let destination;
						if (selected.length === 1) {
							destination = selected[0];
							if (destination.type !== 'd' && !(destination.type === 'l' && destination.target.type === 'd')) {
								notifications.value.constructNotification("Paste Failed", 'Cannot paste to non-directory.', 'error');
								break;
							}
						} else if (selected.length === 0) {
							destination = { host: props.host, path: props.path };
						} else {
							notifications.value.constructNotification("Paste Failed", 'Cannot paste to multiple directories.', 'error');
							break;
						}
						console.log("paste", clipboard.content.map(entry => ({ host: entry.host, path: entry.path })), destination);
						break;
					default:
						return;
				}
			} else {
				return;
			}
			event.preventDefault();
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
		'cd',
		'edit',
		'entryAction',
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
	@apply !border-t-0;
}

tr.dir-entry-selected.suppress-border-b>td {
	@apply !border-b-0;
}

tr.dir-entry-selected.suppress-border-l>td {
	@apply !border-l-0;
}

tr.dir-entry-selected.suppress-border-r>td {
	@apply !border-r-0;
}

div.dir-entry-width {
	width: v-bind('`${settings.directoryView?.gridEntrySize ?? 80}px`');
}
</style>
