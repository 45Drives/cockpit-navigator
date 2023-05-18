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

import { NavigatorError } from './Error';
import cockpit from '@45drives/cockpit-typings';

export class ProcessError extends NavigatorError { }

export interface IProcess {
	/**
	 * Exit code of process.
	 */
	exitCode: number;
	/**
	 * Standard output of process as Uint8Array.
	 */
	stdout: Uint8Array;
	/**
	 * Standard output of process as string.
	 */
	output: string;
	/**
	 * Standard error of process as Uint8Array.
	 */
	stderr: Uint8Array;
	/**
	 * Standard error of process as string.
	 */
	error: string;
	/**
	 * Argument vector of process
	 */
	readonly argv: string[];
}

const utf8Decoder = new TextDecoder('utf-8');
const utf8Encoder = new TextEncoder();

export class Process implements PromiseLike<IProcess> {
	/**
	 * Argument vector used to spawn process
	 */
	public readonly argv: string[];
	private spawnProc: cockpit.Spawn.ProcessHandle<Uint8Array>;
	private innerPromise: Promise<IProcess>;
	protected _noThrow: boolean = false;
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
	 * const proc = new Process(['hostname']);
	 * if (await proc.noThrow.exitCode !== 0)
	 * 	console.error(Process.errorMessage(await proc.noThrow));
	 * const hostname = await proc.output;
	 * 
	 * @param argv - Argument vector to execute
	 * @param spawnOpts - Options for process spawning
	 */
	constructor(argv: string[], spawnOpts: Omit<cockpit.Spawn.Options, 'binary'>);
	/**
	 * Copy a Process object (does not re-execute, only used internally for {@link Process.noThrow})
	 * @param other Process to copy
	 */
	constructor(other: Process);
	constructor(argvOrOther: string[] | Process, spawnOpts: Omit<cockpit.Spawn.Options, 'binary'> = {}) {
		if (argvOrOther instanceof Process) {
			// copy constructor
			const other = argvOrOther;
			this.argv = other.argv;
			this.spawnProc = other.spawnProc;
			this.innerPromise = other.innerPromise;
			this._noThrow = other._noThrow;
			return this;
		}
		// regular constructor
		const argv = argvOrOther;
		this.argv = argv;
		spawnOpts.err ??= 'message';
		spawnOpts.superuser ??= 'try';
		this.spawnProc = this.getSpawnProc(argv, spawnOpts);
		this.innerPromise = new Promise<IProcess>((resolve, reject) => {
			this.spawnProc.then((stdout, stderr) => {
				resolve({
					exitCode: 0,
					stdout,
					output: utf8Decoder.decode(stdout),
					stderr: utf8Encoder.encode(stderr),
					error: stderr,
					argv: [...argv],
				});
			});
			this.spawnProc.catch((exception, stdout) => {
				reject({
					exitCode: exception.exit_status ?? 1,
					stdout: stdout,
					output: utf8Decoder.decode(stdout),
					stderr: utf8Encoder.encode(exception.message),
					error: exception.message,
					argv: [...argv],
				});
			});
		});
	}
	protected getSpawnProc(argv: string[], spawnOpts: Omit<cockpit.Spawn.Options, 'binary'> = {}) {
		return cockpit.spawn(argv, { ...spawnOpts, binary: true });
	}
	then<TResult1 = any, TResult2 = any>(onfulfilled?: ((value: IProcess) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: IProcess) => TResult2 | PromiseLike<TResult2>) | null | undefined): PromiseLike<TResult1 | TResult2> {
		return this.innerPromise
			.catch((proc: IProcess) => {
				if (this._noThrow)
					return proc;
				throw new ProcessError(Process.errorMessage(proc));
			})
			.then(onfulfilled, onrejected);
	}
	/**
	 * Always resolve even when process exits with code other than `0`.
	 */
	get noThrow() {
		const newProcess = new Process(this);
		newProcess._noThrow = true;
		return newProcess;
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

export class ScriptProcess extends Process {
	/**
	 * Execute a server-side shell script (with bash). Awaiting on {@link Process} will return
	 * {@link IProcess}. Wrapper for
	 * [cockpit.spawn](https://cockpit-project.org/guide/latest/cockpit-spawn)
	 * 
	 * @example
	 * try {
	 * 	const progs = await new ScriptProcess('ls -lH /bin').output;
	 * } catch (error) {
	 * 	console.error(error);
	 * }
	 * // or with noThrow modifier:
	 * const proc = new ScriptProcess('ls -lH /bin');
	 * if (await proc.noThrow.exitCode !== 0)
	 * 	console.error(Process.errorMessage(await proc.noThrow));
	 * const progs = await proc.output;
	 * 
	 * @param script - The script to execute
	 * @param args - Arguments for the script, i.e. $@ == args
	 * @param spawnOpts - Options for spawning script
	 */
	constructor(script: string, args: string[] = [], spawnOpts: Omit<cockpit.Spawn.Options, 'binary'>) {
		super(['bash', '-c', script, ...args], spawnOpts);
	}
}

export class PythonProcess extends Process {
	constructor(script: string, args: string[] = [], spawnOpts: Omit<cockpit.Spawn.Options, 'binary'>) {
		super(['python', '-c', script, ...args], spawnOpts);
	}
}

export class NodeProcess extends Process {
	constructor(script: string, args: string[] = [], spawnOpts: Omit<cockpit.Spawn.Options, 'binary'>) {
		super(['node', '-e', script, ...args], spawnOpts);
	}
}

export class PerlProcess extends Process {
	constructor(script: string, args: string[] = [], perlArgs: string[] = [], spawnOpts: Omit<cockpit.Spawn.Options, 'binary'>) {
		super(['perl', ...perlArgs, '-e', script, ...args], spawnOpts);
	}
}
