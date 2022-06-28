<template>
	<ShieldExclamationIcon v-if="isRoot" class="size-icon icon-danger" />
</template>

<script>
import { onUnmounted, ref } from 'vue';
import { ShieldExclamationIcon } from '@heroicons/vue/solid'

export default {
	setup() {
		const isRoot = ref(false);

		const permission = cockpit.permission({ admin: true });

		const updateIsRoot = () => {
			isRoot.value = permission.allowed;
		}

		permission.addEventListener('changed', updateIsRoot);

		onUnmounted(() => {
			permission.removeEventListener('changed', updateIsRoot);
			permission.close();
		})

		return {
			isRoot,
		}
	},
	components: {
		ShieldExclamationIcon,
	}
}
</script>
