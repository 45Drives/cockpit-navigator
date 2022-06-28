<template>
	<ModalConfirm
		:show="show ?? show_"
		:clickAwayCancels="clickAwayCancels"
		:confirmDangerous="opts_.confirmDangerous ?? confirmDangerous"
		:cancelText="cancelText"
		:confirmText="confirmText"
		:fullWidth="fullWidth"
		:disabled="!valid"
		@cancel="cancel"
		@confirm="confirm"
		@after-leave="reset"
	>
		<template #header>
			<slot name="header">
				{{ headerText_ }}
			</slot>
		</template>
		<div v-if="inputs_.length === 0">
			<input
				type="text"
				v-model="defaultInputValue_"
				class="w-full input-textlike"
			/>
		</div>
		<div
			v-else
			v-for="input in inputs_"
			:key="input.key"
		>
			<label
				v-if="input.label"
				class="block text-label"
			>{{ input.label }}</label>
			<template v-if="input.type === 'radio'">
				<input
					v-for="option in input.options"
					v-bind="{ ...input.props }"
					type="radio"
					:value="option"
					v-model="input.value"
					ref="inputRefs_"
				/>
			</template>
			<input
				v-else
				v-bind="{ ...input.props }"
				:type="input.type"
				:placeholder="input.placeholder"
				v-model="input.value"
				@change="input.feedback = input.validate(input.value)"
				ref="inputRefs_"
			/>
			<div
				v-if="input.feedback"
				class="feedback-group"
			>
				<ExclamationCircleIcon class="size-icon icon-error" />
				<span class="text-feedback text-error">{{ input.feedback }}</span>
			</div>
		</div>
	</ModalConfirm>
</template>

<script>
import { ref, nextTick } from 'vue';
import { ExclamationCircleIcon } from '@heroicons/vue/solid';
import ModalConfirm from './ModalConfirm.vue';

/**
 * @template T
 * @typedef {Object} ModalPromptInputObj
 * @property {String} key - Key to index output object
 * @property {String} label - Text to go in label
 * @property {String} type - input tag type property value
 * @property {T} value - current value of input to be v-modelled
 * @property {String} placeholder - Placeholder text
 * @property {ModalPromptInputValidationCallback<T>} validate - Validation function, return string if invalid or null if valid
 * @property {String} feedback - Feedback if invalid
 * @property {Object} props - Extra properties to v-bind to the input element
 * @property {*[]|undefined} options - Array of option values for radio button input
 */

/**
 * @template T
 * @callback ModalPromptInputValidationCallback
 * @param {T} value - Current value of input to validate
 * @returns {String|null} - Return null if valid or string explaining why it's invalid
 */

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
	},
	setup(props, { emit }) {
		const show_ = ref(false);
		const headerText_ = ref("");
		const opts_ = ref({});
		const inputs_ = ref([]);
		const valid_ = ref(false);
		const resolver_ = ref(null);
		const defaultInputRef_ = ref();
		const defaultInputValue_ = ref("");
		const inputRefs_ = ref([]);

		const ask = (headerText, inputs = [], opts = {}) => {
			const prom = new Promise(resolve => {
				opts_.value = opts;
				headerText_.value = headerText;
				inputs_.value = inputs;
				resolver_.value = resolve;
				show_.value = true;
				nextTick(() => {
					if (inputs.length) {
						inputRefs_.value[0].focus();
					} else {
						defaultInputRef_.value.focus();
					}
				});
			});
			/**
			 * Add a text input
			 * @param {String} key - Key to index output object
			 * @param {String} label - Text to go in label
			 * @param {String} defaultValue - Default value
			 * @param {String} placeholder - Placeholder text
			 * @param {ModalPromptInputValidationCallback<String>} validate - Input validation callback
			 * @param {Object} props - Extra properties to v-bind to the input element
			 */
			prom.addTextInput = (key, label, defaultValue, placeholder, validate = () => null, props = {}) => {
				/**
				 * @type {ModalPromptInputObj<String>}
				 */
				const input = {
					key,
					label,
					type: 'text',
					value: defaultValue,
					placeholder,
					validate,
					props: {...props, class: 'input-textlike ' + (props.class ?? '')},
					feedback: '',
				}
				inputs_.value.push(input);
				return prom;
			}
			/**
			 * Add a checkbox input
			 * @param {String} key - Key to index output object
			 * @param {String} label - Text to go in label
			 * @param {*} defaultValue - Default value
			 * @param {*} trueValue - Value of result when checked
			 * @param {*} falseValue - Value of result when unchecked
			 * @param {Object} props - Extra properties to v-bind to the input element
			 */
			prom.addCheckboxInput = (key, label, defaultValue = false, trueValue = true, falseValue = false, props = {}) => {
				/**
				 * @type {ModalPromptInputObj<*>}
				 */
				const input = {
					key,
					label,
					type: 'checkbox',
					value: defaultValue,
					placeholder,
					validate: () => null,
					props: { ...props, 'true-value': trueValue, 'false-value': falseValue, class: 'input-checkbox ' + (props.class ?? '') },
					feedback: '',
				}
				inputs_.value.push(input);
				return prom;
			}
			return prom;
		};

		const confirm = () => {
			const response = inputs_.value.length
				? inputs_.value.reduce((response, input) => {
					response[input.key] = input.value;
					return response;
				}, {})
				: defaultInputValue_.value;
			resolver_.value?.(response);
			show_.value = false;
			emit('confirm');
		};

		const cancel = () => {
			resolver_.value?.(null);
			show_.value = false;
			emit('cancel');
		};

		const reset = () => {
			headerText_ = "";
			opts_.value = {};
			inputs_.value = [];
			valid_.value = false;
			resolver_.value = null;
			defaultInputValue_.value = "";
			emit('after-leave');
		};

		const validate = () => {
			valid_.value = inputs_.value.every(input => input.feedback === null);
		};

		return {
			show_,
			opts_,
			headerText_,
			inputs_,
			valid_,
			resolver_,
			defaultInputRef_,
			defaultInputValue_,
			inputRefs_,
			ask,
			confirm,
			cancel,
			reset,
			validate,
		}
	},
	components: {
		ModalConfirm,
		ExclamationCircleIcon,
	},
	emits: [
		'confirm',
		'cancel',
		'after-leave',
	]
}
</script>
