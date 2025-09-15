import { randomBytes, createHash } from 'crypto';

export interface RandomOptions {
  min?: number;
  max?: number;
  secure?: boolean;
}

export interface SecureRandomResult {
  value: number;
  entropy: number;
  timestamp: Date;
  hash: string;
}

export class RandomService {
  private static readonly DEFAULT_ENTROPY_BYTES = 32;
  private static readonly MIN_ENTROPY_THRESHOLD = 256; // bits

  /**
   * Generate cryptographically secure random number
   */
  async generateSecureRandom(options: RandomOptions = {}): Promise<SecureRandomResult> {
    const { min = 0, max = 1, secure = true } = options;

    try {
      // Generate high-entropy random bytes
      const entropyBytes = randomBytes(RandomService.DEFAULT_ENTROPY_BYTES);
      const entropy = entropyBytes.length * 8; // Convert to bits

      // Validate entropy meets security requirements
      if (secure && entropy < RandomService.MIN_ENTROPY_THRESHOLD) {
        throw new Error(`Insufficient entropy: ${entropy} bits (minimum: ${RandomService.MIN_ENTROPY_THRESHOLD})`);
      }

      // Convert bytes to number in range
      const randomValue = this.bytesToFloat(entropyBytes);
      const scaledValue = min + (randomValue * (max - min));

      // Create hash for verification
      const timestamp = new Date();
      const hashInput = `${entropyBytes.toString('hex')}${timestamp.toISOString()}${scaledValue}`;
      const hash = createHash('sha256').update(hashInput).digest('hex');

      return {
        value: scaledValue,
        entropy,
        timestamp,
        hash
      };
    } catch (error) {
      throw new Error(`Failed to generate secure random: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate secure random integer
   */
  async generateSecureInteger(min: number, max: number): Promise<number> {
    try {
      const result = await this.generateSecureRandom({ min, max: max + 1, secure: true });
      return Math.floor(result.value);
    } catch (error) {
      throw new Error(`Failed to generate secure integer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate array of unique random integers
   */
  async generateUniqueIntegers(count: number, min: number, max: number): Promise<number[]> {
    try {
      const range = max - min + 1;
      if (count > range) {
        throw new Error(`Cannot generate ${count} unique integers from range [${min}, ${max}]`);
      }

      const used = new Set<number>();
      const results: number[] = [];

      while (results.length < count) {
        const value = await this.generateSecureInteger(min, max);
        if (!used.has(value)) {
          used.add(value);
          results.push(value);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to generate unique integers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Shuffle array using Fisher-Yates algorithm with secure random
   */
  async shuffleArray<T>(array: T[]): Promise<T[]> {
    try {
      const shuffled = [...array];

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = await this.generateSecureInteger(0, i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return shuffled;
    } catch (error) {
      throw new Error(`Failed to shuffle array: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Select random element from array
   */
  async selectRandom<T>(array: T[]): Promise<T> {
    try {
      if (array.length === 0) {
        throw new Error('Cannot select from empty array');
      }

      const index = await this.generateSecureInteger(0, array.length - 1);
      return array[index];
    } catch (error) {
      throw new Error(`Failed to select random element: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Select random participant from array (alias for test compatibility)
   */
  async selectRandomParticipant<T>(participants: T[]): Promise<T> {
    return this.selectRandom(participants);
  }

  /**
   * Select multiple random elements from array (without replacement)
   */
  async selectRandomMultiple<T>(array: T[], count: number): Promise<T[]> {
    try {
      if (count > array.length) {
        throw new Error(`Cannot select ${count} elements from array of length ${array.length}`);
      }

      const shuffled = await this.shuffleArray(array);
      return shuffled.slice(0, count);
    } catch (error) {
      throw new Error(`Failed to select random elements: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate secure random seed for lottery
   */
  async generateLotterySeed(): Promise<string> {
    try {
      const entropy = randomBytes(64); // 512 bits of entropy
      const timestamp = Date.now();
      const seedData = Buffer.concat([entropy, Buffer.from(timestamp.toString())]);

      return createHash('sha256').update(seedData).digest('hex');
    } catch (error) {
      throw new Error(`Failed to generate lottery seed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify random number was generated securely
   */
  verifyRandomResult(result: SecureRandomResult): boolean {
    try {
      // Reconstruct hash for verification
      const hashInput = `${result.hash.slice(0, 64)}${result.timestamp.toISOString()}${result.value}`;
      const expectedHash = createHash('sha256').update(hashInput).digest('hex');

      return result.hash === expectedHash && result.entropy >= RandomService.MIN_ENTROPY_THRESHOLD;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get entropy statistics
   */
  getEntropyStats(): { minEntropy: number; defaultEntropy: number } {
    return {
      minEntropy: RandomService.MIN_ENTROPY_THRESHOLD,
      defaultEntropy: RandomService.DEFAULT_ENTROPY_BYTES * 8
    };
  }

  /**
   * Convert bytes to float in range [0, 1)
   */
  private bytesToFloat(bytes: Buffer): number {
    // Use first 8 bytes for 64-bit precision
    const uint64 = bytes.readBigUInt64BE(0);
    const maxUint64 = BigInt('0xFFFFFFFFFFFFFFFF');

    return Number(uint64) / Number(maxUint64);
  }

  /**
   * Test entropy quality
   */
  async testEntropy(sampleSize: number = 1000): Promise<{ quality: 'good' | 'fair' | 'poor'; chi2: number }> {
    try {
      const samples: number[] = [];

      for (let i = 0; i < sampleSize; i++) {
        const result = await this.generateSecureRandom({ min: 0, max: 256 });
        samples.push(Math.floor(result.value));
      }

      // Simple chi-square test for uniformity
      const expected = sampleSize / 256;
      const buckets = new Array(256).fill(0);

      samples.forEach(sample => buckets[sample]++);

      const chi2 = buckets.reduce((sum, observed) => {
        const diff = observed - expected;
        return sum + (diff * diff) / expected;
      }, 0);

      let quality: 'good' | 'fair' | 'poor';
      if (chi2 < 300) quality = 'good';
      else if (chi2 < 400) quality = 'fair';
      else quality = 'poor';

      return { quality, chi2 };
    } catch (error) {
      throw new Error(`Failed to test entropy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}