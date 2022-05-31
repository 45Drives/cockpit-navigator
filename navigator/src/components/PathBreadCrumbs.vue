<template>
	<div class="flex items-center gap-2">
		<div class="inline relative">
			<input type="text" class="input-textlike pr-10" v-model="hostInput" @change="hostChangeCallback"
				ref="hostInputRef" />
			<div class="absolute right-0 inset-y-0 pr-3 flex items-center pointer-events-none">
				<ServerIcon class="size-icon icon-default" />
			</div>
		</div>
		<div class="flex items-center cursor-text h-10 grow" @click="typing = true">
			<template v-if="typing">
				<input v-model="pathInput" type="text" list="pathInputSuggestions" class="block w-full input-textlike"
					@change="pathChangeCallback" ref="pathInputRef" @focusout="typing = false" />
				<datalist id="pathInputSuggestions">
					<option v-for="path in pathSuggestions" :value="path" />
				</datalist>
			</template>
			<div v-else class="inline-flex items-center gap-1">
				<template v-for="segment, index in pathArr" :key="index">
					<ChevronRightIcon v-if="index > 0" class="size-icon icon-default" />
					<button @click.prevent.stop="$emit('cd', { path: `/${pathArr.slice(1, index + 1).join('/')}` })"
						class="p-2 hover:bg-accent rounded-lg cursor-pointer" v-html="escapeStringHTML(segment)"
						:title="escapeString(`/${pathArr.slice(1, index + 1).join('/')}`)"></button>
				</template>
			</div>
		</div>
	</div>
</template>

<script>
import { ref, watch, nextTick, onMounted, computed } from 'vue';
import { canonicalPath } from "@45drives/cockpit-helpers";
import { ChevronRightIcon, ServerIcon } from '@heroicons/vue/solid';
import { escapeString, escapeStringHTML } from '../functions/escapeStringHTML';
import { getDirEntryStats } from '../functions/getDirEntryObjects';

export default {
	props: {
		path: String,
		host: String,
	},
	setup(props, { emit }) {
		const pathArr = ref([]);
		const typing = ref(false);
		const pathInput = ref("");
		const hostInput = ref("");
		const pathSuggestions = ref([]);
		const pathInputRef = ref();
		const hostInputRef = ref();
		const parentDir = computed(() =>
			(/^(?!\/)/.test(pathInput.value)
				? `${props.path}/${pathInput.value}`
				: pathInput.value
			).replace(/((?<!^)\/)*[^\/]*$/, '') // remove last segment of path, maintaining first '/'
		);

		const pathChangeCallback = () => {
			if (/^(?!\/)/.test(pathInput.value))
				pathInput.value = `${props.path}/${pathInput.value}`;
			pathInput.value = canonicalPath(pathInput.value);
			emit('cd', { path: pathInput.value });
		}

		const hostChangeCallback = () => {
			console.log("hostChangeCallback");
			hostInput.value = hostInput.value || cockpit.transport.host;
			emit('cd', { host: hostInput.value });
		}

		const getPathSuggestions = async (parentDir) => {
			try {
				pathSuggestions.value = (await getDirEntryStats(parentDir, props.host, ['%p'], ['-type', 'd'])).flat(1);
			} catch (error) {
				console.error(error);
				pathSuggestions.value = [];
			}
		}

		watch(() => props.path, () => {
			pathArr.value = ['/', ...canonicalPath(props.path).replace(/^\//, '').split('/')].filter(segment => segment);
			pathInput.value = props.path;
			typing.value = false;
		}, { immediate: true });

		watch(() => props.host, () => {
			hostInput.value = props.host;
		}, { immediate: true });

		watch(parentDir, getPathSuggestions, { immediate: true });

		onMounted(() => {
			watch(typing, () => {
				if (typing.value)
					nextTick(() => pathInputRef.value.focus());
			});

			watch(hostInput, () => {
				const computedStyle = window.getComputedStyle(hostInputRef.value);
				hostInputRef.value.style.width = `calc(${hostInput.value.length}ch + ${computedStyle.paddingRight} + ${computedStyle.paddingLeft} + 5px)`;
			}, { immediate: true });
		})

		return {
			pathArr,
			typing,
			pathInput,
			hostInput,
			pathSuggestions,
			pathInputRef,
			hostInputRef,
			pathChangeCallback,
			hostChangeCallback,
			canonicalPath,
			escapeString,
			escapeStringHTML,
		}
	},
	components: {
		ChevronRightIcon,
		ServerIcon,
	},
	emits: [
		'cd',
	]
}
</script>
