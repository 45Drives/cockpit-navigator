import '../globalTypedefs';

/**
 * Watch path or directory for changes. If path, changes are watched on all files in that directory.
 * 
 * @param {String} path - Path to directory or file to watch
 * @param {FileSystemWatchOptions} options - Options for cockpit.channel
 * @param {Object} handlers - Callbacks for file system changes
 * @property {FileSystemEventCallback} onCreated - callback for file Created
 * @property {FileSystemEventCallback} onChanged - callback for file Changed
 * @property {FileSystemEventCallback} onDeleted - callback for file Deleted
 * @property {FileSystemEventCallback} onMoved - callback for file Moved
 * @property {FileSystemEventCallback} onAttributeChanged - callback for file AttributeChanged
 * @property {FileSystemEventCallback} onDoneHint - callback for file DoneHint
 * @property {FileSystemEventCallback} onError - Error callback, defaults to logging to console.error
 * @returns {FileSystemWatchObj} {@link FileSystemWatchObj}
 */
function FileSystemWatcher(path, options = {}, handlers = {}) {
	let fsWatchChannel = null;
	let fsWatchJobQueue = [];
	let unhandledEventQueue = [];
	let running = true;
	const self = {
		host: options.host ?? null,
		path,
		onCreated: handlers?.onCreated ?? null,
		onChanged: handlers?.onChanged ?? null,
		onDeleted: handlers?.onDeleted ?? null,
		onMoved: handlers?.onMoved ?? null,
		onAttributeChanged: handlers?.onAttributeChanged ?? null,
		onDoneHint: handlers?.onDoneHint ?? null,
		onError: handlers?.onError ?? (error => console.error(error)),
	};

	const handleEvent = (eventObj) => {
		if (options.ignoreSelf && eventObj.path === self.path)
			return;
		switch (eventObj.event) {
			case 'created':
				if (self.onCreated)
					fsWatchJobQueue.push(() => self.onCreated(eventObj));
				else
					unhandledEventQueue.push(eventObj);
				break;
			case 'attribute-changed':
				if (self.onAttributeChanged)
					fsWatchJobQueue.push(() => self.onAttributeChanged(eventObj));
				else
					unhandledEventQueue.push(eventObj);
				break;
			case 'changed':
				if (self.onChanged)
					fsWatchJobQueue.push(() => self.onChanged(eventObj));
				else
					unhandledEventQueue.push(eventObj);
				break;
			case 'deleted':
				if (self.onDeleted)
					fsWatchJobQueue.push(() => self.onDeleted(eventObj));
				else
					unhandledEventQueue.push(eventObj);
				break;
			case 'moved':
				if (self.onMoved)
					fsWatchJobQueue.push(() => self.onMoved(eventObj));
				else
					unhandledEventQueue.push(eventObj);
				break;
			case 'done-hint':
				if (self.onDoneHint)
					fsWatchJobQueue.push(() => self.onDoneHint(eventObj));
				else
					unhandledEventQueue.push(eventObj);
				break;
			default:
				const error = new Error(`File System Watcher: ${eventObj.event} ${eventObj.path}: not handled internally`)
				self.onError(error);
				break;
		}
	}

	/**
	 * Ensures all jobs from FsWatch1 are executed in order
	 */
	const fsWatchJobRunner = async () => {
		while (running) {
			while (fsWatchJobQueue.length) {
				try {
					await fsWatchJobQueue.shift()();
				} catch (error) {
					self.onError(error);
				}
			}
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}

	const setUpChannel = () => {
		fsWatchChannel = cockpit.channel({
			payload: "fswatch1",
			command: "open",
			watch: true,
			superuser: options.superuser ?? 'try',
			host: self.host,
			path: self.path,
		});

		fsWatchChannel.onmessage = (event, data) => handleEvent(JSON.parse(data));
		fsWatchChannel.onclose = (event, { problem, message }) => {
			if (problem) {
				const error = new Error(`File system watch error: ${message ?? problem}: Restarting watcher.`)
				self.onError(error);
				setUpChannel();
			}
		};
	}

	const takeDownChannel = () => {
		fsWatchChannel?.close?.();
	}

	self.stop = () => {
		running = false;
		takeDownChannel();
	};

	fsWatchJobRunner(); // start runner
	setUpChannel();

	return new Proxy(self, {
		get: (target, prop) => target[prop],
		set: (target, prop, value) => {
			let restartChannel = ((prop === 'path' || prop === 'host') && target[prop] !== value);

			if (restartChannel) {
				takeDownChannel();
			}

			target[prop] = value;

			if (restartChannel) {
				setUpChannel();
			}

			if (
				[
					'onCreated',
					'onChanged',
					'onDeleted',
					'onMoved',
					'onAttributeChanged',
				].includes(prop)
			) {
				let tmpUnhandledEvents = [...unhandledEventQueue];
				unhandledEventQueue = [];
				while (tmpUnhandledEvents.length)
					handleEvent(tmpUnhandledEvents.shift());
			}

			return true;
		}
	});
}

export default FileSystemWatcher;

/**
 * Object controlling a file system watch
 * 
 * @typedef {Object} FileSystemWatchObj
 * @property {String} host - host to watch on, can be changed whenever and will reopen channel
 * @property {String} path - path to watch, can be changed whenever and will reopen channel
 * @property {FileSystemEventCallback} onCreated - callback for file Created
 * @property {FileSystemEventCallback} onChanged - callback for file Changed
 * @property {FileSystemEventCallback} onDeleted - callback for file Deleted
 * @property {FileSystemEventCallback} onMoved - callback for file Moved
 * @property {FileSystemEventCallback} onAttributeChanged - callback for file AttributeChanged
 * @property {FileSystemEventCallback} onDoneHint - callback for file DoneHint
 * @property {ErrorCallback} onError - Error callback, defaults to logging to console.error
 * @property {Function} stop - Stop the file system watcher
 */

/**
 * @typedef {Object} FileSystemEventObj
 * @property {String} event - String describing what happened:  "changed", "deleted", "created", "attribute-changed", "moved", or "done-hint"
 * @property {String} path - Absolute path to file that has changed
 * @property {String} other - The absolute path name of the other file in case of a "moved" event
 * @property {String} type - If the event was created this contains the type of the new file. Will be one of: "file", "directory", "link", "special" or "unknown".
 */

/**
 * @callback FileSystemEventCallback
 * @param {FileSystemEventObj} eventObj - The object containing information about the file change
 * @returns {Promise}
 */

/**
 * @typedef {Object} FileSystemWatchOptions
 * @property {String} host - Host to watch on
 * @property {String} superuser - 'try' or 'require' or undefined
 * @property {Boolean} ignoreSelf - Ignore changes for provided path (i.e. only watch sub-entries of directory)
 */
