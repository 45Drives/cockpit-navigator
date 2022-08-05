export type ProblemCode =
	'access-denied' |
	'authentication-failed' |
	'internal-error' |
	'no-cockpit' |
	'no-session' |
	'not-found' |
	'terminated' |
	'timeout' |
	'unknown-hostkey' |
	'no-forwarding';

export interface Problem {
	message: string;
	problem: ProblemCode | null;
}
