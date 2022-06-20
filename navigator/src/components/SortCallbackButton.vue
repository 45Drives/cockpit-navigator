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
	<button @click="updateModel()">
		<SortDescendingIcon
			v-if="reverse"
			:class="[funcIsMine ? 'icon-45d' : 'icon-default', 'size-icon']"
		/>
		<SortAscendingIcon
			v-else
			:class="[funcIsMine ? 'icon-45d' : 'icon-default', 'size-icon']"
		/>
	</button>
</template>

<script>
import { SortDescendingIcon } from "@heroicons/vue/solid";

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
