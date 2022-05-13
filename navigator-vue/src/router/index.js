import { createRouter, createWebHashHistory } from 'vue-router';
import { lastPathStorageKey } from '../keys';

const routes = [
	{
		path: '/browse:path(.+)',
		name: 'browse',
		component: () => import('../views/Browser.vue'),
	},
	{
		path: '/edit/:path(.*)',
		name: 'edit',
		component: () => import('../views/Editor.vue'),
	},
	{
		path: '/:pathMatch(.*)*',
		name: 'redirectToBrowse',
	},
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

router.beforeEach((to, from, next) => {
	if (to.name === 'redirectToBrowse') {
		const lastLocation = localStorage.getItem(lastPathStorageKey) ?? '/';
		next(`/browse${lastLocation}`);
		cockpit.location.go(`/browse${lastLocation}`);
	} else {
		next();
	}
})

export default router;
