<template>
	<div class="text-default bg-default h-full flex flex-col items-stretch">
		<router-view v-if="providesValid" />
		<div class="flex flex-row items-center px-4 py-2 gap-2">
			<div id="footer-text" class="flex flex-row flex-wrap gap-x-4 gap-y-0 text-xs grow basis-0"></div>
			<div class="grow-0">
				45Drives
			</div>
			<div id="footer-buttons" class="flex flex-row-reverse gap-buttons grow basis-0">
				<SettingsMenu />
			</div>
		</div>
	</div>
	<Notifications :notificationFIFO="notificationFIFO" ref="notifications" />
</template>

<script setup>
import { ref, reactive, provide, onBeforeMount } from "vue";
import SettingsMenu from "./components/SettingsMenu.vue";
import Notifications from './components/Notifications.vue';
import { FIFO } from '@45drives/cockpit-helpers';
import { settingsInjectionKey, notificationsInjectionKey, pathHistoryInjectionKey, clipboardInjectionKey } from "./keys";

const props = defineProps({ notificationFIFO: FIFO });

const providesValid = ref(false);

const darkMode = ref(false);
provide('darkModeInjectionKey', darkMode);

const notifications = ref();
provide(notificationsInjectionKey, notifications);

const settings = reactive({});
provide(settingsInjectionKey, settings);

const pathHistory = reactive({
	stack: [],
	index: 0,
	back: () => {
		pathHistory.index = Math.max(0, pathHistory.index - 1);
		return pathHistory.stack[pathHistory.index];
	},
	forward: () => {
		pathHistory.index = Math.min(pathHistory.index + 1, pathHistory.stack.length - 1);
		return pathHistory.stack[pathHistory.index];
	},
	push: (path) => {
		pathHistory.stack = pathHistory.stack.slice(0, pathHistory.index + 1);
		pathHistory.stack.push(path);
		pathHistory.index = Math.min(pathHistory.index + 1, pathHistory.stack.length - 1);
	},
	current: () => pathHistory.stack[pathHistory.index],
	backAllowed: () => pathHistory.index > 0,
	forwardAllowed: () => pathHistory.index < pathHistory.stack.length - 1,
});
provide(pathHistoryInjectionKey, pathHistory);

const clipboard = reactive({
	content: [],
});
provide(clipboardInjectionKey, clipboard);
providesValid.value = true;

</script>
