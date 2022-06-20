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
	<div class="grow flex flex-col items-center justify-center gap-10">
		<div class="text-header">{{ title }}</div>
		<div class="text-muted">{{ message }}</div>
		<div class="text-muted">Redirecting in {{ counter }}...</div>
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
