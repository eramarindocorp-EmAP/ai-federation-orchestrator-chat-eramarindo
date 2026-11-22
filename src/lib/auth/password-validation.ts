export function validatePasswordChange(password: string, confirmation: string): string | null {
  if (password.length < 12) {
    return "Gunakan password baru minimal 12 karakter.";
  }

  if (password !== confirmation) {
    return "Konfirmasi password tidak sama.";
  }

  return null;
}
