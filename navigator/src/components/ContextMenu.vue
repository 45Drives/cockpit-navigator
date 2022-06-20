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
	<transition
		enter-active-class="origin-top-left transition ease-out duration-100"
		enter-from-class="transform opacity-0 scale-95"
		enter-to-class="transform opacity-100 scale-100"
		leave-active-class="origin-top-left transition ease-in duration-75"
		leave-from-class="transform opacity-100 scale-100"
		leave-to-class="transform opacity-0 scale-95"
	>
		<div
			v-if="show"
			class="fixed inset-0 bg-transparent"
			@click="$emit('hide')"
		>
			<div
				class="fixed z-20 max-w-sm flex flex-col items-stretch bg-default shadow-lg divide-y divide-default position-contextmenu">
				<div class="flex items-stretch">
					<button
						:disabled="!pathHistory?.backAllowed()"
						:class="{ 'grow flex items-center justify-center p-2': true, 'hover:bg-red-600/10': pathHistory?.backAllowed() }"
						@click="$emit('browserAction', 'back')"
					>
						<ArrowLeftIcon class="size-icon icon-default" />
					</button>
					<button
						:disabled="!pathHistory?.forwardAllowed()"
						:class="{ 'grow flex items-center justify-center p-2': true, 'hover:bg-red-600/10': pathHistory?.forwardAllowed() }"
						@click="$emit('browserAction', 'forward')"
					>
						<ArrowRightIcon class="size-icon icon-default" />
					</button>
					<button
						class="grow hover:bg-red-600/10 flex items-center justify-center p-2"
						@click="$emit('browserAction', 'up')"
					>
						<ArrowUpIcon class="size-icon icon-default" />
					</button>
				</div>
				<div class="flex flex-col items-stretch">
					<!-- general actions -->
					<button
						v-if="entry?.path !== '/'"
						class="context-menu-button"
						@click="$emit('browserAction', 'editPermissions', entry)"
					>
						Edit permissions
					</button>
				</div>
				<div
					v-if="entry?.resolvedType === 'f'"
					class="flex flex-col items-stretch"
				>
					<!-- regular file actions -->
					<button
						class="context-menu-button"
						@click="$emit('browserAction', 'edit', entry)"
					>
						Edit contents
					</button>
					<button
						class="context-menu-button"
						@click="$emit('browserAction', 'download', entry)"
					>
						Download
					</button>
				</div>
				<div
					v-else-if="entry?.resolvedType === 'd'"
					class="flex flex-col items-stretch"
				>
					<!-- directory actions -->
					<button
						class="context-menu-button"
						@click="$emit('browserAction', 'cd', entry)"
					>
						Open
					</button>
				</div>
				<div
					v-if="entry?.type === 'l'"
					class="flex flex-col items-stretch"
				>
					<!-- link actions -->
				</div>
			</div>
		</div>
	</transition>
</template>

<script>
import { inject } from 'vue'
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon } from '@heroicons/vue/solid';
import { pathHistoryInjectionKey } from '../keys';

export default {
	props: {
		show: Boolean,
		event: Object,
		entry: Object,
	},
	setup(props, { emit }) {
		const pathHistory = inject(pathHistoryInjectionKey);

		return {
			pathHistory,
		}
	},
	components: {
		ArrowLeftIcon,
		ArrowRightIcon,
		ArrowUpIcon,
	},
	emits: [
		'hide',
		'browserAction',
	]
}
</script>

<style scoped>
div.position-contextmenu {
	top: v-bind("`${event?.clientY ?? 0}px`");
	left: v-bind("`${event?.clientX ?? 0}px`");
}

button.context-menu-button {
	@apply text-default font-normal px-4 py-2 text-sm text-left;
}

button.context-menu-button:hover {
	@apply bg-red-600/10;
}
</style>
