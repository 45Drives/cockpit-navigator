import { Problem } from "./Problem";

export interface SpawnProblem extends Problem {
	exit_status: number | null;
	exit_signal: string | null;
}

export type SpawnOptionsErr = "out" | "ignore" | "message"

export interface SpawnOptions {
	/**
	 * If set to `true` then handle the input and output of the process as
	 * arrays of binary bytes.
	 */
	binary?: boolean;
	/**
	 * The directory to spawn the process in.
	 */
	directory?: string;
	/**
	 * Controls where the standard error is sent. By default it is logged to the
	 * journal.  
	 * If set to `"out"` it is included in with the output data.  
	 * If set to `"ignore"` then the error output is discarded.  
	 * If set to `"message"`, then it will be returned as the error message.  
	 * When the {@link SpawnOptions.pty} `"pty"` field is set, this field has no effect.
	 */
	err?: "out" | "ignore" | "message";
	/**
	 * The remote host to spawn the process on. If an alternate user or port is
	 * required it can be specified as `"user@myhost:port"`. If no host is
	 * specified then the correct one will be automatically selected based on
	 * the page calling this function.
	 */
	host?: string;
	/**
	 * An optional array that contains strings to be used as additional
	 * environment variables for the new process. These are "NAME=VALUE"
	 * strings.
	 */
	environ?: string[];
	/**
	 * Launch the process in its own PTY terminal, and send/receive terminal
	 * input and output.
	 */
	pty?: boolean;
	/**
	 * Batch data coming from the process in blocks of at least this size. This
	 * is not a guarantee. After a short timeout the data will be sent even if
	 * the data doesn't match the batch size. Defaults to zero.
	 */
	batch?: number;
}

export type Spawn = () => void;
