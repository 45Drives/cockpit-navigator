<template>
	<ModalPopup
		:showModal="show"
		:headerText="createNew ? `New ${({f: 'file', d: 'directory'})[createNew]}` : `Rename ${entry?.name}`"
		autoWidth
		:disableContinue="!valid"
		@cancel="() => $emit('hide')"
		@apply="apply"
	>
		<input
			type="text"
			v-model="name"
			class="input-textlike w-full"
			placeholder="Name"
			@keypress.enter="apply"
			ref="inputRef"
		/>
		<div
			v-if="feedback"
			class="feedback-group"
		>
			<ExclamationCircleIcon class="size-icon icon-error" />
			<span class="text-feedback text-error">{{ feedback }}</span>
		</div>
		<div
			v-if="stderr"
			class="feedback-group"
		>
			<ExclamationCircleIcon class="size-icon icon-error" />
			<span
				class="text-feedback text-error"
				v-html="stderr"
			/>
		</div>
	</ModalPopup>
</template>

<script>
import { nextTick, ref, watch } from 'vue';
import { useSpawn, errorStringHTML } from "@45drives/cockpit-helpers";
import { ExclamationCircleIcon } from '@heroicons/vue/solid';
import ModalPopup from './ModalPopup.vue';

export default {
	props: {
		show: Boolean,
		entry: Object,
		createNew: String,
	},
	setup(props, { emit }) {
		const name = ref("");
		const valid = ref(false);
		const feedback = ref("");
		const stderr = ref("");
		const inputRef = ref();

		const apply = async () => {
			if (!valid.value)
				return;
			stderr.value = "";
			try {
				if (!props.createNew) {
					await (useSpawn(['mv', '-nT', props.entry.path, props.entry.path.split('/').slice(0, -1).concat(name.value).join('/')], { superuser: 'try', host: props.entry.host }).promise());
				} else if (['f', 'd'].includes(props.createNew)) {
					const parentPath = props.entry.resolvedType === 'd' ? props.entry.resolvedPath : props.entry.path.split('/').slice(0, -1).join('/');
					const path = `${parentPath}/${name.value}`
					await useSpawn(['test', '!', '(', '-e', path, '-o', '-L', path, ')'], { superuser: 'try', host: props.entry.host }).promise().catch(() => { throw new Error('File exists') });
					if (props.createNew === 'f')
						await useSpawn(['dd', 'count=0', 'oflag=nofollow', 'conv=excl,fsync', `of=${path}`], { superuser: 'try', host: props.entry.host }).promise();
					else
						await useSpawn(['mkdir', path], { superuser: 'try', host: props.entry.host }).promise();
				}
					
				emit('hide');
				setTimeout(() => {
					name.value = feedback.value = "";
					valid.value = false;
				}, 500);
			} catch (state) {
				valid.value = false;
				stderr.value = errorStringHTML(state);
			}
		};

		watch([() => props.entry, () => props.createNew], () => {
			if (props.createNew)
				name.value = "";
			else
				name.value = props.entry?.name ?? "";
		}, { immediate: true });

		watch(name, () => {
			let result = true;
			let feedbackArr = [];
			if (!name.value) {
				feedbackArr.push('Name cannot be empty');
				result = false;
			}
			if (name.value.includes('/')) {
				feedbackArr.push("Name cannot include '/'");
				result = false;
			}
			if (['.', '..'].includes(name.value)) {
				feedbackArr.push(`Name cannot be '${name.value}'`);
				result = false;
			}
			feedback.value = feedbackArr.join(', ');
			valid.value = result;
		});

		watch(() => props.show, () => {
			if (props.show) {
				feedback.value = stderr.value = "";
				nextTick(() => inputRef.value.focus());
			}
		});

		return {
			name,
			valid,
			feedback,
			stderr,
			inputRef,
			apply,
		}
	},
	components: {
		ExclamationCircleIcon,
		ModalPopup,
	},
	emits: [
		'hide',
	]
}
</script>
