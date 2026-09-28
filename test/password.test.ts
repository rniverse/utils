import { describe, expect, test } from 'bun:test';
import { PASSWORD_DEFAULTS } from '@enum/password.enum';
import { Password, password } from '@utils/password';

// Cheap settings keep the suite fast; the default instance is exercised once.
const cheap = new Password({ memoryCost: 1_024, timeCost: 1, parallelism: 1 });

describe('password', () => {
	test('default instance: hash then verify', async () => {
		const digest = await password.hash('hunter2');
		expect(digest.startsWith('$argon2id$')).toBe(true);
		expect(digest).toContain(`m=${PASSWORD_DEFAULTS.memoryCost},`);
		expect(digest).toContain(`t=${PASSWORD_DEFAULTS.timeCost}`);
		expect(digest).toContain(`p=${PASSWORD_DEFAULTS.parallelism}`);
		expect(await password.verify('hunter2', digest)).toBe(true);
		expect(await password.verify('wrong', digest)).toBe(false);
	});

	test('a custom instance hashes with its own settings', async () => {
		const digest = await cheap.hash('pw');
		expect(digest).toContain('m=1024,p=1,t=1');
	});

	test('the algorithm can be changed', async () => {
		const digest = await new Password({
			type: 'argon2i',
			memoryCost: 1_024,
			timeCost: 1,
			parallelism: 1,
		}).hash('pw');
		expect(digest.startsWith('$argon2i$')).toBe(true);
	});

	test('verify works across instances — settings live in the digest', async () => {
		const digest = await cheap.hash('pw');
		expect(await password.verify('pw', digest)).toBe(true);
	});

	test('methods survive destructuring', async () => {
		const { hash, verify } = cheap;
		expect(await verify('pw', await hash('pw'))).toBe(true);
	});
});
