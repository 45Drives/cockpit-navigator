<template>
	<button @click="updateModel()">
		<SortDescendingIcon v-if="reverse" :class="[funcIsMine ? 'icon-45d' : 'icon-default', 'size-icon']" />
		<SortAscendingIcon v-else :class="[funcIsMine ? 'icon-45d' : 'icon-default', 'size-icon']" />
	</button>
</template>

<script>
import { nextTick, ref, watch } from 'vue';
import { SortAscendingIcon, SortDescendingIcon } from "@heroicons/vue/solid";

export default {
	props: {
		modelValue: Function,
		compareFunc: Function,
		initialFuncIsMine: {
			type: Boolean,
			required: false,
			default: false,
		},
		startReversed: {
			type: Boolean,
			required: false,
			default: false,
		},
	},
	setup(props, { emit }) {
		const reverse = ref(props.startReversed);
		const funcIsMine = ref(props.initialFuncIsMine);
		const iconComponent = ref(SortAscendingIcon);

		const emitFunc = () => {
			if (reverse.value)
				emit('update:modelValue', (a, b) => props.compareFunc(b, a));
			else
				emit('update:modelValue', (a, b) => props.compareFunc(a, b));
			// timeout to not overwrite change with self-triggered watch from emit
			nextTick(() => funcIsMine.value = true);
		}

		if (props.initialFuncIsMine)
			emitFunc();

		const updateModel = () => {
			if (funcIsMine.value)
				reverse.value = !reverse.value;
			emitFunc();
		};

		watch(() => props.modelValue, () => {
			funcIsMine.value = false;
		});

		return {
			reverse,
			funcIsMine,
			iconComponent,
			updateModel,
		}
	},
	components: {
		SortAscendingIcon,
		SortDescendingIcon
	},
	emits: [
		'update:modelValue'
	],
}
</script>
