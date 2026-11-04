export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  return at <= 0 ? '***' : `${email[0]}***${email.slice(at)}`
}
