import { createRouter, createWebHashHistory } from 'vue-router';
import { lastPathStorageKey } from '../keys';

const routes = [
	{
		path: '/browse',
		redirect: () => `/browse/${cockpit.transport.host ?? 'localhost'}/`,
	},
	{
		path: '/browse/:host([^/]+)',
		redirect: route => `${route.fullPath}/`,
	},
	{
		path: '/browse/:host([^/]+):path(/.*)',
		strict: true,
		name: 'browse',
		component: () => import('../views/Browser.vue'),
	},
	{
		path: '/edit/:host:path(/.+)',
		name: 'edit',
		component: () => import('../views/Editor.vue'),
	},
	{
		path: '/errorRedirect',
		name: 'errorRedirect',
		component: () => import('../views/ErrorRedirect.vue'),
		props: route => ({ title: route.query.title, message: route.query.message }),
	},
	{
		path: '/:pathMatch(.+)',
		name: 'notFound',
		redirect: route => ({ name: 'errorRedirect', query: { title: 'Not found', message: `${route.href} is not a valid location.` }}),
	},
	{
		path: '/',
		name: 'root',
		redirect: () => localStorage.getItem(lastPathStorageKey) ?? `/browse/${cockpit.transport.host ?? 'localhost'}/`,
	}
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

export default router;
