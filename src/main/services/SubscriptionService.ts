
// src/services/SubscriptionService.js
import Purchases from 'react-native-purchases';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SubscriptionService {
  constructor() {
    this.isInitialized = false;
    this.currentOfferings = null;
    this.initialize();
  }

  async initialize() {
    try {
      // RevenueCat API 키 설정 (실제 키로 교체 필요)
      await Purchases.configure({
        apiKey: 'your_revenuecat_api_key_here',
      });

      this.isInitialized = true;
      console.log('구독 서비스 초기화 완료');

      // 현재 사용자 정보 확인
      await this.checkSubscriptionStatus();
    } catch (error) {
      console.error('구독 서비스 초기화 오류:', error);
    }
  }

  async getOfferings() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const offerings = await Purchases.getOfferings();
      this.currentOfferings = offerings;

      return {
        monthly: offerings.current?.monthly,
        annual: offerings.current?.annual,
        lifetime: offerings.current?.lifetime
      };
    } catch (error) {
      console.error('구독 상품 조회 오류:', error);
      return null;
    }
  }

  async purchaseSubscription(packageIdentifier) {
    try {
      if (!this.currentOfferings) {
        await this.getOfferings();
      }

      const purchaseResult = await Purchases.purchasePackage(
        this.currentOfferings.current?.availablePackages.find(
          pkg => pkg.identifier === packageIdentifier
        )
      );

      // 구매 성공 시 프리미엄 상태 업데이트
      await this.updatePremiumStatus(true);

      return {
        success: true,
        customerInfo: purchaseResult.customerInfo,
        productIdentifier: purchaseResult.productIdentifier
      };
    } catch (error) {
      console.error('구독 구매 오류:', error);

      if (error.userCancelled) {
        return { success: false, cancelled: true };
      }

      return { success: false, error: error.message };
    }
  }

  async restorePurchases() {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = this.checkPremiumFromCustomerInfo(customerInfo);

      await this.updatePremiumStatus(isPremium);

      return {
        success: true,
        isPremium,
        customerInfo
      };
    } catch (error) {
      console.error('구매 복원 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async checkSubscriptionStatus() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = this.checkPremiumFromCustomerInfo(customerInfo);

      await this.updatePremiumStatus(isPremium);

      return {
        isPremium,
        activeSubscriptions: customerInfo.activeSubscriptions,
        expirationDate: this.getExpirationDate(customerInfo)
      };
    } catch (error) {
      console.error('구독 상태 확인 오류:', error);
      return { isPremium: false };
    }
  }

  checkPremiumFromCustomerInfo(customerInfo) {
    // 활성 구독이 있는지 확인
    return customerInfo.activeSubscriptions.length > 0 ||
           customerInfo.entitlements.active['premium'] !== undefined;
  }

  getExpirationDate(customerInfo) {
    const activeEntitlements = customerInfo.entitlements.active;
    if (activeEntitlements['premium']) {
      return activeEntitlements['premium'].expirationDate;
    }
    return null;
  }

  async updatePremiumStatus(isPremium) {
    await AsyncStorage.setItem('IS_PREMIUM', isPremium.toString());
    await AsyncStorage.setItem('PREMIUM_CHECK_DATE', new Date().toISOString());
  }

  async isPremiumUser() {
    try {
      const isPremium = await AsyncStorage.getItem('IS_PREMIUM');
      const lastCheck = await AsyncStorage.getItem('PREMIUM_CHECK_DATE');

      // 24시간마다 서버에서 상태 재확인
      if (lastCheck) {
        const lastCheckDate = new Date(lastCheck);
        const now = new Date();
        const hoursDiff = (now - lastCheckDate) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
          const status = await this.checkSubscriptionStatus();
          return status.isPremium;
        }
      }

      return isPremium === 'true';
    } catch (error) {
      console.error('프리미엄 상태 확인 오류:', error);
      return false;
    }
  }

  async getSubscriptionInfo() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = this.checkPremiumFromCustomerInfo(customerInfo);

      if (!isPremium) {
        return { isPremium: false };
      }

      const activeEntitlement = customerInfo.entitlements.active['premium'];

      return {
        isPremium: true,
        productIdentifier: activeEntitlement?.productIdentifier,
        purchaseDate: activeEntitlement?.originalPurchaseDate,
        expirationDate: activeEntitlement?.expirationDate,
        isActive: activeEntitlement?.isActive,
        willRenew: activeEntitlement?.willRenew,
        store: activeEntitlement?.store
      };
    } catch (error) {
      console.error('구독 정보 조회 오류:', error);
      return { isPremium: false };
    }
  }

  getPricingInfo() {
    return {
      free: {
        name: '무료',
        price: '₩0',
        features: [
          '일일 10회 AI 분류',
          '기본 요약 기능',
          '간단한 차트',
          '로컬 저장만'
        ],
        limitations: [
          '일일 사용 제한',
          '기본 기능만',
          '클라우드 백업 없음'
        ]
      },
      premium: {
        monthly: {
          name: '프리미엄 월간',
          price: '₩4,900',
          originalPrice: '₩6,900',
          features: [
            '무제한 AI 분류',
            '고급 요약 및 분석',
            '사용자 정의 텍스트 포맷팅',
            'MCP 연동 (Obsidian/Notion)',
            '클라우드 백업',
            '고급 분석 차트',
            '우선 고객 지원'
          ]
        },
        annual: {
          name: '프리미엄 연간',
          price: '₩49,000',
          originalPrice: '₩82,800',
          savings: '40% 할인',
          features: [
            '월간 요금제의 모든 기능',
            '2개월 무료',
            '연간 결제 할인'
          ]
        }
      }
    };
  }
}

export default new SubscriptionService();
