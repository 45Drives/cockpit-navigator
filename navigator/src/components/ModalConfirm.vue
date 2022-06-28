<template>
	<ModalPopup
		:show="show ?? show_"
		:fullWidth="opts_.fullWidth ?? fullWidth"
		@close="if (opts_.clickAwayCancels ?? clickAwayCancels) respond(false);"
		@after-leave="reset"
	>
		<template #header>
			<slot name="header">
				{{ headerText_ }}
			</slot>
		</template>
		<slot>
			{{ bodyText_ }}
		</slot>
		<template #footer>
			<slot name="footer">
				<button
					type="button"
					class="btn btn-secondary"
					@click="respond(false)"
				>
					{{ opts_.cancelText ?? cancelText }}
				</button>
				<button
					type="button"
					:class="['btn', (opts_.confirmDangerous ?? confirmDangerous) ? 'btn-danger' : 'btn-primary']"
					:disabled="disabled"
					@click="respond(true)"
				>
					{{ opts_.confirmText ?? confirmText }}
				</button>
			</slot>
		</template>
	</ModalPopup>
</template>

<script>
import { ref } from 'vue';
import ModalPopup from './ModalPopup.vue';

export default {
	props: {
		show: {
			type: Boolean,
			required: false,
			default: null,
		},
		clickAwayCancels: Boolean,
		confirmDangerous: Boolean,
		cancelText: {
			type: String,
			required: false,
			default: 'Cancel',
		},
		confirmText: {
			type: String,
			required: false,
			default: 'OK',
		},
		fullWidth: Boolean,
		disabled: Boolean,
	},
	setup(props, { emit }) {
		const show_ = ref(false);
		const headerText_ = ref("");
		const bodyText_ = ref("");
		const opts_ = ref({});
		const onReponse_ = ref(null);
		const ask = (headerText, bodyText, opts = {}) => {
			return new Promise(resolve => {
				opts_.value = opts;
				headerText_.value = headerText;
				bodyText_.value = bodyText;
				onReponse_.value = resolve;
				show_.value = true;
			});
		};
		const respond = (response) => {
			onReponse_.value?.(response);
			show_.value = false;
			if (response)
				emit('confirm');
			else
				emit('cancel');
		}
		const reset = () => {
			headerText_.value = "";
			bodyText_.value = "";
			opts_.value = {};
			onReponse_.value = null;
			emit('after-leave');
		}
		return {
			show_,
			headerText_,
			bodyText_,
			opts_,
			ask,
			respond,
			reset,
		}
	},
	components: {
		ModalPopup,
	},
	emits: [
		'cancel',
		'confirm',
		'after-leave',
	]
}
</script>
