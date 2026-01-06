// Gestionnaire d'installation PWA pour Universal Eats
'use client';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallationResult {
  success: boolean;
  outcome?: 'accepted' | 'dismissed';
  platform?: string;
  error?: string;
}

interface InstallPromptOptions {
  title?: string;
  description?: string;
  delay?: number;
  showDismissButton?: boolean;
  customActions?: Array<{
    text: string;
    action: () => void;
  }>;
}

export class InstallManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled: boolean = false;
  private installPromptShown: boolean = false;
  private listeners: Array<(event: string, data?: any) => void> = [];

  constructor() {
    // Do not auto-initialize to avoid running browser-only code during SSR.
    // Call `init()` explicitly from client-side code when needed.
  }

  private init(): void {
    // Vérifier si l'app est déjà installée
    this.checkIfInstalled();

    // Écouter l'événement beforeinstallprompt
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt.bind(this));
    
    // Écouter l'événement appinstalled
    window.addEventListener('appinstalled', this.handleAppInstalled.bind(this));

    // Écouter les changements de display mode
    if ('matchMedia' in window) {
      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      mediaQuery.addEventListener('change', (e) => {
        if (e.matches) {
          this.handleAppInstalled();
        }
      });
    }
  }

  private handleBeforeInstallPrompt(event: Event): void {
    event.preventDefault();
    this.deferredPrompt = event as BeforeInstallPromptEvent;
    
    this.emit('installpromptavailable', {
      platforms: this.deferredPrompt.platforms,
      canInstall: true
    });

    // Auto-show prompt après un délai si pas déjà installé
    setTimeout(() => {
      if (!this.isInstalled && !this.installPromptShown) {
        this.showInstallPrompt();
      }
    }, 5000);
  }

  private handleAppInstalled(): void {
    this.isInstalled = true;
    this.deferredPrompt = null;
    this.installPromptShown = false;
    
    this.emit('appinstalled', {
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });

    // Analytique d'installation
    this.trackInstallation('success');
  }

  private checkIfInstalled(): void {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    this.isInstalled = isStandalone || isInWebAppiOS;

    if (this.isInstalled) {
      this.emit('alreadyinstalled', {
        isStandalone,
        isInWebAppiOS
      });
    }
  }

  // Demander l'installation
  async requestInstallation(): Promise<InstallationResult> {
    if (!this.deferredPrompt) {
      return {
        success: false,
        error: 'Le prompt d\'installation n\'est pas disponible. L\'app est peut-être déjà installée ou le navigateur ne supporte pas l\'installation.'
      };
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome, platform } = await this.deferredPrompt.userChoice;
      
      this.installPromptShown = true;

      if (outcome === 'accepted') {
        this.emit('installaccepted', { platform });
        this.trackInstallation('accepted', platform);
        
        return {
          success: true,
          outcome,
          platform
        };
      } else {
        this.emit('installdismissed', { platform });
        this.trackInstallation('dismissed', platform);
        
        return {
          success: false,
          outcome,
          platform
        };
      }
    } catch (error) {
      console.error('Erreur lors de l\u0027installation:', error);
      this.trackInstallation('error', undefined, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de l\'installation'
      };
    } finally {
      this.deferredPrompt = null;
    }
  }

  // Afficher le prompt d'installation manuel
  showInstallPrompt(options: InstallPromptOptions = {}): boolean {
    if (this.isInstalled || this.installPromptShown || !this.deferredPrompt) {
      return false;
    }

    const {
      title = 'Installez Universal Eats',
      description = 'Installez l\'app pour une expérience native et un accès hors ligne',
      delay = 0,
      showDismissButton = true,
      customActions = []
    } = options;

    this.installPromptShown = true;

    // Créer le modal d'installation
    const modal = this.createInstallModal({
      title,
      description,
      showDismissButton,
      customActions
    });

    // Ajouter au DOM après le délai
    setTimeout(() => {
      document.body.appendChild(modal);
      
      // Animation d'entrée
      requestAnimationFrame(() => {
        modal.classList.add('show');
      });
    }, delay);

    this.emit('installpromptshown', {
      delay,
      timestamp: Date.now()
    });

    return true;
  }

  private createInstallModal(options: {
    title: string;
    description: string;
    showDismissButton: boolean;
    customActions: Array<{ text: string; action: () => void }>;
  }): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'install-prompt-modal';
    modal.innerHTML = `
      <div class="install-prompt-backdrop">
        <div class="install-prompt-container">
          <div class="install-prompt-header">
            <div class="install-prompt-icon">📱</div>
            <h3 class="install-prompt-title">${options.title}</h3>
          </div>
          <p class="install-prompt-description">${options.description}</p>
          
          <div class="install-prompt-features">
            <div class="feature-item">
              <span class="feature-icon">⚡</span>
              <span>Accès rapide depuis l'écran d'accueil</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📶</span>
              <span>Fonctionne hors ligne</span>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔔</span>
              <span>Notifications push en temps réel</span>
            </div>
          </div>

          <div class="install-prompt-actions">
            <button class="install-prompt-btn install-btn" id="install-btn">
              <span class="btn-icon">⬇️</span>
              Installer l'application
            </button>
            ${options.showDismissButton ? '<button class="install-prompt-btn dismiss-btn" id="dismiss-btn">Plus tard</button>' : ''}
          </div>

          ${options.customActions.length > 0 ? `
            <div class="custom-actions">
              ${options.customActions.map(action => 
                `<button class="custom-action-btn" onclick="(${action.action.toString()})()">${action.text}</button>`
              ).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Ajouter les styles
    this.addInstallPromptStyles();

    // Ajouter les event listeners
    const installBtn = modal.querySelector('#install-btn') as HTMLButtonElement;
    const dismissBtn = modal.querySelector('#dismiss-btn') as HTMLButtonElement;

    installBtn?.addEventListener('click', async () => {
      const result = await this.requestInstallation();
      if (result.success) {
        this.closeInstallModal(modal);
      }
    });

    dismissBtn?.addEventListener('click', () => {
      this.closeInstallModal(modal);
      this.trackInstallation('dismissed', 'manual');
    });

    // Fermer en cliquant sur l'arrière-plan
    const backdrop = modal.querySelector('.install-prompt-backdrop') as HTMLElement;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.closeInstallModal(modal);
        this.trackInstallation('dismissed', 'backdrop');
      }
    });

    // Fermer avec Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closeInstallModal(modal);
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    return modal;
  }

  private closeInstallModal(modal: HTMLElement): void {
    modal.classList.remove('show');
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
    
    this.emit('installpromptclosed', {
      timestamp: Date.now()
    });
  }

  private addInstallPromptStyles(): void {
    if (document.getElementById('install-prompt-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'install-prompt-styles';
    styles.textContent = `
      .install-prompt-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
      }

      .install-prompt-modal.show {
        opacity: 1;
        visibility: visible;
      }

      .install-prompt-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }

      .install-prompt-container {
        background: white;
        border-radius: 16px;
        padding: 1.5rem;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        transform: translateY(20px);
        transition: transform 0.3s ease;
      }

      .install-prompt-modal.show .install-prompt-container {
        transform: translateY(0);
      }

      .install-prompt-header {
        text-align: center;
        margin-bottom: 1rem;
      }

      .install-prompt-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }

      .install-prompt-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
      }

      .install-prompt-description {
        color: #6b7280;
        text-align: center;
        margin-bottom: 1.5rem;
        line-height: 1.5;
      }

      .install-prompt-features {
        margin-bottom: 1.5rem;
      }

      .feature-item {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
        font-size: 0.875rem;
        color: #374151;
      }

      .feature-icon {
        margin-right: 0.75rem;
        width: 20px;
        text-align: center;
      }

      .install-prompt-actions {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .install-prompt-btn {
        flex: 1;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .install-btn {
        background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
        color: white;
      }

      .install-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 16px rgba(255, 107, 53, 0.3);
      }

      .dismiss-btn {
        background: #f3f4f6;
        color: #6b7280;
      }

      .dismiss-btn:hover {
        background: #e5e7eb;
      }

      .custom-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: center;
        flex-wrap: wrap;
      }

      .custom-action-btn {
        padding: 0.5rem 1rem;
        font-size: 0.75rem;
        color: #6b7280;
        background: transparent;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: pointer;
      }

      .custom-action-btn:hover {
        background: #f9fafb;
      }

      .btn-icon {
        font-size: 1rem;
      }

      @media (max-width: 480px) {
        .install-prompt-container {
          margin: 1rem;
          padding: 1.25rem;
        }

        .install-prompt-actions {
          flex-direction: column;
        }

        .install-prompt-btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  // Système d'événements
  private emit(event: string, data?: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Erreur dans le listener d\'événement:', error);
      }
    });
  }

  public onEvent(listener: (event: string, data?: any) => void): void {
    this.listeners.push(listener);
  }

  public offEvent(listener: (event: string, data?: any) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Analytique d'installation
  private trackInstallation(
    action: 'success' | 'accepted' | 'dismissed' | 'error' | 'alreadyinstalled',
    platform?: string,
    error?: any
  ): void {
    const eventData = {
      action,
      platform: platform || 'unknown',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      ...(error && { error: error.message || String(error) })
    };

    // Envoyer à l'analytique (si configuré)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'pwa_install', eventData);
    }

    // Log pour le debug
    console.log('📊 PWA Install Event:', eventData);

    // Émettre l'événement pour l'intégration externe
    this.emit('installationtracked', eventData);
  }

  // Méthodes publiques utilitaires
  public canInstall(): boolean {
    return !this.isInstalled && !!this.deferredPrompt;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public hasShownPrompt(): boolean {
    return this.installPromptShown;
  }

  public resetPromptShown(): void {
    this.installPromptShown = false;
  }

  // Forcer l'affichage du prompt (pour les tests)
  public forceShowPrompt(options?: InstallPromptOptions): void {
    if (this.canInstall()) {
      this.showInstallPrompt(options);
    }
  }
}

// Instance singleton
export const installManager = new InstallManager();

// Fonction d'initialisation automatique
export function initInstallManager(): void {
  installManager.onEvent((event, data) => {
    console.log(`📱 PWA Install Event: ${event}`, data);
  });

  console.log('🚀 Install Manager initialisé');
}

// Hook React pour utiliser le gestionnaire d'installation
export function useInstallManager() {
  return {
    canInstall: () => installManager.canInstall(),
    isInstalled: () => installManager.isAppInstalled(),
    requestInstallation: () => installManager.requestInstallation(),
    showPrompt: (options?: InstallPromptOptions) => installManager.showInstallPrompt(options),
    onEvent: (listener: (event: string, data?: any) => void) => installManager.onEvent(listener),
    offEvent: (listener: (event: string, data?: any) => void) => installManager.offEvent(listener)
  };
}