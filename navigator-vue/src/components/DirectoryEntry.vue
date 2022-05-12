<template>
	<tr v-if="listView" @dblclick="doubleClickCallback" class="hover:!bg-red-600/10">
		<td class="w-6 !py-0 !px-1">
			<div class="relative">
				<component :is="icon" class="size-icon icon-default" />
				<LinkIcon v-if="entry.type === 'link'" class="w-2 h-2 absolute right-0 bottom-0 text-default" />
			</div>
		</td>
		<td class="!pl-1">
			{{ entry.name }}
			<div v-if="entry.type === 'link'" class="inline-flex gap-1 items-center">
				<div class="inline relative">
					<ArrowNarrowRightIcon class="text-default size-icon-sm inline" />
					<XIcon v-if="entry.target?.broken" class="icon-danger size-icon-sm absolute inset-x-0 bottom-0" />
				</div>
				<div>{{ entry.target?.rawPath ?? '' }}</div>
			</div>
		</td>
		<td v-if="settings?.directoryView?.cols?.mode" class="font-mono">{{ entry.modeStr }}</td>
		<td v-if="settings?.directoryView?.cols?.owner">{{ entry.owner }}</td>
		<td v-if="settings?.directoryView?.cols?.group">{{ entry.group }}</td>
		<td v-if="settings?.directoryView?.cols?.size">{{ entry.sizeHuman }}</td>
		<td v-if="settings?.directoryView?.cols?.ctime">{{ entry.ctime?.toLocaleString() ?? '-' }}</td>
		<td v-if="settings?.directoryView?.cols?.mtime">{{ entry.mtime?.toLocaleString() ?? '-' }}</td>
		<td v-if="settings?.directoryView?.cols?.atime">{{ entry.atime?.toLocaleString() ?? '-' }}</td>
	</tr>
	<div v-else @dblclick="doubleClickCallback" class="flex flex-col gap-content items-center">
		<div class="relative">
			<component
				:is="icon"
				:class="[settings.directoryView?.view === 'list' ? 'size-icon' : 'size-icon-xl', 'icon-default']"
			/>
			<LinkIcon
				v-if="entry.type === 'link'"
				class="size-icon-sm absolute right-0 bottom-0 text-gray-100 dark:text-gray-900"
			/>
		</div>
		<div>{{ entry.name }}</div>
	</div>
</template>

<script>
import { ref, inject, watch } from 'vue';
import { DocumentIcon, FolderIcon, LinkIcon, DocumentRemoveIcon, ArrowNarrowRightIcon, XIcon } from '@heroicons/vue/solid';
import { settingsInjectionKey } from '../keys';

export default {
	props: {
		entry: Object,
		listView: Boolean,
	},
	setup(props, { emit }) {
		const settings = inject(settingsInjectionKey);
		const icon = ref(FolderIcon);
		const directoryLike = ref(false);
		const brokenLink = ref(false);

		const doubleClickCallback = () => {
			if (directoryLike.value) {
				emit('cd', props.entry.path);
			} else {
				emit('edit', props.entry.path);
			}
		}

		watch(props.entry, () => {
			if (props.entry.type === 'directory' || (props.entry.type === 'link' && props.entry.target?.type === 'directory')) {
				icon.value = FolderIcon;
				directoryLike.value = true;
			} else {
				icon.value = DocumentIcon;
				directoryLike.value = false;
			}
		}, { immediate: true });

		return {
			settings,
			icon,
			directoryLike,
			brokenLink,
			doubleClickCallback,
		}
	},
	components: {
		DocumentIcon,
		FolderIcon,
		LinkIcon,
		DocumentRemoveIcon,
		ArrowNarrowRightIcon,
		XIcon,
	},
	emits: [
		'cd',
		'edit',
	]
}
</script>
