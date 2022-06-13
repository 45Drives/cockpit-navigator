<template>
	<div class="h-full" @keydown="keyHandler($event)" tabindex="-1" :class="{'!cursor-wait': processing}">
		<DragSelectArea class="h-full" @selectRectangle="selectRectangle" @mouseup.exact="deselectAll()">
			<Table v-if="settings.directoryView?.view === 'list'" emptyText="No entries." noHeader stickyHeaders
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
						@updateStats="(...args) => $emit('updateStats', ...args)" @startProcessing="processing++"
						@stopProcessing="processing--" ref="directoryEntryListRef" :level="0" :cols="1" />
				</template>
			</Table>
			<div v-else class="flex flex-wrap bg-well h-full overflow-y-auto content-start" ref="gridRef"
				@wheel="scrollHandler">
				<DirectoryEntryList :host="host" :path="path" :sortCallback="sortCallback"
					:searchFilterRegExp="searchFilterRegExp" @cd="(...args) => $emit('cd', ...args)"
					@edit="(...args) => $emit('edit', ...args)" @toggleSelected="toggleSelected"
					@updateStats="(...args) => $emit('updateStats', ...args)" @startProcessing="processing++"
					@stopProcessing="processing--" ref="directoryEntryListRef" :level="0" :cols="cols" />
			</div>
		</DragSelectArea>
	</div>
</template>

<script>
import { ref, inject, watch, onMounted, computed, onBeforeUnmount } from 'vue';
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

		let lastSelectedEntry = null;
		const toggleSelected = (entry, { ctrlKey, shiftKey }) => {
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
		}

		const selectAll = () => directoryEntryListRef.value?.gatherEntries().map(entry => entry.selected = true);

		const deselectAll = () => directoryEntryListRef.value?.gatherEntries([], false).map(entry => entry.selected = false);

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
						notifications.value.constructNotification('Clipboard', 'Cleared clipboard.', 'info', 1000);
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
						notifications.value.constructNotification('Directory View Settings Updated', `Hidden files/directories are now ${settings.directoryView.showHidden ? '' : 'in'}visible.`, 'info', 1000);
						break;
					case 'c':
					case 'x':
						const isCut = keypress === 'x';
						clipboard.content.map(entry => entry.cut = false);
						clipboard.content = getSelected().map(entry => {
							entry.cut = isCut;
							return entry;
						});
						notifications.value.constructNotification('Clipboard', `Copied ${clipboard.content.length} items to clipboard.`, 'info', 1000);
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
			const gridRect = gridRef.value?.getBoundingClientRect();
			if (!gridRect)
				return cols.value = 1;
			const entryWidth = settings.directoryView?.gridEntrySize;
			if (!entryWidth)
				return cols.value = 1;
			return cols.value = Math.floor(gridRect.width / entryWidth);
		}

		onMounted(() => {
			getCols();
			watch(() => settings.directoryView.gridEntrySize, getCols);
			window.addEventListener('resize', getCols);
		});

		onBeforeUnmount(() => {
			window.removeEventListener('resize', getCols);
		});

		return {
			settings,
			processing,
			directoryEntryListRef,
			cols,
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
		'updateStats',
	]
}
</script>
