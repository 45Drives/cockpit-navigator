/*
 * Copyright (C) 2022 Josh Boudreau <jboudreau@45drives.com>
 * 
 * This file is part of Cockpit Navigator.
 * 
 * Cockpit Navigator is free software: you can redistribute it and/or modify it under the terms
 * of the GNU General Public License as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 * 
 * Cockpit Navigator is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with Cockpit Navigator.
 * If not, see <https://www.gnu.org/licenses/>.
 */

import { createApp, reactive } from 'vue';
import App from './App.vue';
import { errorString, FIFO } from '@45drives/cockpit-helpers';
import '@45drives/cockpit-css/src/index.css';
import { useSpawn, errorStringHTML } from '@45drives/cockpit-helpers';
import { lastPathStorageKey } from './keys';

import router from './router';

const notificationFIFO = reactive(new FIFO());

const errorHandler = (error, title = "System Error") => {
	console.error(error);
	const notificationObj = {
		title,
		body: "",
		show: true,
		timeout: 10000,
		actions: [],
		level: "error",
	}
	if (error instanceof Error && error?.message) {
		notificationObj.body = error.message;
	} else if (typeof error === "string") {
		notificationObj.body = error;
	} else if (error?.stderr) {
		notificationObj.body = error.stderr;
	} else {
		notificationObj.body = "An error occured, check the system console (CTRL+SHIFT+J) for more information.";
	}
	if (notificationFIFO.getLen() < 10)
		notificationFIFO.push(notificationObj);
	else
		throw error;
}

let lastValidRoutePath = null;
router.beforeEach(async (to, from) => {
	if (to.fullPath === lastValidRoutePath) {
		return true; // ignore from updating window.location.hash
	}
	const host = to.params.host || undefined;
	if (to.name === 'browse') {
		try {
			let realPath = (await useSpawn(['realpath', '--canonicalize-existing', to.params.path], { superuser: 'try', host }).promise()).stdout.trim();
			if (to.params.path !== realPath)
				return `/browse/${to.params.host}${realPath}`;
			try {
				await useSpawn(['test', '-r', to.params.path, '-a', '-x', to.params.path], { superuser: 'try', host }).promise();
			} catch {
				throw new Error(`Permission denied for ${to.params.path}`);
			}
		} catch (error) {
			if (from.name === undefined)
				return { name: 'errorRedirect', query: { title: "Error opening path", message: errorString(error), ...to.query } }
			errorHandler(errorStringHTML(error), "Failed to open path");
			return false;
		}
		localStorage.setItem(lastPathStorageKey, to.fullPath);
	}
	lastValidRoutePath = to.fullPath; // protect double-update from next line
	window.location.hash = '#' + to.fullPath; // needed to update URL in address bar
	return true;
})

const app = createApp(App, { notificationFIFO }).use(router);

app.config.errorHandler = (error) => errorHandler(error);

window.onerror = (...args) => errorHandler(args[4] ?? args[0]);

app.mount('#app');
