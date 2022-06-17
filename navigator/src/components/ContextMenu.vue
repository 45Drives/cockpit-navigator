<template>
	<transition enter-active-class="origin-top-left transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95"
		enter-to-class="transform opacity-100 scale-100" leave-active-class="origin-top-left transition ease-in duration-75"
		leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
		<div v-if="show" class="fixed inset-0 bg-transparent" @click="$emit('hide')">
			<div class="fixed z-20 max-w-sm flex flex-col items-stretch bg-default shadow-lg divide-y divide-default position-contextmenu">
				<div class="flex items-stretch">
					<button :disabled="!pathHistory?.backAllowed()" @click="$emit('browserAction', 'back')" :class="{'grow flex items-center justify-center p-2': true, 'hover:bg-red-600/10': pathHistory?.backAllowed()}">
						<ArrowLeftIcon class="size-icon icon-default" />
					</button>
					<button :disabled="!pathHistory?.forwardAllowed()" @click="$emit('browserAction', 'forward')" :class="{'grow flex items-center justify-center p-2': true, 'hover:bg-red-600/10': pathHistory?.forwardAllowed()}">
						<ArrowRightIcon class="size-icon icon-default" />
					</button>
					<button @click="$emit('browserAction', 'up')" class="grow hover:bg-red-600/10 flex items-center justify-center p-2">
						<ArrowUpIcon class="size-icon icon-default" />
					</button>
				</div>
				<div class="flex flex-col items-stretch">
					<!-- general actions -->
					<button v-if="entry?.path !== '/'" @click="$emit('browserAction', 'editPermissions', entry)" class="context-menu-button">
						Edit permissions
					</button>
				</div>
				<div v-if="entry?.resolvedType === 'f'" class="flex flex-col items-stretch">
					<!-- regular file actions -->
					<button @click="$emit('browserAction', 'edit', entry)" class="context-menu-button">
						Edit contents
					</button>
					<button @click="$emit('browserAction', 'download', entry)" class="context-menu-button">
						Download
					</button>
				</div>
				<div v-else-if="entry?.resolvedType === 'd'" class="flex flex-col items-stretch">
					<!-- directory actions -->
					<button @click="$emit('browserAction', 'cd', entry)" class="context-menu-button">
						Open
					</button>
				</div>
				<div v-if="entry?.type === 'l'" class="flex flex-col items-stretch">
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
	top: v-bind(`${event?.clientY ?? 0}px`);
	left: v-bind(`${event?.clientX ?? 0}px`);
}

button.context-menu-button {
	@apply text-default hover:bg-red-600/10 font-normal px-4 py-2 text-sm text-left;
}
</style>
