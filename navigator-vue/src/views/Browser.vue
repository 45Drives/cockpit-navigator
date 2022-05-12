<template>
	<div class="grow overflow-hidden">
		<div class="h-full flex flex-col items-stretch">
			<div class="flex gap-buttons items-stretch divide-x divide-default">
				<div class="button-group-row px-4 py-2">
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
					<button class="p-2 rounded-lg hover:bg-accent" @click="up()">
						<ArrowUpIcon class="size-icon icon-default" />
					</button>
					<button class="p-2 rounded-lg hover:bg-accent" @click="directoryViewRef.getEntries()">
						<RefreshIcon class="size-icon icon-default" />
					</button>
				</div>
				<div class="grow card-header px-4 py-2">
					<PathBreadCrumbs :path="pathHistory.current() ?? '/'" @cd="newPath => cd(newPath)" />
				</div>
			</div>
			<div class="grow overflow-hidden">
				<DirectoryView
					:path="pathHistory.current() ?? '/'"
					@cd="newPath => cd(newPath)"
					@updateStats="stats => $emit('updateFooterText', `${stats.files} file${stats.files === 1 ? '' : 's'}, ${stats.dirs} director${stats.dirs === 1 ? 'y' : 'ies'}`)"
					ref="directoryViewRef"
				/>
			</div>
		</div>
	</div>
</template>

<script>
import { inject, ref, reactive, watch, nextTick } from 'vue';
import { useRoute } from "vue-router";
import DirectoryView from "../components/DirectoryView.vue";
import { errorStringHTML, canonicalPath } from '@45drives/cockpit-helpers';
import PathBreadCrumbs from '../components/PathBreadCrumbs.vue';
import { checkIfExists, checkIfAllowed } from '../mode';
import { notificationsInjectionKey, pathHistoryInjectionKey, lastPathStorageKey } from '../keys';
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, RefreshIcon, ChevronDownIcon } from '@heroicons/vue/solid';

export default {
	setup() {
		const notifications = inject(notificationsInjectionKey);
		const route = useRoute();
		const pathHistory = inject(pathHistoryInjectionKey);
		const directoryViewRef = ref();
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

		const cd = (newPath, saveHistory = true) => {
			localStorage.setItem(lastPathStorageKey, newPath);
			if (saveHistory)
				pathHistory.push(newPath);
			cockpit.location.go(`/browse${newPath}`);
		};

		const back = (saveHistory = false) => {
			cd(pathHistory.back() ?? '/', saveHistory);
		}

		const forward = (saveHistory = false) => {
			cd(pathHistory.forward() ?? '/', saveHistory);
		}

		const up = (saveHistory = true) => {
			cd(canonicalPath((pathHistory.current() ?? "") + '/..'), saveHistory);
		}

		watch(() => route.params.path, async () => {
			if (!route.params.path)
				return cockpit.location.go('/browse/');
			const tmpPath = canonicalPath(route.params.path);
			if (pathHistory.current() !== tmpPath) {
				pathHistory.push(tmpPath);
			}
			try {
				let badPath = false;
				if (!await checkIfExists(tmpPath)) {
					notifications.value.constructNotification("Failed to open path", `${tmpPath} does not exist.`, 'error');
					badPath = true;
				} else if (!await checkIfAllowed(tmpPath, true)) {
					notifications.value.constructNotification("Failed to open path", `Permission denied for ${tmpPath}`, 'denied');
					badPath = true;
				}
				if (badPath) {
					if (pathHistory.backAllowed())
						back();
					else
						up(false);
				} else {
					localStorage.setItem(lastPathStorageKey, tmpPath);
				}
			} catch (error) {
				notifications.value.constructNotification("Failed to open path", errorStringHTML(error), 'error');
				if (pathHistory.backAllowed())
					back();
				else
					up(false);
			}
		}, { immediate: true });

		return {
			cockpit,
			pathHistory,
			directoryViewRef,
			backHistoryDropdown,
			forwardHistoryDropdown,
			cd,
			back,
			forward,
			up,
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
	},
	emits: [
		'updateFooterText'
	],
}
</script>
