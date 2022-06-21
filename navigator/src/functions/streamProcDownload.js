export function streamProcDownload(argv, filename, opts = {}) {
	const query = window.btoa(JSON.stringify({
		payload: 'stream',
		binary: 'raw',
		spawn: [...argv],
		external: {
			'content-disposition': 'attachment; filename="' + encodeURIComponent(filename) + '"',
			'content-type': 'application/x-xz, application/octet-stream'
		},
		...opts,
	}));
	const prefix = (new URL(cockpit.transport.uri('channel/' + cockpit.transport.csrf_token))).pathname;
	const a = document.createElement("a");
	a.href = prefix + "?" + query;
	a.style.display = "none";
	a.download = filename;
	document.body.appendChild(a);
	const event = new MouseEvent('click', {
		'view': window,
		'bubbles': false,
		'cancelable': true
	});
	a.dispatchEvent(event);
	document.body.removeChild(a);
}
