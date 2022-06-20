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
	<div
		v-show="dragging"
		class="fixed border-red-600/50 border border-solid bg-red-600/10 rounded-lg"
		ref="selectionBox"
	></div>
	<div
		v-bind="$attrs"
		@mousedown="startDrag"
	>
		<slot />
	</div>
</template>

<script>
import { ref, reactive, watch, onMounted } from 'vue'
export default {
	props: {
		areaThreshold: {
			type: Number,
			required: false,
			default: 200,
		},
	},
	setup(props, { emit }) {
		const selectionBox = ref();
		const rect = reactive({ x1: null, y1: null, x2: null, y2: null });
		const dragging = ref(false);

		const startDrag = (event) => {
			if (event.button !== 0)
				return;
			dragging.value = true;
			rect.x1 = rect.x2 = event.clientX;
			rect.y1 = rect.y2 = event.clientY;
			window.addEventListener('mousemove', drag);
			window.addEventListener('mouseup', endDrag, true);
		}

		const drag = (event) => {
			rect.x2 = event.clientX;
			rect.y2 = event.clientY;
		}

		const endDrag = (event) => {
			if (event.button !== 0)
				return;
			window.removeEventListener('mousemove', drag);
			window.removeEventListener('mouseup', endDrag, true);
			drag(event);
			let [x1, x2] = [rect.x1, rect.x2].sort((a, b) => a - b);
			let [y1, y2] = [rect.y1, rect.y2].sort((a, b) => a - b);
			const area = (x2 - x1) * (y2 - y1);
			if (area > props.areaThreshold) {
				event.stopPropagation();
				emit('selectRectangle', { x1, y1, x2, y2 }, event);
			}
			dragging.value = false;
			rect.x1 = rect.x2 = rect.y1 = rect.y2 = null;
		}

		onMounted(() => {
			watch(rect, () => {
				let [x1, x2] = [rect.x1, rect.x2].sort((a, b) => a - b);
				let [y1, y2] = [rect.y1, rect.y2].sort((a, b) => a - b);
				const area = (x2 - x1) * (y2 - y1);
				dragging.value = area >= props.areaThreshold;
				if (dragging.value) {
					selectionBox.value.style.left = `${x1}px`;
					selectionBox.value.style.top = `${y1}px`;
					selectionBox.value.style.width = `${x2 - x1}px`;
					selectionBox.value.style.height = `${y2 - y1}px`;
				}
			}, { immediate: true, deep: true });
		});

		return {
			selectionBox,
			rect,
			dragging,
			startDrag,
			drag,
			endDrag,
		}
	},
	emits: [
		'selectRectangle',
	]
}
</script>
