<template>
	<div class="grow flex flex-col items-center justify-center gap-10">
		<div class="text-header">{{title}}</div>
		<div class="text-muted">{{message}}</div>
		<div class="text-muted">Redirecting in {{counter}}...</div>
	</div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps({
	message: {
		type: String,
		required: false,
		default: "A system error has occured.",
	},
	title: {
		type: String,
		required: false,
		default: "Error",
	}
})

const router = useRouter();

const counter = ref(3);

const countdown = () => {
	counter.value--;
	if (counter.value > 0)
		setTimeout(countdown, 1000);
	else
		router.push(`/browse/${cockpit.transport.host}/`);
}
setTimeout(countdown, 1000);

</script>
