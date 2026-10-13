export function passwordError(password: string, confirmation: string, current?: string) {
  if (password !== confirmation) return 'Your passwords do not match.';
  if (current && password === current) return 'Choose a password different from your current password.';
  if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) return 'Use 8 or more characters with an uppercase letter, a lowercase letter, a number, and a special character.';
  return '';
}
