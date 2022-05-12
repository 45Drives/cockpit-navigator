import { createApp, reactive } from 'vue';
import App from './App.vue';
import { FIFO } from '@45drives/cockpit-helpers';
import '@45drives/cockpit-css/src/index.css';

import router from './router';

const notificationFIFO = reactive(new FIFO());

const errorHandler = (error) => {
	console.error(error);
	const notificationObj = {
		title: "System Error",
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

const app = createApp(App, { notificationFIFO }).use(router);

app.config.errorHandler = (error) => errorHandler(error);

window.onerror = (...args) => errorHandler(args[4] ?? args[0]);

app.mount('#app');
