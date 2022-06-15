import {
	szudzikPair,
	szudzikUnpair,
	szudzikPair2,
	szudzikUnpair2,
	bigIntSqrt,
	hashString,
} from "./szudzikPair";

describe('Szudzik Pairing', () => {
	describe('Internal functions', () => {
		describe('bigIntSqrt', () => {
			it('can accurately calculate a small square root', () => {
				expect(bigIntSqrt(25n)).toBe(5n);
				expect(bigIntSqrt(100n)).toBe(10n);
				expect(bigIntSqrt(16n)).toBe(4n);
			});

			it('can match Math.floor(Math.sqrt())', () => {
				const inputs = [...Array(1000).keys()];
				for (const input of inputs) {
					expect(bigIntSqrt(BigInt(input)) == Math.floor(Math.sqrt(input))).toBe(true);
				}
			});

			it('can calculate very large square roots', () => {
				const inputs = [...Array(1000).keys()].map(BigInt).map(x => x + BigInt(Number.MAX_SAFE_INTEGER.toString(10)));
				for (const input of inputs) {
					const s = input ** 2n;
					expect(bigIntSqrt(s)).toBe(input);
				}
			})
		});

		describe('hashString', () => {
			it('can generate positive unique hashes for host names', () => {
				const hosts = [
					'localhost',
					'osd1',
					'osd2',
					'osd3',
					'fsgw1',
					'fsgw2',
					'fsgw3',
					'ubuntu',
					'rocky',
					'server',
					'storinator',
					'bartholomew',
				];
				const hashes = hosts.map(host => hashString(host));
				expect((new Set(hashes)).size).toEqual(hosts.length);
				expect(hashes.every(h => h >= 0)).toEqual(true);
			});
		});

		describe('szudzikPair2', () => {
			it('can generate an encoding from two numbers', () => {
				expect(szudzikPair2(1n, 2n)).toBe(7n);
				expect(szudzikPair2(2n, 1n)).toBe(5n);
				expect(szudzikPair2(10n, 25n)).toBe(660n);
			});

			it('can generate an encoding from two > MAX_SAFE_INT numbers', () => {
				expect(szudzikPair2(BigInt(Number.MAX_SAFE_INTEGER) + 5n, BigInt(Number.MAX_SAFE_INTEGER) + 10n)).toBe(81129638414606861839774099963998n);
			});
		});

		describe('szudzikUnpair2', () => {
			it('can decode into the original pair', () => {
				expect(szudzikUnpair2(7n)).toEqual([1n, 2n]);
				expect(szudzikUnpair2(5n)).toEqual([2n, 1n]);
				expect(szudzikUnpair2(660n)).toEqual([10n, 25n]);
			});

			it('can decode into the original pair for > MAX_SAFE_INT', () => {
				expect(szudzikUnpair2(81129638414606861839774099963998n)).toEqual([BigInt(Number.MAX_SAFE_INTEGER) + 5n, BigInt(Number.MAX_SAFE_INTEGER) + 10n]);
			});
		});
	});

	describe('API', () => {
		describe('szudzikPair', () => {
			it('can generate an encoding from two numbers', () => {
				expect(szudzikPair(1n, 2n)).toBe(7n);
				expect(szudzikPair(2n, 1n)).toBe(5n);
				expect(szudzikPair(10n, 25n)).toBe(660n);
			});

			it('can generate an encoding from two > MAX_SAFE_INT numbers', () => {
				expect(szudzikPair(BigInt(Number.MAX_SAFE_INTEGER) + 5n, BigInt(Number.MAX_SAFE_INTEGER) + 10n)).toBe(81129638414606861839774099963998n);
			});
		});

		describe('szudzikUnpair', () => {
			it('can decode into the original pair', () => {
				expect(szudzikUnpair(7n, 2)).toEqual([1n, 2n]);
				expect(szudzikUnpair(5n, 2)).toEqual([2n, 1n]);
				expect(szudzikUnpair(660n, 2)).toEqual([10n, 25n]);
			});

			it('can decode into the original pair for > MAX_SAFE_INT', () => {
				expect(szudzikUnpair(81129638414606861839774099963998n, 2)).toEqual([BigInt(Number.MAX_SAFE_INTEGER) + 5n, BigInt(Number.MAX_SAFE_INTEGER) + 10n]);
			});
		});

		describe('works with n > 2 (n = 4, 20^4 tuples)', () => {
			const i = [...Array(20).keys()].map(BigInt);
			const j = [...i];
			const k = [...i];
			const l = [...i];
			const tuples = [];
			for (let i0 of i) {
				for (let j0 of j) {
					for (let k0 of k) {
						for (let l0 of l) {
							tuples.push([l0, k0, j0, i0]);
						}
					}
				}
			}
			const encodings = tuples.map(szudzikPair);

			describe('has no collisions', () => {
				expect((new Set(encodings)).size).toEqual(encodings.length);
			});

			describe('can be decoded', () => {
				const decodings = encodings.map(e => szudzikUnpair(e, 4));
				expect(decodings).toEqual(tuples);
			});
		});

		describe('works with array or nargs', () => {
			const input = [1n, 2n, 3n, 4n];
			expect(szudzikPair(input)).toEqual(szudzikPair(...input));
		});
	})
});
