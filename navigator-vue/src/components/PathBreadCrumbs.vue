<template>
	<div class="flex items-center cursor-text h-10" @click="typing = true">
		<input v-if="typing" v-model="pathInput" type="text" class="w-full input-textlike" @change="$emit('cd', canonicalPath(pathInput))" ref="inputRef" @focusout="typing = false" />
		<div v-else class="inline-flex items-center gap-1">
			<template v-for="segment, index in pathArr" :key="index">
				<ChevronRightIcon v-if="index > 0" class="size-icon icon-default" />
				<button
					@click.prevent.stop="$emit('cd', canonicalPath(pathArr.slice(0, index + 1).join('/')))"
					class="p-2 hover:bg-accent rounded-lg cursor-pointer"
				>{{ segment }}</button>
			</template>
		</div>
	</div>
</template>

<script>
import { ref, watch, nextTick } from 'vue';
import { canonicalPath } from "@45drives/cockpit-helpers";
import { ChevronRightIcon } from '@heroicons/vue/solid';

export default {
	props: {
		path: String,
	},
	setup(props) {
		const pathArr = ref([]);
		const typing = ref(false);
		const pathInput = ref("");
		const inputRef = ref();

		watch(() => props.path, () => {
			pathArr.value = ['/', ...canonicalPath(props.path).replace(/^\//, '').split('/')].filter(segment => segment);
			pathInput.value = props.path;
			typing.value = false;
		}, { immediate: true });

		watch(typing, () => {
			if (typing.value)
				nextTick(() => inputRef.value.focus());
		});

		return {
			pathArr,
			typing,
			pathInput,
			inputRef,
			canonicalPath,
		}
	},
	components: {
		ChevronRightIcon,
	},
	emits: [
		'cd',
	]
}
</script>
