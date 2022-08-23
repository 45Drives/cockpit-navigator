/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	base: "./",
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src')
		},
	},
	build: {
		target: [
			"chrome87", "edge88", "firefox78", "safari14"
		],
	},
	test: {
		globals: true,
	}
})
