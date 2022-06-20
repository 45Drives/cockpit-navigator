<template>
	<div class="grow overflow-hidden">
		<div class="h-full flex flex-col items-stretch">
			<div
				class="grid grid-cols-[auto_1fr] grid-rows-[1fr 1fr] md:grid-cols-[auto_3fr_1fr] md:grid-row-[1fr] items-stretch divide-x divide-y divide-default">
				<div class="button-group-row p-1 md:px-4 md:py-2 border-t border-default">
					<button
						class="p-2 rounded-lg hover:bg-accent relative"
						:disabled="!pathHistory.backAllowed()"
						@click="back()"
						@mouseenter="backHistoryDropdown.mouseEnter"
						@mouseleave="backHistoryDropdown.mouseLeave"
					>
						<ArrowLeftIcon class="size-icon icon-default" />
						<ChevronDownIcon
							class="w-3 h-3 icon-default absolute bottom-1 right-1"
							v-if="pathHistory.backAllowed()"
						/>
						<div
							v-if="backHistoryDropdown.showDropdown"
							class="absolute top-full left-0 flex flex-col items-stretch z-50 bg-default shadow-lg rounded-lg overflow-y-auto max-h-80"
						>
							<div
								v-for="item, index in pathHistory.stack.slice(0, pathHistory.index).reverse()"
								:key="index"
								class="hover:text-white hover:bg-red-600 px-4 py-2 text-sm text-left whitespace-nowrap"
								@click="pathHistory.index = pathHistory.index - index"
							>
								<span v-if="item.host !== pathHistory.current()?.host">
									{{ item.host ?? cockpit.transport.host }}:
								</span>
								{{ item.path }}
							</div>
						</div>
					</button>
					<button
						class="p-2 rounded-lg hover:bg-accent relative"
						:disabled="!pathHistory.forwardAllowed()"
						@click="forward()"
						@mouseenter="forwardHistoryDropdown.mouseEnter"
						@mouseleave="forwardHistoryDropdown.mouseLeave"
					>
						<ArrowRightIcon class="size-icon icon-default" />
						<ChevronDownIcon
							class="w-3 h-3 icon-default absolute bottom-1 right-1"
							v-if="pathHistory.forwardAllowed()"
						/>
						<div
							v-if="forwardHistoryDropdown.showDropdown"
							class="absolute top-full left-0 flex flex-col items-stretch z-50 bg-default shadow-lg rounded-lg overflow-y-auto max-h-80"
						>
							<div
								v-for="item, index in pathHistory.stack.slice(pathHistory.index + 1)"
								:key="index"
								class="hover:text-white hover:bg-red-600 px-4 py-2 text-sm text-left whitespace-nowrap"
								@click="pathHistory.index = pathHistory.index + index"
							>
								<span v-if="item.host !== pathHistory.current()?.host">
									{{ item.host ?? cockpit.transport.host }}:
								</span>
								{{ item.path }}
							</div>
						</div>
					</button>
					<button
						class="p-2 rounded-lg hover:bg-accent"
						:disabled="pathHistory.current() === '/'"
						@click="up()"
					>
						<ArrowUpIcon class="size-icon icon-default" />
					</button>
					<button
						class="p-2 rounded-lg hover:bg-accent"
						@click="directoryViewRef.refresh()"
					>
						<RefreshIcon class="size-icon icon-default" />
					</button>
				</div>

				<div
					class="p-1 md:px-4 md:py-2 col-start-1 col-end-3 row-start-2 row-end-3 md:col-start-auto md:col-end-auto md:row-start-auto md:row-end-auto">
					<PathBreadCrumbs
						:host="pathHistory.current()?.host"
						:path="pathHistory.current()?.path ?? '/'"
						@cd="cd"
					/>
				</div>

				<div class="p-1 md:px-4 md:py-2">
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<SearchIcon
								class="size-icon icon-default"
								aria-hidden="true"
							/>
						</div>
						<input
							type="text"
							class="block input-textlike w-full pl-10"
							v-model="searchFilterStr"
							placeholder="Search in directory (foo*, b?r, *.jpg)"
						/>
					</div>
				</div>
			</div>
			<div class="grow overflow-hidden">
				<DirectoryView
					:host="pathHistory.current()?.host"
					:path="pathHistory.current()?.path"
					:searchFilterRegExp="searchFilterRegExp"
					@cd="path => cd({ path })"
					@edit="openEditor"
					@browserAction="handleAction"
					ref="directoryViewRef"
				/>
			</div>
		</div>
	</div>
	<ModalPopup
		:showModal="openFilePromptModal.show"
		:headerText="openFilePromptModal.entry?.name ?? 'NULL'"
		autoWidth
		@close="() => openFilePromptModal.close()"
	>
		What would you like to do with this {{ openFilePromptModal.entry?.resolvedTypeHuman }}?
		<template #footer>
			<button
				type="button"
				class="btn btn-secondary"
				@click="() => openFilePromptModal.close()"
			>
				Cancel
			</button>
			<button
				type="button"
				class="btn btn-primary"
				@click="() => openFilePromptModal.action('editPermissions')"
			>
				Edit permissions
			</button>
			<button
				v-if="openFilePromptModal.entry?.resolvedType === 'f'"
				type="button"
				class="btn btn-primary"
				@click="() => openFilePromptModal.action('edit')"
			>
				Open for editing
			</button>
			<button
				v-if="openFilePromptModal.entry?.resolvedType === 'f'"
				type="button"
				class="btn btn-primary"
				@click="() => openFilePromptModal.action('download')"
			>
				Download
			</button>
		</template>
	</ModalPopup>
	<FilePermissions
		:show="filePermissions.show"
		:entry="filePermissions.entry"
		@hide="filePermissions.close"
	/>
	<ContextMenu
		:show="contextMenu.show"
		:selection="contextMenu.selection"
		:event="contextMenu.event"
		:currentDirEntry="{...pathHistory.current(), name: `Current directory (${pathHistory.current().path.split('/').pop()})`}"
		@browserAction="handleAction"
		@hide="contextMenu.close"
	/>
	<Teleport to="#footer-buttons">
		<IconToggle
			v-model="darkMode"
			v-slot="{ value }"
		>
			<MoonIcon
				v-if="value"
				class="size-icon icon-default"
			/>
			<SunIcon
				v-else
				class="size-icon icon-default"
			/>
		</IconToggle>
		<IconToggle
			v-model="settings.directoryView.showHidden"
			v-slot="{ value }"
		>
			<EyeIcon
				v-if="value"
				class="size-icon icon-default"
			/>
			<EyeOffIcon
				v-else
				class="size-icon icon-default"
			/>
		</IconToggle>
		<IconToggle
			v-model="settings.directoryView.view"
			trueValue="list"
			falseValue="grid"
			v-slot="{ value }"
		>
			<ViewListIcon
				v-if="value"
				class="size-icon icon-default"
			/>
			<ViewGridIcon
				v-else
				class="size-icon icon-default"
			/>
		</IconToggle>
	</Teleport>
