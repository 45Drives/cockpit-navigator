<!--
Copyright (C) 2022 Josh Boudreau <jboudreau@45drives.com>

This file is part of Cockpit File Sharing.

Cockpit File Sharing is free software: you can redistribute it and/or modify it under the terms
of the GNU General Public License as published by the Free Software Foundation, either version 3
of the License, or (at your option) any later version.

Cockpit File Sharing is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Cockpit File Sharing.
If not, see <https://www.gnu.org/licenses/>. 
-->

<template>
	<ModalPopup :showModal="show" :headerText="entry?.nameHTML" @apply="apply"
		@cancel="$emit('hide')">
		<div class="flex flex-col space-y-content items-start">
			<FileModeMatrix v-model="mode" />
			<div>
				<label class="block text-sm font-medium">Owner</label>
				<select class="input-textlike" v-model="owner">
					<option v-for="user in users" :value="user.user">{{ user.pretty }}</option>
				</select>
			</div>
			<div>
				<label class="block text-sm font-medium">Group</label>
				<select class="input-textlike" v-model="group">
					<option v-for="group in groups" :value="group.group">{{ group.pretty }}</option>
				</select>
			</div>
		</div>
	</ModalPopup>
</template>

<script>
import { watch, ref, onMounted } from 'vue';
import ModalPopup from "./ModalPopup.vue";
import FileModeMatrix from "./FileModeMatrix.vue";
import { useSpawn, errorString, canonicalPath } from "@45drives/cockpit-helpers";
import { getUsers } from '../functions/getUsers';
import { getGroups } from '../functions/getGroups';
export default {
	props: {
		show: Boolean,
		entry: Object,
		onError: {
			type: Function,
			required: false,
			default: console.error,
		},
	},
	setup(props, { emit }) {
		const mode = ref(0);
		const owner = ref("");
		const group = ref("");
		const users = ref([]);
		const groups = ref([]);

		const getPermissions = async () => {
			try {
				let modeStr;
				[modeStr, owner.value, group.value] = (
					await useSpawn(['stat', '--format=%a:%U:%G', props.entry.path], { superuser: 'try', host: props.entry.host }).promise()
				).stdout.trim().split(':');
				mode.value = parseInt(modeStr, 8);
			} catch (state) {
				const error = new Error(errorString(state));
				error.name = "Permissions Query Error";
				props.onError(error);
				emit('hide');
			}
		}

		const apply = async () => {
			if (canonicalPath(props.entry.path) === '/') {
				const error = new Error("Cannot Edit Permissions for '/'. If you think you need to do this, you don't.");
				error.name = "Permissions Apply Error";
				props.onError(error);
				emit('hide');
				return;
			}
			const procs = [];
			procs.push(useSpawn(['chown', owner.value, props.entry.path], { superuser: 'try', host: props.entry.host }).promise());
			procs.push(useSpawn(['chgrp', group.value, props.entry.path], { superuser: 'try', host: props.entry.host }).promise());
			procs.push(useSpawn(['chmod', mode.value.toString(8), props.entry.path], { superuser: 'try', host: props.entry.host }).promise());
			for (const proc of procs) {
				try {
					await proc;
				} catch (state) {
					const error = new Error(errorString(state));
					error.name = "Permissions Apply Error";
					props.onError(error);
				}
			}
			emit('hide');
		}

		onMounted(async () => {
			users.value = await getUsers();
			groups.value = await getGroups();
		});

		watch(() => props.show, (show, lastShow) => {
			if (show && props.entry) getPermissions();
		}, { immediate: true });

		return {
			mode,
			owner,
			group,
			users,
			groups,
			apply,
		}
	},
	components: {
		ModalPopup,
		FileModeMatrix,
	},
	emits: [
		'hide',
	]
}
</script>
