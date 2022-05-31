<template>
	<div class="grow overflow-hidden">
		<div class="h-full flex flex-col items-stretch">
			<div
				class="grid grid-cols-[auto_1fr] grid-rows-[1fr 1fr] md:grid-cols-[auto_3fr_1fr] md:grid-row-[1fr] items-stretch divide-x divide-y divide-default">
				<div class="button-group-row p-1 md:px-4 md:py-2 border border-default">
					<button class="p-2 rounded-lg hover:bg-accent relative" :disabled="!pathHistory.backAllowed()"
						@click="back()" @mouseenter="backHistoryDropdown.mouseEnter"
						@mouseleave="backHistoryDropdown.mouseLeave">
						<ArrowLeftIcon class="size-icon icon-default" />
						<ChevronDownIcon class="w-3 h-3 icon-default absolute bottom-1 right-1"
							v-if="pathHistory.backAllowed()" />
						<div v-if="backHistoryDropdown.showDropdown"
							class="absolute top-full left-0 flex flex-col items-stretch z-50 bg-default shadow-lg rounded-lg overflow-y-auto max-h-80">
							<div v-for="item, index in pathHistory.stack.slice(0, pathHistory.index).reverse()"
								:key="index" @click="pathHistory.index = pathHistory.index - index"
								class="hover:text-white hover:bg-red-600 px-4 py-2 text-sm text-left whitespace-nowrap">
								<span v-if="item.host !== pathHistory.current()?.host">
									{{ item.host ?? cockpit.transport.host }}:
								</span>
								{{ item.path }}
							</div>
						</div>
					</button>
					<button class="p-2 rounded-lg hover:bg-accent relative" :disabled="!pathHistory.forwardAllowed()"
						@click="forward()" @mouseenter="forwardHistoryDropdown.mouseEnter"
						@mouseleave="forwardHistoryDropdown.mouseLeave">
						<ArrowRightIcon class="size-icon icon-default" />
						<ChevronDownIcon class="w-3 h-3 icon-default absolute bottom-1 right-1"
							v-if="pathHistory.forwardAllowed()" />
						<div v-if="forwardHistoryDropdown.showDropdown"
							class="absolute top-full left-0 flex flex-col items-stretch z-50 bg-default shadow-lg rounded-lg overflow-y-auto max-h-80">
							<div v-for="item, index in pathHistory.stack.slice(pathHistory.index + 1)" :key="index"
								@click="pathHistory.index = pathHistory.index + index"
								class="hover:text-white hover:bg-red-600 px-4 py-2 text-sm text-left whitespace-nowrap">
								<span v-if="item.host !== pathHistory.current()?.host">
									{{ item.host ?? cockpit.transport.host }}:
								</span>
								{{ item.path }}
							</div>
						</div>
					</button>
					<button class="p-2 rounded-lg hover:bg-accent" @click="up()"
						:disabled="pathHistory.current() === '/'">
						<ArrowUpIcon class="size-icon icon-default" />
					</button>
					<button class="p-2 rounded-lg hover:bg-accent" @click="directoryViewRef.refresh()">
						<RefreshIcon class="size-icon icon-default" />
					</button>
				</div>

				<div
					class="p-1 md:px-4 md:py-2 col-start-1 col-end-3 row-start-2 row-end-3 md:col-start-auto md:col-end-auto md:row-start-auto md:row-end-auto">
					<PathBreadCrumbs :host="pathHistory.current()?.host" :path="pathHistory.current()?.path ?? '/'"
						@cd="cd" />
				</div>

				<div class="p-1 md:px-4 md:py-2">
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<SearchIcon class="size-icon icon-default" aria-hidden="true" />
						</div>
						<input type="text" class="block input-textlike w-full pl-10" v-model="searchFilterStr"
							placeholder="Search in directory (foo*, b?r, *.jpg)" />
					</div>
				</div>
			</div>
			<div class="grow overflow-hidden">
				<DirectoryView :host="pathHistory.current()?.host" :path="pathHistory.current()?.path"
					:searchFilterRegExp="searchFilterRegExp" @cd="path => cd({ path })" @edit="openEditor"
					@updateStats="stats => $emit('updateFooterText', `${stats.files} file${stats.files === 1 ? '' : 's'}, ${stats.dirs} director${stats.dirs === 1 ? 'y' : 'ies'} (${cockpit.format_bytes(stats.size, 1000).replace(/(?<!B)$/, ' B')})`)"
					ref="directoryViewRef" />
			</div>
		</div>
	</div>
</template>

<script>
import { inject, ref, reactive, watch, nextTick } from 'vue';
import { useRoute, useRouter } from "vue-router";
import DirectoryView from "../components/DirectoryView.vue";
import { useSpawn, errorString, errorStringHTML, canonicalPath } from '@45drives/cockpit-helpers';
import PathBreadCrumbs from '../components/PathBreadCrumbs.vue';
import { notificationsInjectionKey, pathHistoryInjectionKey, lastPathStorageKey, settingsInjectionKey } from '../keys';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, RefreshIcon, ChevronDownIcon, SearchIcon } from '@heroicons/vue/solid';

const encodePartial = (string) =>
	encodeURIComponent(string)
		.replace(/%40/g, '@')
		.replace(/%3D/g, '=')
		.replace(/%2B/g, '+')
		.replace(/%2F/g, '/')
		.replace(/%20/g, ' ');

export default {
	setup() {
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
			const path = pathHistory.current() ?? { path: '/' };
			path.path += '/..';
			cd(path);
		}

		const openEditor = (path) => {
			router.push(`/edit/${pathHistory.current().host}${encodePartial(path)}`);
		}

		const getSelected = () => directoryViewRef.value?.getSelected?.() ?? [];

		watch(searchFilterStr, () => {
			searchFilterRegExp.value = new RegExp(
				`^${searchFilterStr.value
					.replace(/[.+^${}()|[\]]|\\(?![*?])/g, '\\$&') // escape special chars, \\ only if not before * or ?
					.replace(/(?<!\\)\*/g, '.*') // replace * with .* if not escaped
					.replace(/(?<!\\)\?/g, '.') // replace ? with . if not escaped
				}`
			);
		}, { immediate: true });

		watch(route, async () => {
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
			pathHistory,
			directoryViewRef,
			searchFilterStr,
			searchFilterRegExp,
			backHistoryDropdown,
			forwardHistoryDropdown,
			cd,
			back,
			forward,
			up,
			openEditor,
			getSelected,
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
	},
	emits: [
		'updateFooterText'
	],
}
</script>
