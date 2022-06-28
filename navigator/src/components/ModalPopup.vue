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
	<transition
		enter-active-class="ease-out duration-500"
		enter-from-class="opacity-0"
		enter-to-class="opacity-100"
		leave-active-class="ease-in duration-500"
		leave-from-class="opacity-100"
		leave-to-class="opacity-0"
	>
		<div
			v-if="() => show ?? show_"
			class="fixed z-10 inset-0 bg-neutral-500/75 dark:bg-black/50 transition-opacity pointer"
		/>
	</transition>
	<transition
		enter-active-class="ease-out duration-300"
		enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-90"
		enter-to-class="opacity-100 translate-y-0 sm:scale-100"
		leave-active-class="ease-in duration-100"
		leave-from-class="opacity-100 translate-y-0 sm:scale-100"
		leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-75"
		@after-leave="reset"
	>
		<div
			v-if="() => show ?? show_"
			class="fixed z-10 inset-0 overflow-hidden flex items-end sm:items-center justify-center px-4 pb-20 sm:p-0"
			@click.self="close(false)"
		>
			<div
				:class="[fullWidth ? 'sm:max-w-full' : 'sm:max-w-lg', 'inline-flex flex-col items-stretch overflow-hidden transform transition-all text-left z-10']">
				<div class="block w-[512px]" /> <!-- set min width of div -->
				<div class="card flex flex-col items-stretch overflow-hidden">
					<div class="card-header">
						<h3 class="text-header">
							<slot name="header">
								{{ headerText_ }}
							</slot>
						</h3>
					</div>
					<div class="card-body flex flex-row items-center gap-2">
						<slot name="icon" />
						<div class="grow overflow-x-auto">
							<slot>
								{{ bodyText_ }}
							</slot>
						</div>
					</div>
					<div class="card-footer w-full">
						<div class="button-group-row justify-end overflow-x-auto">
							<slot name="footer">
								<button
									type="button"
									class="btn btn-primary"
									@click="close(true)"
								>
									OK
								</button>
							</slot>
						</div>
					</div>
				</div>
			</div>
		</div>
	</transition>
</template>

<script>
import { ref } from 'vue';
export default {
	props: {
		show: {
			type: Boolean,
			required: false,
			default: null,
		},
		fullWidth: Boolean,
	},
	setup(props, { emit }) {
		const show_ = ref(false);
		const headerText_ = ref("");
		const bodyText_ = ref("");
		const onClose_ = ref(null);
		const open = (headerText, bodyText) => {
			return new Promise(resolve => {
				headerText_.value = headerText;
				bodyText_.value = bodyText;
				onClose_.value = resolve;
				show_.value = true;
			});
		};
		const close = (clickedOk) => {
			onClose_.value?.(clickedOk);
			show_.value = false;
			emit('close');
		};
		const reset = () => {
			headerText_.value = '';
			bodyText_.value = '';
			onClose_.value = null;
			emit('after-leave');
		}
		return {
			show_,
			headerText_,
			bodyText_,
			open,
			close,
			reset,
		}
	},
	emits: [
		'close',
		'after-leave',
	]
};
</script>
