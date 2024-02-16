import bcrypt from 'bcryptjs';
import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { prisma } from '$lib/prisma';
import { convert } from '$utilities';
import type { Actions } from '@sveltejs/kit';

export const actions: Actions = {
	default: async ({ cookies, request }) => {
		// initiate user variable
		let user;

		try {
			// get password and email from request
			const { password, email } = <{ password: string; email: string }>(
				convert(await request.formData()).formData.to.Object()
			);

			// check if email doesn't exist
			try {
				user = await prisma.user.findUniqueOrThrow({
					where: { email }
				});
			} catch (error) {
				throw 'Email does not exist';
			}

			// check if username is not active
			try {
				if (!user.isActive) throw 'Email is not active';
			} catch (error) {
				throw error;
			}

			// check if password matches user hash
			try {
				if (!bcrypt.compareSync(password, user.passwordHash)) throw 'Incorrect password';
			} catch (error) {
				throw error;
			}

			// update session id cookie
			cookies.set('session_id', user.id, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: !dev,
				maxAge: 60 * 60 * 24 * 7
			});
		} catch (error) {
			return fail(401, { error });
		}
		throw redirect(303, user.isOnboarded ? '/dashboard' : '/onboard');
	}
};
