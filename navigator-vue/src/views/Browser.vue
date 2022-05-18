<template>
	<div class="grow overflow-hidden">
		<div class="h-full flex flex-col items-stretch">
			<div
				class="grid grid-cols-[auto_1fr] grid-rows-[1fr 1fr] md:grid-cols-[auto_3fr_1fr] md:grid-row-[1fr] items-stretch divide-x divide-y divide-default"
			>
				<div class="button-group-row p-1 md:px-4 md:py-2 border border-default">
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
								@click="pathHistory.index = pathHistory.index - index"
								class="hover:text-white hover:bg-red-600 px-4 py-2 text-sm text-left whitespace-nowrap"
							>{{ item }}</div>
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
								@click="pathHistory.index = pathHistory.index + index"
								class="hover:text-white hover:bg-red-600 px-4 py-2 text-sm text-left whitespace-nowrap"
							>{{ item }}</div>
						</div>
					</button>
					<button
						class="p-2 rounded-lg hover:bg-accent"
						@click="up()"
						:disabled="pathHistory.current() === '/'"
					>
						<ArrowUpIcon class="size-icon icon-default" />
					</button>
					<button class="p-2 rounded-lg hover:bg-accent" @click="directoryViewRef.getEntries()">
						<RefreshIcon class="size-icon icon-default" />
					</button>
				</div>

				<div
					class="p-1 md:px-4 md:py-2 col-start-1 col-end-3 row-start-2 row-end-3 md:col-start-auto md:col-end-auto md:row-start-auto md:row-end-auto"
				>
					<PathBreadCrumbs :path="pathHistory.current() ?? '/'" @cd="newPath => cd(newPath)" />
				</div>

				<div class="p-1 md:px-4 md:py-2">
					<div class="relative">
						<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<SearchIcon class="size-icon icon-default" aria-hidden="true" />
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
					:path="pathHistory.current()"
					:searchFilterRegExp="searchFilterRegExp"
					@cd="newPath => cd(newPath)"
					@edit="openEditor"
					@updateStats="stats => $emit('updateFooterText', `${stats.files} file${stats.files === 1 ? '' : 's'}, ${stats.dirs} director${stats.dirs === 1 ? 'y' : 'ies'}`)"
					ref="directoryViewRef"
				/>
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

		const cd = (newPath) => {
			router.push(`/browse${newPath}`);
		};

		const back = () => {
			cd(pathHistory.back() ?? '/');
		}

		const forward = () => {
			cd(pathHistory.forward() ?? '/');
		}

		const up = () => {
			cd((pathHistory.current() ?? "") + '/..');
		}

		const openEditor = (path) => {
			router.push(`/edit${path}`);
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

		watch(() => route.params.path, async (current, last) => {
			if (!last) {
				console.log("First watch execute", last);
			}
			if (route.name !== 'browse' || current === last)
				return;
			try {
				const tmpPath = route.params.path;
				// let realPath = (await useSpawn(['realpath', '--canonicalize-existing', tmpPath], { superuser: 'try' }).promise()).stdout.trim();
				// if (tmpPath !== realPath)
				// 	return cd(realPath);
				try {
					await useSpawn(['test', '-r', tmpPath, '-a', '-x', tmpPath], { superuser: 'try' }).promise();
				} catch (error) {
					console.error(error);
					throw new Error(`Permission denied for ${tmpPath}`);
				}
				localStorage.setItem(lastPathStorageKey, tmpPath);
				if (pathHistory.current() !== tmpPath) {
					pathHistory.push(tmpPath); // updates actual view
				}
			} catch (error) {
				notifications.value.constructNotification("Failed to open path", errorStringHTML(error), 'error');
				if (pathHistory.backAllowed())
					back();
				else
					up();
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
