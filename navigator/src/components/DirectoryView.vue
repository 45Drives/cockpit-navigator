<template>
	<div class="h-full" @keydown.prevent.stop="keyHandler($event)" tabindex="-1">
		<Table v-if="settings.directoryView?.view === 'list'" emptyText="No entries." noHeader stickyHeaders noShrink
			noShrinkHeight="h-full">
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
					<th class="last:border-r-2 last:border-r-transparent" v-if="settings?.directoryView?.cols?.mode">
						Mode</th>
					<th class="last:border-r-2 last:border-r-transparent" v-if="settings?.directoryView?.cols?.owner">
						<div class="flex flex-row flex-nowrap gap-2 items-center">
							<div class="grow">Owner</div>
							<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.owner" />
						</div>
					</th>
					<th class="last:border-r-2 last:border-r-transparent" v-if="settings?.directoryView?.cols?.group">
						<div class="flex flex-row flex-nowrap gap-2 items-center">
							<div class="grow">Group</div>
							<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.group" />
						</div>
					</th>
					<th class="last:border-r-2 last:border-r-transparent" v-if="settings?.directoryView?.cols?.size">
						<div class="flex flex-row flex-nowrap gap-2 items-center">
							<div class="grow text-right">Size</div>
							<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.size" />
						</div>
					</th>
					<th class="last:border-r-2 last:border-r-transparent" v-if="settings?.directoryView?.cols?.ctime">
						<div class="flex flex-row flex-nowrap gap-2 items-center">
							<div class="grow">Created</div>
							<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.ctime" />
						</div>
					</th>
					<th class="last:border-r-2 last:border-r-transparent" v-if="settings?.directoryView?.cols?.mtime">
						<div class="flex flex-row flex-nowrap gap-2 items-center">
							<div class="grow">Modified</div>
							<SortCallbackButton v-model="sortCallback" :compareFunc="sortCallbacks.mtime" />
						</div>
					</th>
					<th class="last:border-r-2 last:border-r-transparent" v-if="settings?.directoryView?.cols?.atime">
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
					@edit="(...args) => $emit('edit', ...args)"
					@updateStats="(...args) => $emit('updateStats', ...args)" @startProcessing="processing++"
					@stopProcessing="processing--" ref="directoryEntryListRef" :level="0" />
			</template>
		</Table>
		<div v-else class="flex flex-wrap p-2 gap-2 bg-well h-full overflow-y-auto content-start"
			@click.prevent.stop="directoryEntryListRef.selection.deselectAllForward()">
			<DirectoryEntryList :host="host" :path="path" :sortCallback="sortCallback"
				:searchFilterRegExp="searchFilterRegExp" @cd="(...args) => $emit('cd', ...args)"
				@edit="(...args) => $emit('edit', ...args)" @updateStats="(...args) => $emit('updateStats', ...args)"
				@startProcessing="processing++" @stopProcessing="processing--" ref="directoryEntryListRef" :level="0" />
		</div>
	</div>
</template>

<script>
import { ref, inject } from 'vue';
import Table from './Table.vue';
import { clipboardInjectionKey, notificationsInjectionKey, settingsInjectionKey } from '../keys';
import LoadingSpinner from './LoadingSpinner.vue';
import SortCallbackButton from './SortCallbackButton.vue';
import DirectoryEntryList from './DirectoryEntryList.vue';

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

		const getSelected = () => directoryEntryListRef.value.selection.getSelected() ?? [];

		/**
		 * @param {KeyboardEvent} event
		 */
		const keyHandler = (event) => {
			console.log("DirectoryView::keyHandler:", event);
			if (event.key === 'Escape')
				directoryEntryListRef.value?.selection.deselectAllForward();
			if (event.ctrlKey) {
				switch (event.key.toLowerCase()) {
					case 'a':
						directoryEntryListRef.value?.selection.selectAll();
						break;
					case 'h':
						settings.directoryView.showHidden = !settings.directoryView.showHidden;
						break;
					case 'c':
						clipboard.content = getSelected();
						break;
					case 'x':
						clipboard.content = getSelected().map(entry => {
							entry.cut = true;
							return entry;
						});
						break;
					case 'v':
						const selected = getSelected();
						let destination;
						if (selected.length === 1) {
							destination = selected[0];
							if (destination.type !== 'directory' && !(destination.type === 'symbolic link' && destination.target.type === 'directory')) {
								notifications.value.constructNotification("Paste Failed", 'Cannot paste to non-directory.', 'error');
								return;
							}
						} else if (selected.length === 0) {
							destination = { host: props.host, path: props.path };
						} else {
							notifications.value.constructNotification("Paste Failed", 'Cannot paste to multiple directories.', 'error');
							return;
						}
						console.log("paste", clipboard.content.map(entry => ({ host: entry.host, path: entry.path })), destination);
						break;
					default:
						break;
				}
			}
		}

		return {
			settings,
			processing,
			directoryEntryListRef,
			sortCallbacks,
			sortCallback,
			refresh,
			getSelected,
			keyHandler,
		}
	},
	components: {
		DirectoryEntryList,
		Table,
		LoadingSpinner,
		SortCallbackButton,
	},
	emits: [
		'cd',
		'edit',
		'updateStats',
	]
}
</script>
