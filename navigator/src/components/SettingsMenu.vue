<template>
	<button @click="showMenu = true">
		<AdjustmentsIcon class="size-icon icon-default" />
	</button>
	<ModalPopup
		:showModal="showMenu"
		autoWidth
		headerText="Navigator Settings"
		noCancel
		applyText="Close"
		@apply="showMenu = false"
	>
		<div class="flex flex-col gap-content items-start">
			<template v-if="settings.directoryView">
				<div class="inline-flex flex-col gap-content">
					<LabelledSwitch v-model="darkMode">Dark mode</LabelledSwitch>
					<LabelledSwitch v-model="settings.directoryView.showHidden">Show hidden files</LabelledSwitch>
					<LabelledSwitch v-model="booleanAnalogs.directoryView.view.bool">List view</LabelledSwitch>
					<LabelledSwitch
						v-model="settings.directoryView.separateDirs"
					>Separate directories while sorting</LabelledSwitch>
				</div>
				<div v-if="booleanAnalogs.directoryView.view.bool" class="self-stretch">
					<div>List view columns</div>
					<div
						class="flex justify-start text-sm rounded-lg divide-x divide-default border border-default shadow"
					>
						<div class="flex flex-col grow items-stretch">
							<div class="font-semibold px-2">Visible</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2"
								v-if="settings.directoryView.cols.mode"
								@click="settings.directoryView.cols.mode = !settings.directoryView.cols.mode"
							>
								Mode
								<ChevronRightIcon class="size-icon-sm icon-default" />
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2"
								v-if="settings.directoryView.cols.owner"
								@click="settings.directoryView.cols.owner = !settings.directoryView.cols.owner"
							>
								Owner
								<ChevronRightIcon class="size-icon-sm icon-default" />
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2"
								v-if="settings.directoryView.cols.group"
								@click="settings.directoryView.cols.group = !settings.directoryView.cols.group"
							>
								Group
								<ChevronRightIcon class="size-icon-sm icon-default" />
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2"
								v-if="settings.directoryView.cols.size"
								@click="settings.directoryView.cols.size = !settings.directoryView.cols.size"
							>
								Size
								<ChevronRightIcon class="size-icon-sm icon-default" />
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2"
								v-if="settings.directoryView.cols.ctime"
								@click="settings.directoryView.cols.ctime = !settings.directoryView.cols.ctime"
							>
								Created
								<ChevronRightIcon class="size-icon-sm icon-default" />
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2"
								v-if="settings.directoryView.cols.mtime"
								@click="settings.directoryView.cols.mtime = !settings.directoryView.cols.mtime"
							>
								Modified
								<ChevronRightIcon class="size-icon-sm icon-default" />
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2"
								v-if="settings.directoryView.cols.atime"
								@click="settings.directoryView.cols.atime = !settings.directoryView.cols.atime"
							>
								Accessed
								<ChevronRightIcon class="size-icon-sm icon-default" />
							</div>
						</div>
						<div class="flex flex-col grow text-right items-stretch">
							<div class="font-semibold px-2">Hidden</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2 justify-end"
								v-if="!settings.directoryView.cols.mode"
								@click="settings.directoryView.cols.mode = !settings.directoryView.cols.mode"
							>
								<ChevronLeftIcon class="size-icon-sm icon-default" />Mode
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2 justify-end"
								v-if="!settings.directoryView.cols.owner"
								@click="settings.directoryView.cols.owner = !settings.directoryView.cols.owner"
							>
								<ChevronLeftIcon class="size-icon-sm icon-default" />Owner
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2 justify-end"
								v-if="!settings.directoryView.cols.group"
								@click="settings.directoryView.cols.group = !settings.directoryView.cols.group"
							>
								<ChevronLeftIcon class="size-icon-sm icon-default" />Group
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2 justify-end"
								v-if="!settings.directoryView.cols.size"
								@click="settings.directoryView.cols.size = !settings.directoryView.cols.size"
							>
								<ChevronLeftIcon class="size-icon-sm icon-default" />Size
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2 justify-end"
								v-if="!settings.directoryView.cols.ctime"
								@click="settings.directoryView.cols.ctime = !settings.directoryView.cols.ctime"
							>
								<ChevronLeftIcon class="size-icon-sm icon-default" />Created
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2 justify-end"
								v-if="!settings.directoryView.cols.mtime"
								@click="settings.directoryView.cols.mtime = !settings.directoryView.cols.mtime"
							>
								<ChevronLeftIcon class="size-icon-sm icon-default" />Modified
							</div>
							<div
								class="rounded-lg hover:bg-accent cursor-pointer flex flex-row gap-1 items-center px-2 justify-end"
								v-if="!settings.directoryView.cols.atime"
								@click="settings.directoryView.cols.atime = !settings.directoryView.cols.atime"
							>
								<ChevronLeftIcon class="size-icon-sm icon-default" />Accessed
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>
	</ModalPopup>
</template>

<script>
import { ref, inject, watch, reactive } from 'vue';
import LabelledSwitch from './LabelledSwitch.vue';
import ModalPopup from './ModalPopup.vue';
import { AdjustmentsIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/vue/solid';
import { settingsInjectionKey } from '../keys';
import assignObjectRecursive from '../functions/assignObjectRecursive';

/**
 * @type {NavigatorSettings}
 */
const defaultSettings = {
	directoryView: {
		view: 'list',
		showHidden: false,
		separateDirs: true,
		cols: {
			mode: true,
			owner: true,
			group: true,
			size: true,
			ctime: true,
			mtime: true,
			atime: true,
		},
		gridEntrySize: 80,
	},
}

export default {
	setup() {
		const showMenu = ref(false);
		/**
		 * @type {NavigatorSettings}
		 */
		const settings = inject(settingsInjectionKey);
		const settingsStorageKey = "houstonNavigatorSettingsKey";
		/**
		 * @type {Ref<boolean>}
		 */
		const darkMode = inject('darkModeInjectionKey') ?? ref(false);
		function getTheme() {
			let prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
			let theme = cockpit.localStorage.getItem("houston-color-theme");
			if (theme === null)
				return prefersDark;
			return theme === "dark";
		}
		darkMode.value = getTheme();
		const booleanAnalogs = reactive({
			directoryView: {
				view: { bool: false, trueValue: 'list', falseValue: 'grid' },
			},
		})

		assignObjectRecursive(settings, JSON.parse(localStorage.getItem(settingsStorageKey)) ?? {}, defaultSettings);

		watch(settings, () => {
			localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
			booleanAnalogs.directoryView.view.bool = settings.directoryView?.view === booleanAnalogs.directoryView.view.trueValue;
		}, { immediate: true });

		watch(booleanAnalogs, () => {
			settings.directoryView.view =
				booleanAnalogs.directoryView.view.bool
					? booleanAnalogs.directoryView.view.trueValue
					: booleanAnalogs.directoryView.view.falseValue;
		}, { immediate: true });

		watch(() => darkMode.value, (darkMode, oldDarkMode) => {
			cockpit.localStorage.setItem("houston-color-theme", darkMode ? "dark" : "light");
			if (darkMode) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		}, { lazy: false, immediate: true });
		cockpit.onvisibilitychange = () => darkMode.value = getTheme();

		return {
			showMenu,
			settings,
			darkMode,
			booleanAnalogs,
		}
	},
	components: {
		ModalPopup,
		LabelledSwitch,
		AdjustmentsIcon,
		ChevronRightIcon,
		ChevronLeftIcon,
	},
}
</script>
