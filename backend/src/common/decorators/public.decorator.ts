import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as not requiring the global JwtAuthGuard (used on register/login/refresh). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
