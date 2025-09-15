import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
}

export interface QRCodeResult {
  success: boolean;
  data?: string;
  error?: string;
}

export class QRCodeService {
  private readonly defaultOptions: QRCodeOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
  };

  /**
   * Generate QR code as base64 data URL
   */
  async generateQRCode(data: string, options?: QRCodeOptions): Promise<string> {
    try {
      const finalOptions = { ...this.defaultOptions, ...options };

      const qrCodeDataURL = await QRCode.toDataURL(data, {
        width: finalOptions.width,
        margin: finalOptions.margin,
        color: finalOptions.color,
        errorCorrectionLevel: finalOptions.errorCorrectionLevel,
        type: finalOptions.type,
        quality: finalOptions.quality,
      });

      return qrCodeDataURL;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Generate QR code as SVG string
   */
  async generateQRCodeSVG(data: string, options?: Partial<QRCodeOptions>): Promise<string> {
    try {
      const finalOptions = { ...this.defaultOptions, ...options };

      const svgString = await QRCode.toString(data, {
        type: 'svg',
        width: finalOptions.width,
        margin: finalOptions.margin,
        color: finalOptions.color,
        errorCorrectionLevel: finalOptions.errorCorrectionLevel,
      });

      return svgString;
    } catch (error) {
      throw new Error(`Failed to generate QR code SVG: ${error}`);
    }
  }

  /**
   * Generate QR code as buffer
   */
  async generateQRCodeBuffer(data: string, options?: QRCodeOptions): Promise<Buffer> {
    try {
      const finalOptions = { ...this.defaultOptions, ...options };

      const buffer = await QRCode.toBuffer(data, {
        width: finalOptions.width,
        margin: finalOptions.margin,
        color: finalOptions.color,
        errorCorrectionLevel: finalOptions.errorCorrectionLevel,
        type: 'png',
      });

      return buffer;
    } catch (error) {
      throw new Error(`Failed to generate QR code buffer: ${error}`);
    }
  }

  /**
   * Generate event registration QR code
   */
  async generateEventQRCode(eventId: string, baseUrl?: string): Promise<string> {
    try {
      const registrationUrl = `${baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/register/${eventId}`;

      return await this.generateQRCode(registrationUrl, {
        width: 400,
        margin: 3,
        errorCorrectionLevel: 'H', // High error correction for public use
        color: {
          dark: '#1a1a1a',
          light: '#ffffff',
        },
      });
    } catch (error) {
      throw new Error(`Failed to generate event QR code: ${error}`);
    }
  }

  /**
   * Generate QR code with custom styling for branding
   */
  async generateBrandedQRCode(
    data: string,
    branding?: {
      primaryColor?: string;
      backgroundColor?: string;
      size?: number;
      logo?: string;
    },
  ): Promise<string> {
    try {
      const options: QRCodeOptions = {
        width: branding?.size || 350,
        margin: 3,
        errorCorrectionLevel: 'H',
        color: {
          dark: branding?.primaryColor || '#2563eb',
          light: branding?.backgroundColor || '#ffffff',
        },
      };

      const qrCodeDataURL = await this.generateQRCode(data, options);

      // If logo is provided, we would need additional image processing
      // For now, return the basic QR code
      return qrCodeDataURL;
    } catch (error) {
      throw new Error(`Failed to generate branded QR code: ${error}`);
    }
  }

  /**
   * Generate multiple QR codes in batch
   */
  async generateBatchQRCodes(
    dataArray: string[],
    options?: QRCodeOptions,
  ): Promise<Array<{ data: string; qrCode: string; error?: string }>> {
    const results: Array<{ data: string; qrCode: string; error?: string }> = [];

    for (const data of dataArray) {
      try {
        const qrCode = await this.generateQRCode(data, options);
        results.push({ data, qrCode });
      } catch (error) {
        results.push({
          data,
          qrCode: '',
          error: `Failed to generate QR code: ${error}`,
        });
      }
    }

    return results;
  }

  /**
   * Validate data before QR code generation
   */
  validateData(data: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || data.trim() === '') {
      errors.push('Data cannot be empty');
    }

    if (data.length > 2953) {
      // Maximum capacity for QR code with error correction level L
      errors.push('Data too long for QR code generation');
    }

    // Check for potentially problematic characters
    try {
      encodeURIComponent(data);
    } catch (error) {
      errors.push('Data contains invalid characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate QR code with validation
   */
  async generateValidatedQRCode(data: string, options?: QRCodeOptions): Promise<QRCodeResult> {
    try {
      const validation = this.validateData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
        };
      }

      const qrCode = await this.generateQRCode(data, options);
      return {
        success: true,
        data: qrCode,
      };
    } catch (error) {
      return {
        success: false,
        error: `QR code generation failed: ${error}`,
      };
    }
  }

  /**
   * Get QR code information
   */
  getQRCodeInfo(
    data: string,
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M',
  ): {
    estimatedSize: number;
    recommendedMinSize: number;
    maxCapacity: number;
    errorCorrectionLevel: string;
  } {
    // Estimated sizes based on QR code specifications
    const capacities = {
      L: 2953, // Low
      M: 2331, // Medium
      Q: 1663, // Quartile
      H: 1273, // High
    };

    const recommendedMinSizes = {
      L: 200,
      M: 250,
      Q: 300,
      H: 350,
    };

    return {
      estimatedSize: Math.ceil(data.length * 1.1), // Rough estimate
      recommendedMinSize: recommendedMinSizes[errorCorrectionLevel],
      maxCapacity: capacities[errorCorrectionLevel],
      errorCorrectionLevel: this.getErrorCorrectionDescription(errorCorrectionLevel),
    };
  }

  /**
   * Get error correction level description
   */
  private getErrorCorrectionDescription(level: 'L' | 'M' | 'Q' | 'H'): string {
    const descriptions = {
      L: 'Low (~7% recovery)',
      M: 'Medium (~15% recovery)',
      Q: 'Quartile (~25% recovery)',
      H: 'High (~30% recovery)',
    };
    return descriptions[level];
  }

  /**
   * Create QR code with custom format for specific use cases
   */
  async generateContactQRCode(contactInfo: {
    name?: string;
    phone?: string;
    email?: string;
    organization?: string;
    url?: string;
  }): Promise<string> {
    try {
      // Create vCard format
      const vCard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        contactInfo.name ? `FN:${contactInfo.name}` : '',
        contactInfo.organization ? `ORG:${contactInfo.organization}` : '',
        contactInfo.phone ? `TEL:${contactInfo.phone}` : '',
        contactInfo.email ? `EMAIL:${contactInfo.email}` : '',
        contactInfo.url ? `URL:${contactInfo.url}` : '',
        'END:VCARD',
      ]
        .filter((line) => line !== '')
        .join('\n');

      return await this.generateQRCode(vCard, {
        errorCorrectionLevel: 'M',
        width: 300,
      });
    } catch (error) {
      throw new Error(`Failed to generate contact QR code: ${error}`);
    }
  }

  /**
   * Generate WiFi QR code
   */
  async generateWiFiQRCode(wifiInfo: {
    ssid: string;
    password?: string;
    security?: 'WPA' | 'WEP' | 'nopass';
    hidden?: boolean;
  }): Promise<string> {
    try {
      const security = wifiInfo.security || 'WPA';
      const hidden = wifiInfo.hidden ? 'true' : 'false';

      const wifiString = `WIFI:T:${security};S:${wifiInfo.ssid};P:${wifiInfo.password || ''};H:${hidden};;`;

      return await this.generateQRCode(wifiString, {
        errorCorrectionLevel: 'M',
        width: 300,
      });
    } catch (error) {
      throw new Error(`Failed to generate WiFi QR code: ${error}`);
    }
  }
}
