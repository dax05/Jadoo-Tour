import { STORAGE_KEYS } from '../constants/storage-keys';
import { EMAIL_SERVICE_CONFIG, API_CONFIG } from '../constants/config';
import { StorageService } from './storage.service';
import { EmailApiConfig, NewsletterSubscriber, SendEmailResult } from '../types/newsletter.types';

/**
 * Newsletter & Email Dispatch Service
 * Handles user subscription, local persistence, live EmailJS / Web3Forms delivery, and welcome message generation.
 */
export class NewsletterService {
  private static instance: NewsletterService | null = null;

  public static getInstance(): NewsletterService {
    if (!NewsletterService.instance) {
      NewsletterService.instance = new NewsletterService();
    }
    return NewsletterService.instance;
  }

  /**
   * Retrieve all subscribers from localStorage
   */
  public getSubscribers(): NewsletterSubscriber[] {
    return StorageService.getItem<NewsletterSubscriber[]>(STORAGE_KEYS.NEWSLETTER_SUBSCRIBERS, []);
  }

  /**
   * Check if an email has already subscribed
   */
  public isSubscribed(email: string): boolean {
    const clean = email.trim().toLowerCase();
    return this.getSubscribers().some((s) => s.email.toLowerCase() === clean);
  }

  /**
   * Save API credentials (e.g. EmailJS or Web3Forms)
   */
  public saveApiConfig(config: EmailApiConfig): void {
    StorageService.setItem(STORAGE_KEYS.EMAIL_API_CONFIG, config);
  }

  /**
   * Get merged API credentials from localStorage and hardcoded config
   */
  public getApiConfig(): EmailApiConfig {
    const stored = StorageService.getItem<EmailApiConfig>(STORAGE_KEYS.EMAIL_API_CONFIG, {});
    let templateId = stored.emailjsTemplateId || EMAIL_SERVICE_CONFIG.EMAILJS_TEMPLATE_ID || '';
    if (templateId === 'template_sibcqgl') {
      templateId = EMAIL_SERVICE_CONFIG.EMAILJS_TEMPLATE_ID;
      this.saveApiConfig({ ...stored, emailjsTemplateId: templateId });
    }
    return {
      emailjsServiceId: stored.emailjsServiceId || EMAIL_SERVICE_CONFIG.EMAILJS_SERVICE_ID || '',
      emailjsTemplateId: templateId,
      emailjsPublicKey: stored.emailjsPublicKey || EMAIL_SERVICE_CONFIG.EMAILJS_PUBLIC_KEY || '',
      web3formsKey: stored.web3formsKey || EMAIL_SERVICE_CONFIG.WEB3FORMS_ACCESS_KEY || '',
    };
  }

  /**
   * Check if real live email credentials are fully configured
   */
  public hasActiveLiveCredentials(): boolean {
    const cfg = this.getApiConfig();
    const hasEmailJs = Boolean(cfg.emailjsServiceId && cfg.emailjsTemplateId && cfg.emailjsPublicKey);
    const hasWeb3Forms = Boolean(cfg.web3formsKey);
    return hasEmailJs || hasWeb3Forms;
  }

  /**
   * Generate grateful and poetic welcome message
   */
  public generateWelcomeMessage(recipientName: string, promoCode: string): string {
    return `Dear ${recipientName},

Welcome to the Jadoo Travel family! ✈️🌍

The world is full of magical places waiting to be explored, and we are absolutely delighted to have you join our private circle of passionate travelers.

Whether you're dreaming of gliding across Venice's tranquil canals, unraveling the eternal mysteries of Rome, or gazing out from the clifftops of Santorini, Jadoo is here to curate moments that will stay with you forever.

As our personal token of gratitude for joining our travel community, please enjoy an exclusive 15% discount on your first booking with us:

🎁 Your VIP Welcome Voucher: ${promoCode}
(Apply this code at booking checkout for 15% off standard, deluxe, and luxury travel packages)

Pack your curiosity — your next great adventure begins now!

With warmest regards,
The Jadoo Travel Concierge Team
concierge@jadoo.travel | www.jadoo.travel`;
  }

  /**
   * Subscribe an email and send the welcome greeting
   */
  public async subscribe(email: string, name?: string): Promise<SendEmailResult> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name?.trim() || cleanEmail.split('@')[0] || 'Traveler';
    const promoCode = EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE;
    const subscribers = this.getSubscribers();

