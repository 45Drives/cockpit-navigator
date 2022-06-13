<template>
	<button @click="$emit('update:modelValue', modelValue === trueValue ? falseValue: trueValue)">
		<slot :value="modelValue === trueValue">

		</slot>
	</button>
</template>

<script>
export default {
	props: {
		modelValue: Boolean,
		trueValue: {
			required: false,
			default: true,
		},
		falseValue: {
			required: false,
			default: false,
		},
	},
}
</script>
