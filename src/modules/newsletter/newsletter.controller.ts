import { newsletterService, NewsletterService } from '../../services/newsletter.service';
import { AuthService } from '../../services/auth.service';
import { EMAIL_SERVICE_CONFIG } from '../../constants/config';

/**
 * Newsletter Form & Welcome Email Modal Controller
 * Orchestrates subscription input, loading indicators, live dispatch, and interactive email modal.
 */
export class NewsletterController {
  private newsletterService: NewsletterService;
  private authService: AuthService;

  // Form Elements
  private form: HTMLFormElement | null = null;
  private inputEmail: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private statusText: HTMLElement | null = null;

  // Modal Elements
  private modal: HTMLElement | null = null;
  private modalRecipientEmail: HTMLElement | null = null;
  private modalRecipientName: HTMLElement | null = null;
  private modalPromoCode: HTMLElement | null = null;
  private modalCopyBtn: HTMLButtonElement | null = null;
  private modalExploreCta: HTMLButtonElement | null = null;
  private modalApiStatusBadge: HTMLElement | null = null;

  // Alert Elements inside Modal
  private deliveryAlert: HTMLElement | null = null;
  private alertTitle: HTMLElement | null = null;
  private alertMsg: HTMLElement | null = null;

  // API Config Elements inside Modal
  private toggleApiBtn: HTMLButtonElement | null = null;
  private apiPanel: HTMLElement | null = null;
  private inputServiceId: HTMLInputElement | null = null;
  private inputTemplateId: HTMLInputElement | null = null;
  private inputPublicKey: HTMLInputElement | null = null;
  private inputWeb3FormsKey: HTMLInputElement | null = null;
  private saveApiBtn: HTMLButtonElement | null = null;
  private testApiBtn: HTMLButtonElement | null = null;
  private apiTestStatus: HTMLElement | null = null;

  constructor() {
    this.newsletterService = newsletterService;
    this.authService = AuthService.getInstance();

    this.initElements();
    this.bindEvents();
    this.populateApiSettings();
  }

  private initElements(): void {
    // Subscription form
    this.form = document.getElementById('newsletter-form') as HTMLFormElement | null;
    this.inputEmail = document.getElementById('newsletter-email') as HTMLInputElement | null;
    this.submitBtn = document.getElementById('newsletter-btn') as HTMLButtonElement | null;
    this.statusText = document.getElementById('newsletter-status');

    // Welcome email dialog modal
    this.modal = document.getElementById('welcome-email-modal');
    this.modalRecipientEmail = document.getElementById('welcome-recipient-email');
    this.modalRecipientName = document.getElementById('welcome-recipient-name');
    this.modalPromoCode = document.getElementById('welcome-promo-code');
    this.modalCopyBtn = document.getElementById('btn-copy-promo') as HTMLButtonElement | null;
    this.modalExploreCta = document.getElementById('btn-welcome-explore') as HTMLButtonElement | null;
    this.modalApiStatusBadge = document.getElementById('welcome-api-badge');

    // Alert banner
    this.deliveryAlert = document.getElementById('welcome-delivery-alert');
    this.alertTitle = document.getElementById('welcome-alert-title');
    this.alertMsg = document.getElementById('welcome-alert-msg');

    // API settings panel
    this.toggleApiBtn = document.getElementById('btn-toggle-email-api') as HTMLButtonElement | null;
    this.apiPanel = document.getElementById('email-api-config-panel');
    this.inputServiceId = document.getElementById('api-emailjs-service') as HTMLInputElement | null;
    this.inputTemplateId = document.getElementById('api-emailjs-template') as HTMLInputElement | null;
    this.inputPublicKey = document.getElementById('api-emailjs-public') as HTMLInputElement | null;
    this.inputWeb3FormsKey = document.getElementById('api-web3forms-key') as HTMLInputElement | null;
    this.saveApiBtn = document.getElementById('btn-save-email-api') as HTMLButtonElement | null;
    this.testApiBtn = document.getElementById('btn-test-email-api') as HTMLButtonElement | null;
    this.apiTestStatus = document.getElementById('api-test-status');
  }

