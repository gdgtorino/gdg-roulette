export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ParticipantRegistrationData {
  eventId: string;
  name: string;
}

export interface EventCreationData {
  name: string;
  description?: string;
  createdBy: string;
  maxParticipants?: number;
}

export interface AdminCreationData {
  username: string;
  password: string;
  email?: string;
  role?: string;
}

export class ValidationService {
  /**
   * Validate participant registration data
   */
  validateParticipantRegistration(data: ParticipantRegistrationData): ValidationResult {
    const errors: string[] = [];

    // Validate event ID
    if (!data.eventId || data.eventId.trim() === '') {
      errors.push('Event ID is required');
    } else if (!this.isValidId(data.eventId)) {
      errors.push('Invalid event ID format');
    }

    // Validate participant name
    const nameValidation = this.validateParticipantName(data.name);
    if (!nameValidation.valid) {
      errors.push(...nameValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate participant name
   */
  validateParticipantName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name || name.trim() === '') {
      errors.push('Participant name is required');
      return { valid: false, errors };
    }

    const trimmedName = name.trim();

    // Length constraints
    if (trimmedName.length < 1) {
      errors.push('Name cannot be empty');
    }

    if (trimmedName.length > 50) {
      errors.push('Name must be 50 characters or less');
    }

    // Character validation
    if (!/^[\p{L}\p{N}\s\-'.,()]+$/u.test(trimmedName)) {
      errors.push(
        'Name contains invalid characters. Only letters, numbers, spaces, and common punctuation are allowed',
      );
    }

    // Check for excessive whitespace
    if (/\s{3,}/.test(trimmedName)) {
      errors.push('Name contains excessive whitespace');
    }

    // Check for only whitespace characters
    if (/^\s+$/.test(name)) {
      errors.push('Name cannot contain only whitespace');
    }

    // Profanity check (basic)
    if (this.containsProfanity(trimmedName)) {
      errors.push('Name contains inappropriate content');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate event creation data
   */
  validateEventCreation(data: EventCreationData): ValidationResult {
    const errors: string[] = [];

    // Validate event name
    if (!data.name || data.name.trim() === '') {
      errors.push('Event name is required');
    } else if (data.name.trim().length < 3) {
      errors.push('Event name must be at least 3 characters long');
    } else if (data.name.trim().length > 100) {
      errors.push('Event name must be 100 characters or less');
    } else if (!/^[\p{L}\p{N}\s\-'.,()!?&]+$/u.test(data.name.trim())) {
      errors.push('Event name contains invalid characters');
    }

    // Validate description (optional)
    if (data.description) {
      if (data.description.length > 500) {
        errors.push('Event description must be 500 characters or less');
      }
    }

    // Validate creator ID
    if (!data.createdBy || data.createdBy.trim() === '') {
      errors.push('Event creator is required');
    } else if (!this.isValidId(data.createdBy)) {
      errors.push('Invalid creator ID format');
    }

    // Validate max participants (optional)
    if (data.maxParticipants !== undefined) {
      if (!Number.isInteger(data.maxParticipants) || data.maxParticipants < 1) {
        errors.push('Maximum participants must be a positive integer');
      } else if (data.maxParticipants > 10000) {
        errors.push('Maximum participants cannot exceed 10,000');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate admin creation data
   */
  validateAdminCreation(data: AdminCreationData): ValidationResult {
    const errors: string[] = [];

    // Validate username
    const usernameValidation = this.validateUsername(data.username);
    if (!usernameValidation.valid) {
      errors.push(...usernameValidation.errors);
    }

    // Validate password (basic validation - complex validation should use PasswordService)
    if (!data.password || data.password === '') {
      errors.push('Password is required');
    } else if (data.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Validate email (optional)
    if (data.email) {
      const emailValidation = this.validateEmail(data.email);
      if (!emailValidation.valid) {
        errors.push(...emailValidation.errors);
      }
    }

    // Validate role (optional)
    if (data.role) {
      const validRoles = ['ADMIN', 'SUPER_ADMIN', 'MODERATOR'];
      if (!validRoles.includes(data.role)) {
        errors.push(`Role must be one of: ${validRoles.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate username
   */
  validateUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (!username || username.trim() === '') {
      errors.push('Username is required');
      return { valid: false, errors };
    }

    const trimmedUsername = username.trim();

    // Length constraints
    if (trimmedUsername.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (trimmedUsername.length > 30) {
      errors.push('Username must be 30 characters or less');
    }

    // Character validation
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }

    // Must start with letter or number
    if (!/^[a-zA-Z0-9]/.test(trimmedUsername)) {
      errors.push('Username must start with a letter or number');
    }

    // Cannot end with underscore or hyphen
    if (/[_-]$/.test(trimmedUsername)) {
      errors.push('Username cannot end with underscore or hyphen');
    }

    // Check for reserved usernames
    const reservedUsernames = [
      'admin',
      'administrator',
      'root',
      'system',
      'api',
      'test',
      'demo',
      'guest',
      'user',
      'null',
      'undefined',
      'login',
      'logout',
      'register',
      'signup',
    ];

    if (reservedUsernames.includes(trimmedUsername.toLowerCase())) {
      errors.push('This username is reserved and cannot be used');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate email address
   */
  validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email || email.trim() === '') {
      errors.push('Email is required');
      return { valid: false, errors };
    }

    const trimmedEmail = email.trim();

    // Length constraint
    if (trimmedEmail.length > 254) {
      errors.push('Email address is too long');
    }

    // Basic email format validation
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(trimmedEmail)) {
      errors.push('Invalid email address format');
    }

    // Check for multiple @ symbols
    if ((trimmedEmail.match(/@/g) || []).length !== 1) {
      errors.push('Email must contain exactly one @ symbol');
    }

    // Check domain part
    const parts = trimmedEmail.split('@');
    if (parts.length === 2) {
      const domain = parts[1];
      if (domain.length === 0) {
        errors.push('Email domain cannot be empty');
      } else if (domain.length > 253) {
        errors.push('Email domain is too long');
      } else if (!domain.includes('.')) {
        errors.push('Email domain must contain at least one dot');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate ID format (typically UUID or cuid)
   */
  isValidId(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // Check for UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return true;
    }

    // Check for CUID format (Prisma default)
    const cuidRegex = /^c[a-z0-9]{24}$/;
    if (cuidRegex.test(id)) {
      return true;
    }

    // Check for custom ID format (alphanumeric with hyphens/underscores, 8-50 chars)
    const customIdRegex = /^[a-zA-Z0-9_-]{8,50}$/;
    return customIdRegex.test(id);
  }

  /**
   * Sanitize text input
   */
  sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/[^\p{L}\p{N}\s\-'.,()!?&]/gu, '') // Remove special characters except allowed ones
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate and sanitize participant name
   */
  validateAndSanitizeParticipantName(name: string): {
    valid: boolean;
    sanitizedName: string;
    errors: string[];
  } {
    const sanitizedName = this.sanitizeText(name);
    const validation = this.validateParticipantName(sanitizedName);

    return {
      valid: validation.valid,
      sanitizedName,
      errors: validation.errors,
    };
  }

  /**
   * Basic profanity check
   */
  private containsProfanity(text: string): boolean {
    // Basic profanity word list - in production, use a more comprehensive service
    const profanityWords = ['spam', 'test123', 'admin123', 'dummy', 'fake'];

    const lowerText = text.toLowerCase();
    return profanityWords.some((word) => lowerText.includes(word));
  }

  /**
   * Validate URL format
   */
  validateUrl(url: string): ValidationResult {
    const errors: string[] = [];

    if (!url || url.trim() === '') {
      errors.push('URL is required');
      return { valid: false, errors };
    }

    try {
      const urlObject = new URL(url);

      // Check protocol
      if (!['http:', 'https:'].includes(urlObject.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol');
      }

      // Check for localhost in production (if needed)
      if (process.env.NODE_ENV === 'production' && urlObject.hostname === 'localhost') {
        errors.push('Localhost URLs are not allowed in production');
      }
    } catch {
      errors.push('Invalid URL format');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate phone number (basic international format)
   */
  validatePhoneNumber(phone: string): ValidationResult {
    const errors: string[] = [];

    if (!phone || phone.trim() === '') {
      errors.push('Phone number is required');
      return { valid: false, errors };
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, ''); // Remove spaces, hyphens, parentheses

    // Basic international format check
    if (!/^\+?[1-9]\d{4,14}$/.test(cleanPhone)) {
      errors.push('Invalid phone number format');
    }

    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      errors.push('Phone number must be between 7 and 15 digits');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file upload
   */
  validateFileUpload(
    file: File | null,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      required?: boolean;
    } = {},
  ): ValidationResult {
    const errors: string[] = [];
    const { maxSize = 5 * 1024 * 1024, allowedTypes = [], required = false } = options;

    if (!file) {
      if (required) {
        errors.push('File is required');
      }
      return { valid: !required, errors };
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }

    // Check for empty file
    if (file.size === 0) {
      errors.push('File cannot be empty');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate bulk operation data
   */
  validateBulkData<T>(
    items: T[],
    validator: (item: T) => ValidationResult,
    maxItems: number = 1000,
  ): {
    valid: boolean;
    validItems: T[];
    invalidItems: Array<{ item: T; errors: string[] }>;
    summary: {
      total: number;
      valid: number;
      invalid: number;
    };
  } {
    const validItems: T[] = [];
    const invalidItems: Array<{ item: T; errors: string[] }> = [];

    if (items.length > maxItems) {
      return {
        valid: false,
        validItems: [],
        invalidItems: [],
        summary: {
          total: items.length,
          valid: 0,
          invalid: items.length,
        },
      };
    }

    items.forEach((item) => {
      const validation = validator(item);
      if (validation.valid) {
        validItems.push(item);
      } else {
        invalidItems.push({ item, errors: validation.errors });
      }
    });

    return {
      valid: invalidItems.length === 0,
      validItems,
      invalidItems,
      summary: {
        total: items.length,
        valid: validItems.length,
        invalid: invalidItems.length,
      },
    };
  }
}
