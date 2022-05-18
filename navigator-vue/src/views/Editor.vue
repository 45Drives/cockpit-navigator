<template>
	<div class="grow">Editing {{ path }}</div>
</template>

<script>
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

export default {
	setup() {
		const path = ref("");

		const route = useRoute();

		watch(() => route.params.path, (filePath) => path.value = filePath, { immediate: true });

		return {
			path,
		}
	}
}
</script> 