  private bindEvents(): void {
    // 1. Handle Newsletter Submit
    this.form?.addEventListener('submit', async (e: Event) => {
      e.preventDefault();
      await this.handleSubscribe();
    });

    // 2. Close Modal Triggers
    this.modal?.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target === this.modal || target.closest('[data-close-welcome-modal]')) {
        this.closeModal();
      }
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.modal?.style.display === 'flex') {
        this.closeModal();
      }
    });

    // 3. Copy Promo Code Button
    this.modalCopyBtn?.addEventListener('click', () => {
      const code = this.modalPromoCode?.textContent?.trim() || EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE;
      navigator.clipboard.writeText(code).then(() => {
        if (this.modalCopyBtn) {
          const original = this.modalCopyBtn.innerHTML;
          this.modalCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
          this.modalCopyBtn.classList.add('copied');
          setTimeout(() => {
            if (this.modalCopyBtn) {
              this.modalCopyBtn.innerHTML = original;
              this.modalCopyBtn.classList.remove('copied');
            }
          }, 2000);
        }
      });
    });

    // 4. Modal Explore CTA
    this.modalExploreCta?.addEventListener('click', () => {
      this.closeModal();
      const destSection = document.getElementById('destinations');
      destSection?.scrollIntoView({ behavior: 'smooth' });
    });

    // 5. Toggle API Settings Accordion
    this.toggleApiBtn?.addEventListener('click', () => {
      if (!this.apiPanel) return;
      const isVisible = this.apiPanel.style.display === 'block';
      this.apiPanel.style.display = isVisible ? 'none' : 'block';
      if (this.toggleApiBtn) {
        this.toggleApiBtn.innerHTML = isVisible
          ? '<i class="fa-solid fa-sliders"></i> <span>Connect Real Inbox API (EmailJS / Web3Forms)</span> <i class="fa-solid fa-chevron-down"></i>'
          : '<i class="fa-solid fa-sliders"></i> <span>Hide API Settings</span> <i class="fa-solid fa-chevron-up"></i>';
      }
    });

    // 6. Save Custom API Settings
    this.saveApiBtn?.addEventListener('click', () => {
      this.saveApiSettings();
    });

    // 7. Test API Connection
    this.testApiBtn?.addEventListener('click', async () => {
      await this.handleTestConnection();
    });
  }

  private async handleSubscribe(): Promise<void> {
    const email = this.inputEmail?.value.trim() || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      this.showToast('Please enter a valid email address.', 'error');
      this.inputEmail?.focus();
      return;
    }

    // Determine traveler name if authenticated
    const session = this.authService.getCurrentSession();
    const travelerName = session?.name || email.split('@')[0].replace(/[._-]/g, ' ') || 'Explorer';

    // Show loading spinner
    if (this.submitBtn) {
      this.submitBtn.disabled = true;
      this.submitBtn.classList.add('is-loading');
      this.submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Sending...</span>';
    }

    try {
      const result = await this.newsletterService.subscribe(email, travelerName);

      // Reset form
      if (this.inputEmail) this.inputEmail.value = '';

      if (result.success) {
        if (this.statusText) {
          this.statusText.textContent = `🎉 Welcome to Jadoo! Real email dispatched to ${email}`;
          this.statusText.style.display = 'block';
          this.statusText.style.color = '#10b981';
          setTimeout(() => {
            if (this.statusText) this.statusText.style.display = 'none';
          }, 6000);
        }

        // Show toast
        this.showToast(`✨ Welcome to Jadoo! Real email dispatched to ${email}`, 'success');

        // Open the interactive Welcome Email modal
        this.openModal(email, travelerName, result.provider, true);
      } else {
        // Live delivery failed
        if (this.statusText) {
          this.statusText.textContent = `⚠️ Subscribed! Note: EmailJS returned an error: ${result.error || result.message}`;
          this.statusText.style.display = 'block';
          this.statusText.style.color = '#d97706';
        }

        this.showToast(`⚠️ EmailJS: ${result.error || result.message}`, 'error');

        // Open modal showing error alert & troubleshooting instructions
        this.openModal(email, travelerName, result.provider, false, result.error || result.message);
      }
    } catch (err: unknown) {
      console.error('Subscription error:', err);
      this.showToast('An error occurred during subscription. Please try again.', 'error');
    } finally {
      if (this.submitBtn) {
        this.submitBtn.disabled = false;
        this.submitBtn.classList.remove('is-loading');
        this.submitBtn.innerHTML = '<span>Subscribe</span>';
      }
    }
  }

  /**
   * Open the Welcome Email Modal
   */
  public openModal(
    email: string,
    name: string,
    provider: 'emailjs' | 'web3forms' | 'simulated',
    isLiveSuccess: boolean = true,
    errorMsg: string = ''
  ): void {
    if (!this.modal) return;

    if (this.modalRecipientEmail) {
      this.modalRecipientEmail.textContent = email;
    }
    if (this.modalRecipientName) {
      this.modalRecipientName.textContent = name;
    }
    if (this.modalPromoCode) {
      this.modalPromoCode.textContent = EMAIL_SERVICE_CONFIG.WELCOME_PROMO_CODE;
    }

    const cfg = this.newsletterService.getApiConfig();

    if (this.modalApiStatusBadge) {
      if (!isLiveSuccess) {
        this.modalApiStatusBadge.className = 'email-delivery-badge error';
        this.modalApiStatusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Live Delivery Failed: Template Not Found`;
      } else if (provider === 'emailjs') {
        this.modalApiStatusBadge.className = 'email-delivery-badge live';
        this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Delivered via EmailJS Live API';
      } else if (provider === 'web3forms') {
        this.modalApiStatusBadge.className = 'email-delivery-badge live';
        this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Delivered via Web3Forms';
      } else if (cfg.emailjsPublicKey && (!cfg.emailjsServiceId || !cfg.emailjsTemplateId)) {
        this.modalApiStatusBadge.className = 'email-delivery-badge live';
        this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-key"></i> Public Key Connected (Enter Service & Template ID below)';
      } else {
        this.modalApiStatusBadge.className = 'email-delivery-badge preview';
        this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-sparkles"></i> Delivered to Virtual Inbox';
      }
    }

    // Diagnostic Alert Banner for live errors
    if (this.deliveryAlert) {
      if (!isLiveSuccess) {
        this.deliveryAlert.style.display = 'flex';
        this.deliveryAlert.className = 'welcome-delivery-alert error-theme';
        if (this.alertTitle) {
          this.alertTitle.textContent = `EmailJS Error: ${errorMsg || 'Template Not Found'}`;
        }
        if (this.alertMsg) {
          this.alertMsg.innerHTML = `EmailJS API returned: <strong>${errorMsg || 'The template ID not found'}</strong>.<br>The template has not been saved on EmailJS servers yet. Follow the steps below to fix it:`;
        }
        // Auto-expand the API settings panel so user can update or test
        if (this.apiPanel) {
          this.apiPanel.style.display = 'block';
          if (this.toggleApiBtn) {
            this.toggleApiBtn.innerHTML = '<i class="fa-solid fa-sliders"></i> <span>Hide API Settings</span> <i class="fa-solid fa-chevron-up"></i>';
          }
        }
      } else {
        this.deliveryAlert.style.display = 'none';
      }
    }

    this.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  public closeModal(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  private populateApiSettings(): void {
    const cfg = this.newsletterService.getApiConfig();
    if (this.inputServiceId) this.inputServiceId.value = cfg.emailjsServiceId || '';
    if (this.inputTemplateId) this.inputTemplateId.value = cfg.emailjsTemplateId || '';
    if (this.inputPublicKey) this.inputPublicKey.value = cfg.emailjsPublicKey || '';
    if (this.inputWeb3FormsKey) this.inputWeb3FormsKey.value = cfg.web3formsKey || '';
  }

  private saveApiSettings(): void {
    const serviceId = this.inputServiceId?.value.trim() || '';
    const templateId = this.inputTemplateId?.value.trim() || '';
    const publicKey = this.inputPublicKey?.value.trim() || '';
    const web3formsKey = this.inputWeb3FormsKey?.value.trim() || '';

    this.newsletterService.saveApiConfig({
      emailjsServiceId: serviceId,
      emailjsTemplateId: templateId,
      emailjsPublicKey: publicKey,
      web3formsKey,
    });

    this.showToast('✅ Email API credentials saved! Live inbox delivery active.', 'success');
    if (this.modalApiStatusBadge) {
      this.modalApiStatusBadge.className = 'email-delivery-badge live';
      this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Live API Connected';
    }
  }

  /**
   * Test EmailJS connection live
   */
  private async handleTestConnection(): Promise<void> {
    const serviceId = this.inputServiceId?.value.trim() || '';
    const templateId = this.inputTemplateId?.value.trim() || '';
    const publicKey = this.inputPublicKey?.value.trim() || '';

    if (!this.testApiBtn || !this.apiTestStatus) return;

    if (!serviceId || !templateId || !publicKey) {
      this.apiTestStatus.className = 'api-test-status error';
      this.apiTestStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Missing Service, Template, or Public Key';
      return;
    }

    this.testApiBtn.disabled = true;
    this.testApiBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Testing...</span>';
    this.apiTestStatus.className = 'api-test-status testing';
    this.apiTestStatus.innerHTML = 'Connecting to EmailJS...';

    const session = this.authService.getCurrentSession();
    const testRecipient = session?.email || 'traveler@jadoo.travel';

    const testResult = await this.newsletterService.testEmailJsConnection(serviceId, templateId, publicKey, testRecipient);

    this.testApiBtn.disabled = false;
    this.testApiBtn.innerHTML = '<i class="fa-solid fa-vial-circle-check"></i> <span>Test EmailJS Connection</span>';

    if (testResult.success) {
      this.apiTestStatus.className = 'api-test-status success';
      this.apiTestStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Success! Live EmailJS dispatch verified.';
      this.showToast('✅ EmailJS connection verified! Test email dispatched.', 'success');

      // Auto-save verified settings
      this.newsletterService.saveApiConfig({
        emailjsServiceId: serviceId,
        emailjsTemplateId: templateId,
        emailjsPublicKey: publicKey,
        web3formsKey: this.inputWeb3FormsKey?.value.trim() || '',
      });

      if (this.modalApiStatusBadge) {
        this.modalApiStatusBadge.className = 'email-delivery-badge live';
        this.modalApiStatusBadge.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Delivered via EmailJS Live API';
      }
      if (this.deliveryAlert) {
        this.deliveryAlert.style.display = 'none';
      }
    } else {
      this.apiTestStatus.className = 'api-test-status error';
      this.apiTestStatus.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${testResult.error || testResult.message}`;
      this.showToast(`❌ Test failed: ${testResult.error || testResult.message}`, 'error');

      if (this.deliveryAlert) {
        this.deliveryAlert.style.display = 'flex';
        this.deliveryAlert.className = 'welcome-delivery-alert error-theme';
        if (this.alertTitle) {
          this.alertTitle.textContent = `EmailJS Error: ${testResult.error || 'Connection Failed'}`;
        }
        if (this.alertMsg) {
          this.alertMsg.innerHTML = `EmailJS returned: <strong>${testResult.error || testResult.message}</strong>.<br>Make sure the template is <strong>Saved</strong> in your EmailJS dashboard and <strong>To Email</strong> is set to <code>{{to_email}}</code>.`;
        }
      }
    }
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const existing = document.querySelector('.dest-toast');
    existing?.remove();

    const toast = document.createElement('div');
    toast.className = `dest-toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
    toast.innerHTML = `
      <i class="fa-solid ${type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
}
