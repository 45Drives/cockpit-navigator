
export class NavigatorError extends Error {
	constructor(message: string, cause?: Error) {
		super(message, { cause });
		this.cause = cause;
		this.name = this.constructor.name;
	}
}

export class SourceError extends NavigatorError { }

export class SourceAdapterError extends NavigatorError {}
