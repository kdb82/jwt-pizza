import { User } from '../service/pizzaService';

export function userInitials(user: User | null) {
  const names = user?.name?.split(' ') || ['?'];
  return names.length > 1 ? names[0].charAt(0) + names[names.length - 1].charAt(0) : names[0].charAt(0);
}
