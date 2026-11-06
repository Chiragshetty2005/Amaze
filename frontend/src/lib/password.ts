export interface PasswordCheck {
  label: string
  passed: boolean
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong'
  checks: PasswordCheck[]
}

export function getPasswordStrength(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'One uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'One number', passed: /\d/.test(password) },
    { label: 'One symbol', passed: /[^A-Za-z0-9]/.test(password) },
  ]

  if (password.length === 0) {
    return { score: 0, label: 'Too short', checks }
  }

  const passed = checks.filter((check) => check.passed).length
  let score: PasswordStrength['score'] = 1
  if (passed >= 5 && password.length >= 10) score = 4
  else if (passed >= 4 && password.length >= 8) score = 3
  else if (passed >= 3) score = 2
  else score = 1

  const labels: Record<PasswordStrength['score'], PasswordStrength['label']> = {
    0: 'Too short',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  }

  return { score, label: labels[score], checks }
}
