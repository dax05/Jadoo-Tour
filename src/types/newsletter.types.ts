/**
 * Newsletter & Welcome Email Types
 */

export interface NewsletterSubscriber {
  email: string;
  name?: string;
  subscribedAt: string;
  promoCode: string;
}

export interface EmailApiConfig {
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  web3formsKey?: string;
}

export interface SendEmailPayload {
  toEmail: string;
  toName: string;
  subject: string;
  promoCode: string;
  message?: string;
}

export interface SendEmailResult {
  success: boolean;
  provider: 'emailjs' | 'web3forms' | 'simulated';
  message: string;
  error?: string;
}
