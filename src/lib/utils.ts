import { formatDistanceToNow } from 'date-fns';

export function formatDate(date: Date | undefined): string {
  if (!date) return '';
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return '';
  }
}

export function avatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}
