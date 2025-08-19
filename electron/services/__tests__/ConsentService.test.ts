import { ConsentService } from '../ConsentService';
import { BrowserWindow, dialog, ipcMain } from 'electron';

// Mock electron modules
jest.mock('electron', () => ({
  BrowserWindow: jest.fn(),
  dialog: {
    showMessageBox: jest.fn(),
  },
  ipcMain: {
    handle: jest.fn(),
  },
}));

describe('ConsentService', () => {
  let consentService: ConsentService;
  let mockWindow: any;

  beforeEach(() => {
    // Create a new instance for each test
    consentService = new ConsentService();
    
    // Mock BrowserWindow
    mockWindow = {
      webContents: {
        send: jest.fn(),
      },
    };
    
    consentService.setWindow(mockWindow as BrowserWindow);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('requestConsent', () => {
    it('should auto-approve if policy allows', async () => {
      // Update policy to allow auto-approval
      const policy = {
        type: 'api_call',
        requiresConfirmation: false,
        autoApprove: true,
      };
      
      // @ts-ignore - accessing private property for testing
      consentService.policies.set('api_call', policy);
      
      const result = await consentService.requestConsent(
        'api_call',
        'Test API Call',
        { apiEndpoint: 'https://api.example.com' }
      );
      
      expect(result).toBe(true);
      expect(dialog.showMessageBox).not.toHaveBeenCalled();
    });

    it('should show dialog for sensitive operations', async () => {
      // Mock dialog response
      (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 }); // Allow
      
      const result = await consentService.requestConsent(
        'file_access',
        'Read sensitive file',
        { 
          filePath: '/etc/passwd',
          risks: ['Access to system file']
        }
      );
      
      expect(result).toBe(true);
      expect(dialog.showMessageBox).toHaveBeenCalledWith(
        mockWindow,
        expect.objectContaining({
          type: 'warning',
          title: 'Permission Required',
          message: 'Read sensitive file',
        })
      );
    });

    it('should deny consent when user rejects', async () => {
      // Mock dialog response
      (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 0 }); // Deny
      
      const result = await consentService.requestConsent(
        'code_execution',
        'Execute user script',
        { command: 'rm -rf /' }
      );
      
      expect(result).toBe(false);
    });

    it('should track consent decisions', async () => {
      (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });
      
      const consentSpy = jest.spyOn(consentService, 'hasConsent');
      
      await consentService.requestConsent(
        'data_export',
        'Export data',
        { target: 'external-service' }
      );
      
      // The request should be tracked
      // Note: We can't directly check hasConsent without the requestId
      // In a real scenario, we'd capture the requestId from the event
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'consent:update',
        expect.objectContaining({
          approved: true,
        })
      );
    });

    it('should respect auto-approval limits', async () => {
      const policy = {
        type: 'api_call',
        requiresConfirmation: true,
        autoApprove: true,
        maxAutoApprovals: 2,
      };
      
      // @ts-ignore
      consentService.policies.set('api_call', policy);
      
      // First two should auto-approve
      for (let i = 0; i < 2; i++) {
        const result = await consentService.requestConsent(
          'api_call',
          `API Call ${i}`,
          { apiEndpoint: 'https://api.example.com' }
        );
        expect(result).toBe(true);
      }
      
      // Third should require dialog
      (dialog.showMessageBox as jest.Mock).mockResolvedValue({ response: 1 });
      
      const result = await consentService.requestConsent(
        'api_call',
        'API Call 3',
        { apiEndpoint: 'https://api.example.com' }
      );
      
      expect(dialog.showMessageBox).toHaveBeenCalled();
    });
  });

  describe('clearExpiredRequests', () => {
    it('should remove expired consent requests', async () => {
      const expiredRequest = {
        id: 'test-1',
        type: 'api_call' as const,
        action: 'Test',
        description: 'Test request',
        details: {},
        timestamp: Date.now() - 3600000,
        expiresAt: Date.now() - 1000, // Already expired
      };
      
      // @ts-ignore - accessing private property
      consentService.pendingRequests.set(expiredRequest.id, expiredRequest);
      
      consentService.clearExpiredRequests();
      
      // @ts-ignore
      expect(consentService.pendingRequests.has(expiredRequest.id)).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return consent statistics', () => {
      const stats = consentService.getStatistics();
      
      expect(stats).toHaveProperty('pendingRequests');
      expect(stats).toHaveProperty('totalDecisions');
      expect(stats).toHaveProperty('approvedCount');
      expect(stats).toHaveProperty('deniedCount');
      expect(stats).toHaveProperty('autoApprovalCounts');
    });
  });

  describe('resetAutoApprovalCounts', () => {
    it('should reset auto-approval counts', () => {
      // @ts-ignore
      consentService.autoApprovalCounts.set('api_call', 5);
      
      consentService.resetAutoApprovalCounts();
      
      // @ts-ignore
      expect(consentService.autoApprovalCounts.size).toBe(0);
    });
  });
});