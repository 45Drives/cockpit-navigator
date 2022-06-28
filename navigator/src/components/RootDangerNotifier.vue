<template>
	<ShieldExclamationIcon v-if="showWarning" class="size-icon icon-danger" />
</template>

<script>
import { onUnmounted, ref, watch } from 'vue';
import { ShieldExclamationIcon } from '@heroicons/vue/solid';
import { useSpawn } from '@45drives/cockpit-helpers';

export default {
	props: {
		host: String,
	},
	setup(props) {
		const showWarning = ref(false);

		const isRoot = ref(false);

		const permission = cockpit.permission({ admin: true });

		const updateShowWarning = () => {
			showWarning.value = permission.allowed || isRoot.value;
		}

		permission.addEventListener('changed', updateShowWarning);

		onUnmounted(() => {
			permission.removeEventListener('changed', updateShowWarning);
			permission.close();
		})

		watch(() => props.host, async (host) => {
			try {
				const idStr = (await useSpawn(['id', '-u'], { superuser: 'try', host }).promise()).stdout;
				isRoot.value = parseInt(idStr) === 0;
			} catch (state) {
				isRoot.value = false;
			} finally {
				updateShowWarning();
			}
		}, { immediate: true });

		return {
			showWarning,
		}
	},
	components: {
		ShieldExclamationIcon,
	}
}
</script>
