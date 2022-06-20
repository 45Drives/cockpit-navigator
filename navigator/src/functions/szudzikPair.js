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

/**
 * Perform isqrt on BigInt
 * 
 * @param {BigInt} s - Square
 * @returns {BigInt} - Integer square root
 */
const bigIntSqrt = (s) => {
	if (s < 0n)
		throw new Error("isqrt of negative number is not allowed");
	
	if (s < 2)
		return s;
	
	if (s <= Number.MAX_SAFE_INTEGER)
		return BigInt(Math.floor(Math.sqrt(Number(s))));
	
	let x0, x1;
	x0 = s / 2n; // initial estimate
	
	x1 = (x0 + s / x0) / 2n;
	while (x1 < x0) {
		x0 = x1;
		x1 = (x0 + s / x0) / 2n;
	}
	return x0;
}

/**
 * Generate an unsigned 32 bit hash of a string
 * 
 * @param {String} string - string to hash
 * @returns {Number} - hash of string
 */
const hashString = (string) => {
	let i = 0, digest = 0, char = 0, length = string.length;
	for (; i < length; i++) {
		char = string.charCodeAt(i);
		digest = ((digest * 31) + char) | 0;
	}
	if (digest < 0)
		digest += 2**32
	return digest;
}

/**
 * Encode two BigInt values to one unique BigInt value
 * 
 * @param {BigInt} k0 - first pair element
 * @param {BigInt} k1 - second pair element
 * @returns {BigInt} - The encoded result
 */
const szudzikPair2 = (k0, k1) =>
	k0 > k1
		? k0 ** 2n + k1
		: k1 ** 2n + k1 + k0

/**
 * Decode one unique BigInt value to its original pair
 * 
 * @param {BigInt} z - Encoded value
 * @returns {BigInt[]} - Decoded pair
 */
const szudzikUnpair2 = (z) => {
	const r = bigIntSqrt(z);
	return (z - r ** 2n) < r
		? [r, z - r ** 2n]
		: [z - r ** 2n - r, r];
}

/**
 * Encode an arbitrary number of BigInt values to one unique BigInt value
 * 
 * @param  {...BigInt|BigInt[]} args - tuple to encode
 * @returns {BigInt} - Encoded value
 */
function szudzikPair(...args) {
	let k0, k1;
	const k = [...(Array.isArray(args[0]) ? args[0] : args)].map(v => typeof v === 'string' ? BigInt(hashString(v)) : BigInt(v));
	if (k.length == 2)
		return szudzikPair2(...k);
	while (k.length >= 2) {
		k0 = k.shift();
		k1 = k[0];
		k[0] = szudzikPair2(k0, k1);
	}
	return k[0];
}

/**
 * Decode one unique BigInt value to its original tuple of length n
 * 
 * @param {BigInt} z - Encoded value
 * @param {Number} n - Size of decoded tuple
 * @returns {BigInt[]} - Decoded tuple
 */
function szudzikUnpair(z, n = 2) {
	const k = [BigInt(z)];
	for (let i = 0; i < n - 1; i++) {
		k.unshift(...szudzikUnpair2(k.shift()));
	}
	return k;
}

export {
	szudzikPair,
	szudzikUnpair,
	szudzikPair2,
	szudzikUnpair2,
	bigIntSqrt,
	hashString,
}
