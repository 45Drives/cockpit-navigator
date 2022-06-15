<template>
	<div v-show="dragging" class="fixed border-red-600/50 border border-solid bg-red-600/10 rounded-lg" ref="selectionBox"></div>
	<div @mousedown="startDrag" v-bind="$attrs">
		<slot />
	</div>
</template>

<script>
import { ref, reactive, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
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
