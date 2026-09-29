import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * Narrows `entity` from `T | null` to `T` for the caller (via the `asserts` return type),
 * while enforcing that it exists and belongs to `userId` — the one ownership check every
 * per-user resource (account/transaction/budget/...) needs before it can be read or mutated.
 */
export function assertOwned<T extends { userId: string }>(
  entity: T | null,
  userId: string,
  resourceName = 'Resource',
): asserts entity is T {
  if (!entity) throw new NotFoundException(`${resourceName} not found`);
  if (entity.userId !== userId) {
    throw new ForbiddenException(`You do not have access to this ${resourceName.toLowerCase()}`);
  }
}
