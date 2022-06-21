<template>
	<ModalPopup
		:showModal="show"
		:headerText="headerText"
		autoWidth
		:disableContinue="!valid"
		@cancel="cancel()"
		@apply="apply()"
	>
		<div
			v-for="input in inputs"
			:key="input.key"
		>
			<label
				v-if="input.label"
				class="block text-label"
			>{{ input.label }}</label>
			<input
				:class="[!['button', 'checkbox', 'color', 'file', 'radio', 'range'].includes(input.type) ? 'input-textlike w-full' : input.type == 'checkbox' ? 'input-checkbox' : '']"
				v-bind="{...input.props}"
				:type="input.type"
				:value="output[input.key] ?? input.default"
				:placeholder="input.placeholder"
				@input="(event) => { output[input.key] = event.target.value; validate(); }"
			/>
			<div
				v-if="input.feedback"
				class="feedback-group"
			>
				<ExclamationCircleIcon class="size-icon icon-error" />
				<span class="text-feedback text-error">{{ input.feedback }}</span>
			</div>
		</div>
	</ModalPopup>
</template>

<script>
import { ref, computed, nextTick } from 'vue';
import { ExclamationCircleIcon } from '@heroicons/vue/solid';
import ModalPopup from './ModalPopup.vue';

export default {
	setup(props, { emit }) {
		const show = ref(false);
		const headerText = ref("");
		const inputs = ref([]);
		const output = ref({});
		const valid = ref(false);
		const apply = ref(() => null);
		const cancel = ref(() => null);

		/**
		 * Promise with method to add input to prompt
		 * @typedef {Object} ModalPromptPromise
		 * @property {function} addInput
		 */

		/**
		 * Prompt user for input
		 * @param {string} header - Text to display in popup header
		 * @returns {ModalPromptPromise} - Resolves object with responses or null if cancelled
		 */
		const prompt = (header) => {
			headerText.value = header;
			output.value = {};
			inputs.value = [];
			valid.value = false;
			show.value = true;
			const prom = new Promise((resolve, reject) => {
				apply.value = () => resolve(output.value);
				cancel.value = () => resolve(null);
			}).finally(() => show.value = false);
			/**
			 * Callback to validate input, cannot be arrow function
			 * @callback ModalPromptInputValidationCallback
			 * @param {any} - value of input
			 * @returns {boolean} - true if valid, false otherwise
			 */
			/**
			 * Add an input to the prompt
			 * @param {string} key - object key for result
			 * @param {string} type - input tag type prop value
			 * @param {string} label - label for input
			 * @param {string} placeholder - input placeholder if applicable
			 * @param {any} defaultValue - Default value of input
			 * @param {ModalPromptInputValidationCallback} validate - Validation callback for input
			 * @param {object} props  - optional extra properties for input tag
			 * @returns {ModalPromptPromise} - Resolves object with responses or null if cancelled
			 */
			const addInput = (key, type, label, placeholder, defaultValue, validate, props) => {
				const input = {
					key,
					type,
					label,
					placeholder,
					default: defaultValue,
					props,
					feedback: '',
				}
				output.value[key] = defaultValue;
				input.validate = validate?.bind(input),
				inputs.value.push(input);
				return prom;
			}
			prom.addInput = addInput;
			return prom;
		}

		const validate = () => {
			valid.value = inputs.value.every(input => input.validate?.(output.value[input.key]) ?? true);
		}

		return {
			show,
			headerText,
			inputs,
			output,
			valid,
			apply,
			cancel,
			prompt,
			validate,
		}
	},
	components: {
		ModalPopup,
		ExclamationCircleIcon,
	}
}
</script>