</template>

<script>
import { inject, ref, reactive, watch, nextTick } from 'vue';
import { useRoute, useRouter } from "vue-router";
import DirectoryView from "../components/DirectoryView.vue";
import PathBreadCrumbs from '../components/PathBreadCrumbs.vue';
import { notificationsInjectionKey, pathHistoryInjectionKey, lastPathStorageKey, settingsInjectionKey } from '../keys';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, RefreshIcon, ChevronDownIcon, SearchIcon, SunIcon, MoonIcon, EyeIcon, EyeOffIcon, ViewListIcon, ViewGridIcon } from '@heroicons/vue/solid';
import IconToggle from '../components/IconToggle.vue';
import ModalPopup from '../components/ModalPopup.vue';
import { fileDownload } from '@45drives/cockpit-helpers';
import FilePermissions from '../components/FilePermissions.vue';
import ContextMenu from '../components/ContextMenu.vue';

const encodePartial = (string) =>
	encodeURIComponent(string)
		.replace(/%40/g, '@')
		.replace(/%3D/g, '=')
		.replace(/%2B/g, '+')
		.replace(/%2F/g, '/')
		.replace(/%20/g, ' ');

export default {
	setup() {
		const darkMode = inject('darkModeInjectionKey');
		const settings = inject(settingsInjectionKey);
		const notifications = inject(notificationsInjectionKey);
		const route = useRoute();
		const router = useRouter();
		const pathHistory = inject(pathHistoryInjectionKey);
		const directoryViewRef = ref();
		const searchFilterStr = ref("");
		const searchFilterRegExp = ref(/^/g);
		const backHistoryDropdown = reactive({
			showDropdown: false,
			timeoutHandle: null,
			mouseEnter: () => {
				backHistoryDropdown.timeoutHandle = setTimeout(() => backHistoryDropdown.showDropdown = true, 500);
				forwardHistoryDropdown.mouseLeave();
			},
			mouseLeave: () => {
				if (backHistoryDropdown.timeoutHandle)
					clearTimeout(backHistoryDropdown.timeoutHandle);
				backHistoryDropdown.timeoutHandle = null;
				backHistoryDropdown.showDropdown = false;
			}
		});
		const forwardHistoryDropdown = reactive({
			showDropdown: false,
			timeoutHandle: null,
			mouseEnter: () => {
				forwardHistoryDropdown.timeoutHandle = setTimeout(() => forwardHistoryDropdown.showDropdown = true, 500);
				backHistoryDropdown.mouseLeave();
			},
			mouseLeave: () => {
				if (forwardHistoryDropdown.timeoutHandle)
					clearTimeout(forwardHistoryDropdown.timeoutHandle);
				forwardHistoryDropdown.timeoutHandle = null;
				forwardHistoryDropdown.showDropdown = false;
			}
		});
		const openFilePromptModal = reactive({
			show: false,
			entry: null,
			resetTimeoutHandle: null,
			open: (entry) => {
				clearTimeout(openFilePromptModal.resetTimeoutHandle);
				openFilePromptModal.entry = entry;
				openFilePromptModal.show = true;
			},
			close: () => {
				openFilePromptModal.show = false;
				openFilePromptModal.resetTimeoutHandle = setTimeout(() => openFilePromptModal.resetTimeoutHandle = openFilePromptModal.entry = null, 500);
			},
			action: (action) => {
				handleAction(action, openFilePromptModal.entry);
				openFilePromptModal.close();
			}
		});
		const filePermissions = reactive({
			show: false,
			entry: null,
			resetTimeoutHandle: null,
			open: (entry) => {
				clearTimeout(filePermissions.resetTimeoutHandle);
				filePermissions.entry = entry;
				filePermissions.show = true;
			},
			close: () => {
				filePermissions.show = false;
				filePermissions.resetTimeoutHandle = setTimeout(() => filePermissions.resetTimeoutHandle = filePermissions.entry = null, 500);
			},
		});
		const contextMenu = reactive({
			show: false,
			selection: [],
			event: null,
			resetTimeoutHandle: null,
			open: (event) => {
				clearTimeout(contextMenu.resetTimeoutHandle);
				contextMenu.selection = getSelected();
				contextMenu.event = event;
				contextMenu.show = true;
			},
			close: () => {
				contextMenu.show = false;
				contextMenu.resetTimeoutHandle = setTimeout(() => {
					contextMenu.resetTimeoutHandle = contextMenu.selection = [];
					contextMenu.resetTimeoutHandle = contextMenu.event = null;
				}, 500);
			},
		});

		const cd = ({ path, host }) => {
			const newHost = host ?? (pathHistory.current().host);
			const newPath = encodePartial(path ?? (pathHistory.current().path));
			router.push(`/browse/${newHost}${newPath}`);
		};

		const back = () => {
			cd(pathHistory.back() ?? { path: '/' });
		}

		const forward = () => {
			cd(pathHistory.forward() ?? { path: '/' });
		}

		const up = () => {
			cd({ path: pathHistory.current().path + '/..' });
		}

		const openEditor = ({ path, host }) => {
			const newHost = host ?? (pathHistory.current().host);
			const newPath = encodePartial(path ?? (pathHistory.current().path));
			router.push(`/edit/${newHost}${newPath}`);
		}

		const download = (selection) => {
			const items = [].concat(selection); // forces to be array
			if (items.length === 1 && items[0].resolvedType === 'f') {
				let { path, name, host } = items[0];
				fileDownload(path, name, host);
			}
		}

		const getSelected = () => directoryViewRef.value?.getSelected?.() ?? [];

		const handleAction = (action, ...args) => {
			switch (action) {
				case 'cd':
					cd(...args);
					break;
				case 'edit':
					openEditor(...args);
					break;
				case 'editPermissions':
					filePermissions.open(...args);
					break;
				case 'openFilePrompt':
					openFilePromptModal.open(...args);
					break;
				case 'download':
					download(...args);
					break;
				case 'contextMenu':
					contextMenu.open(...args);
					break;
				case 'back':
					back();
					break;
				case 'forward':
					forward();
					break;
				case 'up':
					up();
					break;
				default:
					console.error('Unknown browserAction:', action, args);
					break;
			}
		}

		watch(searchFilterStr, () => {
			searchFilterRegExp.value = new RegExp(
				`^${searchFilterStr.value
					.replace(/[.+^${}()|[\]]|\\(?![*?])/g, '\\$&') // escape special chars, \\ only if not before * or ?
					.replace(/(?<!\\)\*/g, '.*') // replace * with .* if not escaped
					.replace(/(?<!\\)\?/g, '.') // replace ? with . if not escaped
				}`
			);
		}, { immediate: true });

		watch([() => route.params.path, () => route.params.host], async () => {
			if (route.name !== 'browse')
				return;
			const host = route.params.host;
			const path = decodeURIComponent(route.params.path);
			if (pathHistory.current()?.path !== path || pathHistory.current()?.host !== host) {
				pathHistory.push({ path, host }); // updates actual view
			}
		}, { immediate: true });

		return {
			cockpit,
			console,
			darkMode,
			settings,
			pathHistory,
			directoryViewRef,
			searchFilterStr,
			searchFilterRegExp,
			backHistoryDropdown,
			forwardHistoryDropdown,
			openFilePromptModal,
			filePermissions,
			contextMenu,
			cd,
			back,
			forward,
			up,
			openEditor,
			download,
			getSelected,
			handleAction,
		}
	},
	components: {
		DirectoryView,
		PathBreadCrumbs,
		ArrowLeftIcon,
		ArrowRightIcon,
		ArrowUpIcon,
		RefreshIcon,
		ChevronDownIcon,
		SearchIcon,
		IconToggle,
		SunIcon,
		MoonIcon,
		EyeIcon,
		EyeOffIcon,
		ViewListIcon,
		ViewGridIcon,
		ModalPopup,
		FilePermissions,
		ContextMenu,
	},
}
</script>
