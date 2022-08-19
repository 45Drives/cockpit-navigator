import Progress from './Progress';

describe('classProgress', () => {
	describe('defaultconstructorvalues', () => {
		const prog = new Progress();
		it('startsat0', () => {
			expect(prog.start).to.equal(0);
		})
		it('endsat100', () => {
			expect(prog.end).to.equal(100);
		})
		it('initializesto0', () => {
			expect(prog.raw).to.equal(0);
		})
	})
	it('can maintain value state and report accurate percent and fractions throughout range', () => {
		function testProg(start: number, stop: number, step: number) {
			const prog = new Progress(start, stop);
			expect(prog.fraction).to.equal(0);
			expect(prog.percent).to.equal(0);
			for (let i = start; i <= stop; i += step) {
				prog.update(i);
				expect(prog.raw).to.equal(i);
				const expectedFrac = (i - start) / (stop - start);
				expect(prog.fraction).to.equal(expectedFrac);
				expect(prog.percent).to.equal(expectedFrac * 100);
			}
			expect(prog.fraction).to.equal(1);
			expect(prog.percent).to.equal(100);
		}
		testProg(0, 100, 1);
		testProg(0, 50, 1);
		testProg(0, 200, 1);
		testProg(50, 100, 2);
		testProg(3, 4, 1);
		describe('edge cases', () => {
			it('reports as finished if start === end', () => {
				function testProg(value: number) {
					const prog = new Progress(value, value);
					expect(prog.fraction).to.equal(1);
					expect(prog.percent).to.equal(100);
				}
				testProg(0);
				testProg(1);
				testProg(100);
				testProg(1/3);
			})
		})
	})
})
