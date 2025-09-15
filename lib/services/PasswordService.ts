import bcrypt from 'bcryptjs';

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
}

export class PasswordService {
  private readonly saltRounds = 12;

  /**
   * Hash a password using bcrypt
   */
  async hash(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      return hashedPassword;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error}`);
    }
  }

  /**
   * Verify a password against a hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      return isValid;
    } catch (error) {
      throw new Error(`Password verification failed: ${error}`);
    }
  }

  /**
   * Validate password complexity requirements
   */
  validateComplexity(password: string): PasswordValidation {
    const errors: string[] = [];

    // Minimum length of 8 characters
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Maximum length of 128 characters
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters');
    }

    // Must contain at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Must contain at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Must contain at least one number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Must contain at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common weak passwords
    const weakPasswords = [
      'password',
      '12345678',
      'qwerty123',
      'admin123',
      'password123',
      'welcome123',
      'letmein123',
    ];

    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable');
    }

    // Check for sequential characters
    if (this.hasSequentialCharacters(password)) {
      errors.push('Password should not contain obvious sequential characters');
    }

    // Check for repeated characters
    if (this.hasRepeatedCharacters(password)) {
      errors.push('Password should not contain too many repeated characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allCharacters = uppercase + lowercase + numbers + symbols;
    let password = '';

    // Ensure at least one character from each category
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(symbols);

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(allCharacters);
    }

    // Shuffle the password to avoid predictable patterns
    return this.shuffleString(password);
  }

  /**
   * Check if password has sequential characters (like "123" or "abc")
   */
  private hasSequentialCharacters(password: string): boolean {
    const sequences = [
      '0123456789',
      'abcdefghijklmnopqrstuvwxyz',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        const reverseSubseq = subseq.split('').reverse().join('');

        if (
          password.toLowerCase().includes(subseq) ||
          password.toLowerCase().includes(reverseSubseq)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if password has too many repeated characters
   */
  private hasRepeatedCharacters(password: string): boolean {
    const charCount = new Map<string, number>();

    for (const char of password) {
      charCount.set(char, (charCount.get(char) || 0) + 1);
    }

    // Check if any character appears more than 3 times
    const counts = Array.from(charCount.values());
    for (const count of counts) {
      if (count > 3) {
        return true;
      }
    }

    // Check for consecutive repeated characters (like "aaa")
    for (let i = 0; i < password.length - 2; i++) {
      if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get a random character from a string
   */
  private getRandomChar(str: string): string {
    return str.charAt(Math.floor(Math.random() * str.length));
  }

  /**
   * Shuffle a string randomly
   */
  private shuffleString(str: string): string {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }

  /**
   * Estimate password strength (0-4 scale)
   */
  estimateStrength(password: string): {
    score: number;
    feedback: string[];
    strengthText: string;
  } {
    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 0.5;
    if (/[A-Z]/.test(password)) score += 0.5;
    if (/\d/.test(password)) score += 0.5;
    if (/[^a-zA-Z\d]/.test(password)) score += 0.5;

    // Penalize common patterns
    const validation = this.validateComplexity(password);
    if (!validation.valid) {
      score = Math.max(0, score - 1);
      feedback.push(...validation.errors);
    }

    // Determine strength text
    let strengthText: string;
    if (score <= 1) strengthText = 'Very Weak';
    else if (score <= 2) strengthText = 'Weak';
    else if (score <= 3) strengthText = 'Moderate';
    else if (score <= 4) strengthText = 'Strong';
    else strengthText = 'Very Strong';

    return {
      score: Math.min(4, Math.max(0, score)),
      feedback,
      strengthText,
    };
  }
}
