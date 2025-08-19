/**
 * ConsentService - Human-in-the-Loop (HITL) Security Model
 * Manages user consent for sensitive operations
 */

import { BrowserWindow, dialog, ipcMain } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

export interface ConsentRequest {
  id: string;
  type: 'file_access' | 'api_call' | 'code_execution' | 'data_export' | 'system_command';
  action: string;
  description: string;
  details: {
    target?: string;
    command?: string;
    apiEndpoint?: string;
    filePath?: string;
    risks?: string[];
    metadata?: Record<string, any>;
  };
  timestamp: number;
  expiresAt?: number;
}

export interface ConsentPolicy {
  type: string;
  autoApprove?: boolean;
  requiresConfirmation: boolean;
  maxAutoApprovals?: number;
  validityPeriod?: number; // in milliseconds
}

export class ConsentService extends EventEmitter {
  private pendingRequests: Map<string, ConsentRequest> = new Map();
  private consentHistory: Map<string, boolean> = new Map();
  private policies: Map<string, ConsentPolicy> = new Map();
  private autoApprovalCounts: Map<string, number> = new Map();
  private window: BrowserWindow | null = null;

  constructor() {
    super();
    this.initializePolicies();
    this.setupIPCHandlers();
  }

  /**
   * Initialize default consent policies
   */
  private initializePolicies() {
    // File access policy - always requires confirmation
    this.policies.set('file_access', {
      type: 'file_access',
      requiresConfirmation: true,
      autoApprove: false,
    });

    // API call policy - can auto-approve for trusted endpoints
    this.policies.set('api_call', {
      type: 'api_call',
      requiresConfirmation: true,
      autoApprove: false,
      maxAutoApprovals: 10,
      validityPeriod: 3600000, // 1 hour
    });

    // Code execution - always requires explicit confirmation
    this.policies.set('code_execution', {
      type: 'code_execution',
      requiresConfirmation: true,
      autoApprove: false,
    });

    // System command - highest risk, always requires confirmation
    this.policies.set('system_command', {
      type: 'system_command',
      requiresConfirmation: true,
      autoApprove: false,
    });

    // Data export - requires confirmation for sensitive data
    this.policies.set('data_export', {
      type: 'data_export',
      requiresConfirmation: true,
      autoApprove: false,
      validityPeriod: 1800000, // 30 minutes
    });
  }

  /**
   * Set the main window for dialog display
   */
  public setWindow(window: BrowserWindow) {
    this.window = window;
  }

  /**
   * Setup IPC handlers for consent management
   */
  private setupIPCHandlers() {
    // Handle consent responses from renderer
    ipcMain.handle('consent:respond', async (event, requestId: string, approved: boolean) => {
      return this.processConsentResponse(requestId, approved);
    });

    // Get pending consent requests
    ipcMain.handle('consent:getPending', async () => {
      return Array.from(this.pendingRequests.values());
    });

    // Update consent policy
    ipcMain.handle('consent:updatePolicy', async (event, type: string, policy: Partial<ConsentPolicy>) => {
      const existingPolicy = this.policies.get(type);
      if (existingPolicy) {
        this.policies.set(type, { ...existingPolicy, ...policy });
        return true;
      }
      return false;
    });
  }

  /**
   * Request user consent for a sensitive operation
   */
  public async requestConsent(
    type: ConsentRequest['type'],
    action: string,
    details: ConsentRequest['details']
  ): Promise<boolean> {
    const policy = this.policies.get(type);
    
    if (!policy || !policy.requiresConfirmation) {
      // If no policy or no confirmation required, approve by default
      return true;
    }

    // Check if auto-approval is enabled and within limits
    if (policy.autoApprove) {
      const count = this.autoApprovalCounts.get(type) || 0;
      if (!policy.maxAutoApprovals || count < policy.maxAutoApprovals) {
        this.autoApprovalCounts.set(type, count + 1);
        this.logConsentDecision(type, action, true, 'auto-approved');
        return true;
      }
    }

    // Create consent request
    const request: ConsentRequest = {
      id: uuidv4(),
      type,
      action,
      description: this.generateDescription(type, action, details),
      details,
      timestamp: Date.now(),
      expiresAt: policy.validityPeriod ? Date.now() + policy.validityPeriod : undefined,
    };

    this.pendingRequests.set(request.id, request);

    // Show consent dialog
    const approved = await this.showConsentDialog(request);

    // Process the response
    return this.processConsentResponse(request.id, approved);
  }