    // Record or update subscriber
    const existingIndex = subscribers.findIndex((s) => s.email.toLowerCase() === cleanEmail);
    const subscriberRecord: NewsletterSubscriber = {
      email: cleanEmail,
      name: cleanName,
      subscribedAt: new Date().toISOString(),
      promoCode,
    };

    if (existingIndex >= 0) {
      subscribers[existingIndex] = subscriberRecord;
    } else {
      subscribers.push(subscriberRecord);
    }
    StorageService.setItem(STORAGE_KEYS.NEWSLETTER_SUBSCRIBERS, subscribers);

    // Sync to PostgreSQL backend if available
    fetch(`${API_CONFIG.BASE_URL}/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name: cleanName }),
    }).catch(() => {});

    const cfg = this.getApiConfig();
    const welcomeMsg = this.generateWelcomeMessage(cleanName, promoCode);

    // 1. Try EmailJS REST API if credentials exist
    if (cfg.emailjsServiceId && cfg.emailjsTemplateId && cfg.emailjsPublicKey) {
      try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: cfg.emailjsServiceId,
            template_id: cfg.emailjsTemplateId,
            user_id: cfg.emailjsPublicKey,
            template_params: {
              to_email: cleanEmail,
              email: cleanEmail,
              user_email: cleanEmail,
              recipient: cleanEmail,
              to: cleanEmail,
              reply_to: cleanEmail,
              to_name: cleanName,
              name: cleanName,
              user_name: cleanName,
              subject: 'Welcome to Jadoo — Your Journey Begins Here! 🌍✈️',
              promo_code: promoCode,
              message: welcomeMsg,
            },
          }),
        });

        if (response.ok) {
          return {
            success: true,
            provider: 'emailjs',
            message: `Official welcome email successfully dispatched to ${cleanEmail} via EmailJS!`,
          };
        } else {
          const errText = await response.text();
          console.warn('EmailJS dispatch error:', errText);
          return {
            success: false,
            provider: 'emailjs',
            message: `EmailJS Error: ${errText || 'Delivery rejected'}.`,
            error: errText,
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('Network error reaching EmailJS:', err);
        return {
          success: false,
          provider: 'emailjs',
          message: `Network error reaching EmailJS: ${msg}`,
          error: msg,
        };
      }
    }

    // 2. Try Web3Forms if configured
    if (cfg.web3formsKey) {
      try {
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: cfg.web3formsKey,
            email: cleanEmail,
            name: cleanName,
            subject: 'New Jadoo Traveler Subscription',
            message: welcomeMsg,
          }),
        });

        if (response.ok) {
          return {
            success: true,
            provider: 'web3forms',
            message: `Welcome greeting registered and dispatched via Web3Forms!`,
          };
        }
      } catch (err: unknown) {
        console.warn('Network error reaching Web3Forms:', err);
      }
    }

    // 3. Built-in instant interactive delivery preview
    return {
      success: true,
      provider: 'simulated',
      message: `Welcome to Jadoo! Your welcome gift and greeting are ready.`,
    };
  }

  /**
   * Test EmailJS connection with specified or saved credentials
   */
  public async testEmailJsConnection(
    serviceId?: string,
    templateId?: string,
    publicKey?: string,
    testEmail: string = 'test@example.com'
  ): Promise<{ success: boolean; message: string; error?: string }> {
    const cfg = this.getApiConfig();
    const sid = serviceId?.trim() || cfg.emailjsServiceId;
    const tid = templateId?.trim() || cfg.emailjsTemplateId;
    const pkey = publicKey?.trim() || cfg.emailjsPublicKey;

    if (!sid || !tid || !pkey) {
      return {
        success: false,
        message: 'Please provide Service ID, Template ID, and Public Key before testing.',
        error: 'Missing required credentials',
      };
    }

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: sid,
          template_id: tid,
          user_id: pkey,
          template_params: {
            to_email: testEmail,
            email: testEmail,
            user_email: testEmail,
            recipient: testEmail,
            to: testEmail,
            reply_to: testEmail,
            to_name: 'Explorer Test',
            name: 'Explorer Test',
            user_name: 'Explorer Test',
            subject: 'Jadoo Travel — EmailJS Live Connection Test',
            promo_code: EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE,
            message: 'Your Jadoo Travel EmailJS integration is active and verified!',
          },
        }),
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Connection verified! Test email successfully accepted by EmailJS.',
        };
      } else {
        const errText = await response.text();
        return {
          success: false,
          message: `EmailJS returned: ${errText || response.statusText}`,
          error: errText,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Network error connecting to EmailJS: ${msg}`,
        error: msg,
      };
    }
  }
}

export const newsletterService = NewsletterService.getInstance();
