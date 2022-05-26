<template>
	<div class="text-default bg-default h-full flex flex-col items-stretch">
		<router-view v-if="providesValid" @updateFooterText="text => routerViewFooterText = text" />
		<div class="flex flex-row items-center px-4 py-2">
			<div class="text-sm" v-html="routerViewFooterText"></div>
			<div class="grow" />
			<SettingsMenu />
		</div>
	</div>
	<Notifications :notificationFIFO="notificationFIFO" ref="notifications" />
</template>

<script setup>
import { ref, reactive, provide, onBeforeMount } from "vue";
import SettingsMenu from "./components/SettingsMenu.vue";
import Notifications from './components/Notifications.vue';
import { FIFO } from '@45drives/cockpit-helpers';
import { settingsInjectionKey, notificationsInjectionKey, pathHistoryInjectionKey } from "./keys";

const props = defineProps({ notificationFIFO: FIFO });

const providesValid = ref(false);

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
providesValid.value = true;

const routerViewFooterText = ref("");

</script>
