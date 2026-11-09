export const match = (value: string): value is 'pattern' | 'practice' =>
  value === 'pattern' || value === 'practice';
