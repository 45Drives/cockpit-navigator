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
			@contextmenu.prevent="$emit('hide')"
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
					<!-- Non-selection actions -->
					<button
						class="context-menu-button"
						@click="$emit('browserAction', 'createFile', selection[0])"
					>
						<DocumentAddIcon class="size-icon icon-default" />
						<span>New file</span>
					</button>
					<button
						class="context-menu-button"
						@click="$emit('browserAction', 'createDirectory', selection[0])"
					>
						<FolderAddIcon class="size-icon icon-default" />
						<span>New directory</span>
					</button>
					<button
						class="context-menu-button"
						@click="$emit('browserAction', 'createLink', selection[0])"
					>
						<LinkIcon class="size-icon icon-default" />
						<span>New link</span>
					</button>
				</div>
				<template v-if="selection.length === 0">
					<!-- Current directory actions -->
					<div class="flex flex-col items-stretch">
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'download', currentDirEntry)"
						>
							<FolderDownloadIcon class="size-icon icon-default" />
							<span>Zip and download directory</span>
						</button>
					</div>
					<div class="flex flex-col items-stretch">
						<button
							v-if="currentDirEntry?.path !== '/'"
							class="context-menu-button"
							@click="$emit('browserAction', 'editPermissions', currentDirEntry)"
						>
							<KeyIcon class="size-icon icon-default" />
							<span>Edit permissions</span>
						</button>
					</div>
				</template>
				<template v-else-if="selection.length === 1">
					<!-- Single entry selection actions -->
					<div
						v-if="selection[0]?.resolvedType === 'f'"
						class="flex flex-col items-stretch"
					>
						<!-- regular file actions -->
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'edit', selection[0])"
						>
							<PencilAltIcon class="size-icon icon-default" />
							<span>Edit contents</span>
						</button>
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'download', selection[0])"
						>
							<DocumentDownloadIcon class="size-icon icon-default" />
							<span>Download</span>
						</button>
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'download', selection[0], true)"
						>
							<FolderDownloadIcon class="size-icon icon-default" />
							<span>Zip and download</span>
						</button>
					</div>
					<div
						v-else-if="selection[0]?.resolvedType === 'd'"
						class="flex flex-col items-stretch"
					>
						<!-- directory actions -->
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'cd', selection[0])"
						>
							<FolderOpenIcon class="size-icon icon-default" />
							<span>Open</span>
						</button>
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'download', selection[0])"
						>
							<FolderDownloadIcon class="size-icon icon-default" />
							<span>Zip and download directory</span>
						</button>
					</div>
					<div
						v-if="selection[0]?.type === 'l'"
						class="flex flex-col items-stretch"
					>
						<!-- link actions -->
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'editLink', selection[0])"
						>
							<LinkIcon class="size-icon icon-default" />
							<span>Edit link target</span>
						</button>
					</div>
					<div class="flex flex-col items-stretch">
						<!-- general actions -->
						<button
							v-if="selection[0]?.path !== '/'"
							class="context-menu-button"
							@click="$emit('browserAction', 'editPermissions', selection[0])"
						>
							<KeyIcon class="size-icon icon-default" />
							<span>Edit permissions</span>
						</button>
						<button
							v-if="selection[0]?.path !== '/'"
							class="context-menu-button"
							@click="$emit('browserAction', 'rename', selection[0])"
						>
							<PencilIcon class="size-icon icon-default" />
							<span>Rename</span>
						</button>
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'delete', selection[0])"
						>
							<TrashIcon class="size-icon icon-default" />
							<span>Delete</span>
						</button>
					</div>
				</template>
				<tempalte v-else>
					<!-- Multi-entry selection actions -->
					<div class="flex flex-col items-stretch">
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'download', [...selection])"
						>
							<DownloadIcon class="size-icon-sm icon-default" />
							<span>Zip and download {{ selection.length }} items</span>
						</button>
						<button
							class="context-menu-button"
							@click="$emit('browserAction', 'delete', [...selection])"
						>
							<TrashIcon class="size-icon-sm icon-default" />
							<span>Delete {{ selection.length }} items</span>
						</button>
					</div>
				</tempalte>
			</div>
		</div>
	</transition>
</template>

<script>
import { inject } from 'vue'
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	ArrowUpIcon,
	DocumentAddIcon,
	DocumentDownloadIcon,
	TrashIcon,
	FolderAddIcon,
	FolderDownloadIcon,
	FolderOpenIcon,
	LinkIcon,
	PencilAltIcon,
	PencilIcon,
	KeyIcon,
	DownloadIcon,
} from '@heroicons/vue/solid';
import { pathHistoryInjectionKey } from '../keys';

export default {
	props: {
		show: Boolean,
		event: Object,
		selection: Array,
		currentDirEntry: Object,
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
		DocumentAddIcon,
		DocumentDownloadIcon,
		TrashIcon,
		FolderAddIcon,
		FolderDownloadIcon,
		FolderOpenIcon,
		LinkIcon,
		PencilAltIcon,
		PencilIcon,
		KeyIcon,
		DownloadIcon,
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
	@apply text-default font-normal pl-1 pr-2 text-sm text-left flex items-center gap-1;
}

button.context-menu-button:hover {
	@apply bg-red-600/10;
}
</style>
