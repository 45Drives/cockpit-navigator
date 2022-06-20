<!--
Copyright (C) 2022 Josh Boudreau <jboudreau@45drives.com>

This file is part of Cockpit Navigator.

Cockpit Navigator is free software: you can redistribute it and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation, either version 3
of the License, or (at your option) any later version.

Cockpit Navigator is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Cockpit Navigator.
If not, see <https://www.gnu.org/licenses/>. 
-->

<template>
	<div class="text-default bg-default h-full flex flex-col items-stretch">
		<router-view v-if="providesValid" />
		<div class="flex flex-row items-center px-4 py-2 gap-2">
			<div
				id="footer-text"
				class="flex flex-row flex-wrap gap-x-4 gap-y-0 text-xs grow basis-0"
			></div>
			<div class="grow-0">
				45Drives
			</div>
			<div
				id="footer-buttons"
				class="flex flex-row-reverse gap-buttons grow basis-0"
			>
				<SettingsMenu />
			</div>
		</div>
	</div>
	<Notifications
		:notificationFIFO="notificationFIFO"
		ref="notifications"
	/>
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
