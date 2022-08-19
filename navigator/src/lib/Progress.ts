export default class Progress {
	private readonly span: number;
	private value: number;
	/**
	 * Represent progress of a task with arbitrary start and end values
	 * @param start - value at 0%
	 * @param end - value at 100%
	 * @param initial - starting value
	 * @param cap - restrict value to [0%, 100%] for {@link fraction}, {@link percent}, {@link raw}, and {@link update}
	 */
	constructor(public readonly start = 0, public readonly end = 100, initial = start, private readonly cap = false) {
		this.span = this.end - this.start;
		this.value = initial;
	}
	get fraction() {
		if (this.span === 0)
			return 1;
		return (this.raw - this.start) / this.span;
	}
	get percent() {
		return this.fraction * 100;
	}
	get raw() {
		return this.cap ? Math.max(this.start, Math.min(this.value, this.end)) : this.value;
	}
	update(value: number) {
		this.value = this.cap ? Math.max(this.start, Math.min(value, this.end)) : value;
	}
	toString() {
		return `${this.percent}%`;
	}
}
