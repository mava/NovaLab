/*
https://github.com/bdougherty/better-title-case

Copyright (c) [Brad Dougherty](https://brad.is)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const alwaysLowercase = [
	'a',
	'an',
	'and',
	'at',
	'but',
	'by',
	'for',
	'in',
	'nor',
	'of',
	'on',
	'or',
	'so',
	'the',
	'to',
	'up',
	'yet',
	'v',
	'v.',
	'vs',
	'vs.'
];

const containers = new Set(['(', '[', '{', '"', `'`, '_']);

const isEmail = /.+@.+\..+/;
const isFilePath = /^(\/[\w.]+)+/;
const isFileName = /^\w+\.\w{1,3}$/;
const hasInternalCapital = /(?![‑–—-])[a-z]+[A-Z].*/;
const hasHyphen = /[‑–—-]/g;

function isUrl(url) {
	try {
		const parsed = new URL(url);
		return Boolean(parsed.hostname);
	} catch {
		return false;
	}
}

function capitalize(string) {
	if (string.length === 0) {
		return string;
	}

	const letters = [...string];
	const firstLetter = letters.shift();

	if (containers.has(firstLetter)) {
		return `${firstLetter}${capitalize(letters)}`;
	}

	return `${firstLetter.toUpperCase()}${letters.join('')}`;
}

// export default function titleCase(
exports.titleCase = function (
	string = '',
	{ excludedWords = [], useDefaultExcludedWords = true, preserveWhitespace = false } = {}
) {
	if (string.toUpperCase() === string) {
		string = string.toLowerCase();
	}

	if (useDefaultExcludedWords) {
		excludedWords.push(...alwaysLowercase);
	}

	const words = string.trim().split(/(\s+)/);

	const capitalizedWords = words.map((word, index, array) => {
		if (/\s+/.test(word)) {
			return preserveWhitespace ? word : ' ';
		}

		if (
			isEmail.test(word) ||
			isUrl(word) ||
			isFilePath.test(word) ||
			isFileName.test(word) ||
			hasInternalCapital.test(word)
		) {
			return word;
		}

		const hyphenMatch = word.match(hasHyphen);

		if (hyphenMatch) {
			const isMultiPart = hyphenMatch.length > 1;
			const [hyphenCharacter] = hyphenMatch;

			return word
				.split(hyphenCharacter)
				.map((subWord) => {
					if (isMultiPart && excludedWords.includes(subWord.toLowerCase())) {
						return subWord;
					}

					return capitalize(subWord);
				})
				.join(hyphenCharacter);
		}

		if (word.includes('/')) {
			return word
				.split('/')
				.map((part) => capitalize(part))
				.join('/');
		}

		const isFirstWord = index === 0;
		const isLastWord = index === words.length - 1;
		const previousWord = index > 1 ? array[index - 2] : '';
		const startOfSubPhrase = index > 1 && previousWord.endsWith(':');

		if (
			!isFirstWord &&
			!isLastWord &&
			!startOfSubPhrase &&
			excludedWords.includes(word.toLowerCase())
		) {
			return word.toLowerCase();
		}

		return capitalize(word);
	});

	return capitalizedWords.join('');
}
