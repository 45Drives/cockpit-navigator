import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
	{
		path: '/browse:host(/[^/:]+:?[0-9]*:)?:path(/.*)',
		name: 'browse',
		component: () => import('../views/Browser.vue'),
	},
	{
		path: '/browse:host(/[^/:]+:?[0-9]*:)?',
		redirect: route => `${route.fullPath}/`
	},
	{
		path: '/edit:host(/[^/:]+:?[0-9]*:)?:path(/.+)',
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
	}
];

const router = createRouter({
	history: createWebHashHistory(),
	routes,
});

export default router;