  /**
   * Show consent dialog to user
   */
  private async showConsentDialog(request: ConsentRequest): Promise<boolean> {
    if (!this.window) {
      console.error('No window available for consent dialog');
      return false;
    }

    const risks = request.details.risks || [];
    const riskText = risks.length > 0 ? `\n\nPotential Risks:\n${risks.map(r => `• ${r}`).join('\n')}` : '';

    const result = await dialog.showMessageBox(this.window, {
      type: 'warning',
      title: 'Permission Required',
      message: `${request.action}`,
      detail: `${request.description}${riskText}\n\nDo you want to allow this action?`,
      buttons: ['Deny', 'Allow'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });

    return result.response === 1; // 'Allow' button index
  }

  /**
   * Process consent response
   */
  private processConsentResponse(requestId: string, approved: boolean): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      console.error(`Consent request ${requestId} not found`);
      return false;
    }

    // Remove from pending
    this.pendingRequests.delete(requestId);

    // Store in history
    this.consentHistory.set(requestId, approved);

    // Log the decision
    this.logConsentDecision(request.type, request.action, approved, 'user-decision');

    // Emit event for tracking
    this.emit('consent:decision', {
      requestId,
      type: request.type,
      approved,
      timestamp: Date.now(),
    });

    // Notify renderer if needed
    if (this.window) {
      this.window.webContents.send('consent:update', {
        requestId,
        approved,
        request,
      });
    }

    return approved;
  }

  /**
   * Generate human-readable description for consent request
   */
  private generateDescription(
    type: ConsentRequest['type'],
    action: string,
    details: ConsentRequest['details']
  ): string {
    switch (type) {
      case 'file_access':
        return `The application wants to access the file: ${details.filePath || 'unknown'}`;
      
      case 'api_call':
        return `The application wants to make an API call to: ${details.apiEndpoint || 'external service'}`;
      
      case 'code_execution':
        return `The application wants to execute code: ${details.command || action}`;
      
      case 'system_command':
        return `The application wants to run a system command: ${details.command || action}`;
      
      case 'data_export':
        return `The application wants to export data to: ${details.target || 'external location'}`;
      
      default:
        return `The application wants to perform: ${action}`;
    }
  }

  /**
   * Log consent decision for audit trail
   */
  private logConsentDecision(
    type: string,
    action: string,
    approved: boolean,
    method: 'auto-approved' | 'user-decision'
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      action,
      approved,
      method,
    };

    console.log('[ConsentService]', JSON.stringify(logEntry));
    
    // In production, this should write to a secure audit log
    this.emit('consent:logged', logEntry);
  }

  /**
   * Check if a specific action has been previously approved
   */
  public hasConsent(requestId: string): boolean {
    return this.consentHistory.get(requestId) === true;
  }

  /**
   * Clear expired consent requests
   */
  public clearExpiredRequests() {
    const now = Date.now();
    for (const [id, request] of this.pendingRequests.entries()) {
      if (request.expiresAt && request.expiresAt < now) {
        this.pendingRequests.delete(id);
        this.emit('consent:expired', { requestId: id });
      }
    }
  }

  /**
   * Reset auto-approval counts (e.g., daily reset)
   */
  public resetAutoApprovalCounts() {
    this.autoApprovalCounts.clear();
  }

  /**
   * Get consent statistics
   */
  public getStatistics() {
    const stats = {
      pendingRequests: this.pendingRequests.size,
      totalDecisions: this.consentHistory.size,
      approvedCount: Array.from(this.consentHistory.values()).filter(v => v).length,
      deniedCount: Array.from(this.consentHistory.values()).filter(v => !v).length,
      autoApprovalCounts: Object.fromEntries(this.autoApprovalCounts),
    };
    return stats;
  }
}

// Export singleton instance
export const consentService = new ConsentService();