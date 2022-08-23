import { NavigatorError } from './Error'
import cockpit from '@45drives/cockpit-typings';

export class ProcessError extends NavigatorError { }

export interface IProcess {
	/**
	 * Exit code of process.
	 */
	exitCode: number;
	/**
	 * Standard output of process.
	 */
	stdout: Uint8Array;
	/**
	 * Standard error of process.
	 */
	stderr: Uint8Array;
	/**
	 * Argument vector of process
	 */
	readonly argv: string[];
}

const utf8Decoder = new TextDecoder('utf-8');
const utf8Encoder = new TextEncoder();

export class Process implements PromiseLike<IProcess> {
	private spawnProc: cockpit.Spawn.ProcessHandle<Uint8Array>;
	private innerPromise: Promise<IProcess>;
	/**
	 * Execute a server-side process. Awaiting on {@link Process} will return
	 * {@link IProcess}. Wrapper for
	 * [cockpit.spawn](https://cockpit-project.org/guide/latest/cockpit-spawn)
	 * 
	 * @example
	 * try {
	 * 	const hostname = await new Process(['hostname']).output;
	 * } catch (error) {
	 * 	console.error(error);
	 * }
	 * // or with noThrow modifier:
	 * const proc = new Process(['hostname']).noThrow;
	 * const hostname = await proc.output;
	 * if (await proc.exitCode !== 0)
	 * 	console.error(Process.errorMessage(proc));
	 * 
	 * @param argv - Argument vector to execute
	 * @param spawnOpts - Options for process spawning
	 */
	constructor(argv: string[], spawnOpts: Omit<cockpit.Spawn.Options, 'binary'>);
	constructor(other: Process);
	constructor(argvOrOther: string[] | Process, spawnOpts: Omit<cockpit.Spawn.Options, 'binary'> = {}) {
		if (argvOrOther instanceof Process) {
			const other = argvOrOther;
			this.spawnProc = other.spawnProc;
			this.innerPromise = other.innerPromise;
		} else {
			const argv = argvOrOther;
			spawnOpts.err ??= 'message';
			spawnOpts.superuser ??= 'try';
			const spawnProc = cockpit.spawn(argv, { ...spawnOpts, binary: true });
			this.spawnProc = spawnProc;
			this.innerPromise = new Promise((resolve, reject) => {
				spawnProc.then((stdout, stderr) => {
					resolve({
						exitCode: 0,
						stdout,
						stderr: stderr ?? new Uint8Array([]),
						argv: [...argv],
					});
				});
				spawnProc.catch((exception, stdout) => {
					reject({
						exitCode: exception.exit_status ?? 1,
						stdout: stdout ?? new Uint8Array([]),
						stderr: utf8Encoder.encode(exception.message) ?? new Uint8Array([]),
						argv: [...argv],
					});
				});
			});
		}
	}
	then<TResult1 = any, TResult2 = never>(onfulfilled?: ((value: IProcess) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: IProcess) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
		return this.innerPromise
			.catch((proc: IProcess) => {
				throw new ProcessError(Process.errorMessage(proc));
			})
			.then(onfulfilled, onrejected);
	}
	/**
	 * Always resolve even when process exits with code other than `0`.
	 */
	get noThrow() {
		const proc = new Process(this);
		proc.innerPromise = proc.innerPromise.catch(proc => proc);
		return proc;
	}
	/**
	 * Exit code of process. Resolves when the process exits.
	 */
	get exitCode() {
		return this.then(({ exitCode }) => exitCode);
	}
	/**
	 * Standard output of process. Resolves when the process exits.
	 */
	get stdout() {
		return this.then(({ stdout }) => stdout);
	}
	/**
	 * Standard error of process. Resolves when the process exits.
	 */
	get stderr() {
		return this.then(({ stderr }) => stderr);
	}
	/**
	 * Standard output of process as a string, decoded as utf-8. Resolves when
	 * the process exits.
	 */
	get output() {
		return this.stdout.then(bin => utf8Decoder.decode(bin));
	}
	/**
	 * Standard error of process as a string, decoded as utf-8. Resolves when
	 * the process exits.
	 */
	get error() {
		return this.stderr.then(bin => utf8Decoder.decode(bin));
	}
	/**
	 * Send data to process. If string, it will be encoded as utf-8.
	 * @param data - Data to send
	 */
	sendInput(data: string | Uint8Array) {
		if (typeof data === 'string') {
			data = utf8Encoder.encode(data);
		}
		this.spawnProc.input(data, true);
	}
	/**
	 * Close communication with the process by closing STDIN and STDOUT.
	 */
	close() {
		this.spawnProc.close();
	}
	/**
	 * Set up a callback to run when the process writes to STDOUT. Doing this
	 * consumes the process's STDOUT and will result in stdout being empty when
	 * awaited for later.
	 * @param callback - Function to call on process output
	 */
	stdoutCallback(callback: (data: Uint8Array) => void) {
		this.spawnProc.stream(callback);
	}
	/**
	 * Set up a callback to run when the process writes to STDOUT, with output
	 * decoded as a string. Doing this consumes the process's STDOUT and will
	 * result in stdout being empty when awaited for later.
	 * @param callback - Function to call on process output
	 */
	outputCallback(callback: (data: string) => void) {
		this.spawnProc.stream((data: Uint8Array) => callback(utf8Decoder.decode(data)));
	}
	static errorMessage(proc: IProcess) {
		return `${proc.argv[0]} -> ${proc.exitCode}: ${utf8Decoder.decode(proc.stderr)}`;
	}
}
