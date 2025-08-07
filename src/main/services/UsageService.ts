// src/services/UsageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

class UsageService {
  constructor() {
    this.FREE_DAILY_LIMIT = 10; // 무료 일일 사용 제한
    this.FREE_STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB
    this.PREMIUM_STORAGE_LIMIT = 50 * 1024 * 1024 * 1024; // 50GB
    this.FREE_TOKEN_LIMIT = 10000; // 무료 일일 토큰 제한
    this.PREMIUM_TOKEN_LIMIT = 100000; // 프리미엄 일일 토큰 제한
  }

  // 사용량 제한 확인
  async checkUsageLimit(isPremium) {
    try {
      const today = new Date().toDateString();
      
      if (!isPremium) {
        // 무료 사용자 - 일일 횟수 제한
        const dailyUsage = await this.getDailyUsage(today);
        if (dailyUsage >= this.FREE_DAILY_LIMIT) {
          return false;
        }

        // 무료 사용자 - 토큰 제한
        const dailyTokens = await this.getDailyTokenUsage(today);
        if (dailyTokens >= this.FREE_TOKEN_LIMIT) {
          return false;
        }
      } else {
        // 프리미엄 사용자 - 토큰 제한만 (매우 관대함)
        const dailyTokens = await this.getDailyTokenUsage(today);
        if (dailyTokens >= this.PREMIUM_TOKEN_LIMIT) {
          return false;
        }
      }

      // 저장 공간 확인
      const storageUsed = await this.getStorageUsage();
      const storageLimit = isPremium ? this.PREMIUM_STORAGE_LIMIT : this.FREE_STORAGE_LIMIT;
      
      if (storageUsed >= storageLimit) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('사용량 확인 오류:', error);
      return false;
    }
  }

  // 사용량 기록
  async recordUsage(isPremium, tokenCount = 0, dataSize = 0) {
    try {
      const today = new Date().toDateString();
      
      // 일일 사용 횟수 증가
      await this.incrementDailyUsage(today);
      
      // 토큰 사용량 기록
      if (tokenCount > 0) {
        await this.recordTokenUsage(today, tokenCount);
      }
      
      // 데이터 크기 기록
      if (dataSize > 0) {
        await this.recordDataUsage(dataSize);
      }

      // 사용 통계 업데이트
      await this.updateUsageStats(isPremium, tokenCount, dataSize);

    } catch (error) {
      console.error('사용량 기록 오류:', error);
    }
  }

  // 일일 사용 횟수 조회
  async getDailyUsage(date) {
    try {
      const key = `DAILY_USAGE_${date}`;
      const usage = await AsyncStorage.getItem(key);
      return parseInt(usage || '0');
    } catch (error) {
      console.error('일일 사용량 조회 오류:', error);
      return 0;
    }
  }

  // 일일 사용 횟수 증가
  async incrementDailyUsage(date) {
    try {
      const key = `DAILY_USAGE_${date}`;
      const currentUsage = await this.getDailyUsage(date);
      await AsyncStorage.setItem(key, (currentUsage + 1).toString());
    } catch (error) {
      console.error('일일 사용량 증가 오류:', error);
    }
  }

  // 일일 토큰 사용량 조회
  async getDailyTokenUsage(date) {
    try {
      const key = `DAILY_TOKENS_${date}`;
      const tokens = await AsyncStorage.getItem(key);
      return parseInt(tokens || '0');
    } catch (error) {
      console.error('일일 토큰 사용량 조회 오류:', error);
      return 0;
    }
  }

  // 토큰 사용량 기록
  async recordTokenUsage(date, tokenCount) {
    try {
      const key = `DAILY_TOKENS_${date}`;
      const currentTokens = await this.getDailyTokenUsage(date);
      await AsyncStorage.setItem(key, (currentTokens + tokenCount).toString());
    } catch (error) {
      console.error('토큰 사용량 기록 오류:', error);
    }
  }

  // 저장 공간 사용량 조회
  async getStorageUsage() {
    try {
      // 앱 데이터 디렉토리 크기 계산
      const documentsPath = RNFS.DocumentDirectoryPath;
      const cachePath = RNFS.CachesDirectoryPath;
      
      const [documentsSize, cacheSize] = await Promise.all([
        this.calculateDirectorySize(documentsPath),
        this.calculateDirectorySize(cachePath)
      ]);

      return documentsSize + cacheSize;
    } catch (error) {
      console.error('저장 공간 사용량 조회 오류:', error);
      return 0;
    }
  }

  // 디렉토리 크기 계산
  async calculateDirectorySize(dirPath) {
    try {
      const items = await RNFS.readDir(dirPath);
      let totalSize = 0;

      for (const item of items) {
        if (item.isFile()) {
          totalSize += item.size;
        } else if (item.isDirectory()) {
          totalSize += await this.calculateDirectorySize(item.path);
        }
      }

      return totalSize;
    } catch (error) {
      console.error('디렉토리 크기 계산 오류:', error);
      return 0;
    }
  }

  // 데이터 사용량 기록
  async recordDataUsage(dataSize) {
    try {
      const key = 'TOTAL_DATA_USAGE';
      const currentUsage = await AsyncStorage.getItem(key);
      const newUsage = parseInt(currentUsage || '0') + dataSize;
      await AsyncStorage.setItem(key, newUsage.toString());
    } catch (error) {
      console.error('데이터 사용량 기록 오류:', error);
    }
  }

  // 사용 통계 업데이트
  async updateUsageStats(isPremium, tokenCount, dataSize) {
    try {
      const stats = await this.getUsageStats();
      
      const updatedStats = {
        ...stats,
        totalRequests: (stats.totalRequests || 0) + 1,
        totalTokens: (stats.totalTokens || 0) + tokenCount,
        totalDataSize: (stats.totalDataSize || 0) + dataSize,
        lastUsed: new Date().toISOString(),
        planType: isPremium ? 'premium' : 'free'
      };

      await AsyncStorage.setItem('USAGE_STATS', JSON.stringify(updatedStats));
    } catch (error) {
      console.error('사용 통계 업데이트 오류:', error);
    }
  }

  // 사용 통계 조회
  async getUsageStats() {
    try {
      const stats = await AsyncStorage.getItem('USAGE_STATS');
      return stats ? JSON.parse(stats) : {};
    } catch (error) {
      console.error('사용 통계 조회 오류:', error);
      return {};
    }
  }

  // 현재 사용량 정보 조회 (UI 표시용)
  async getCurrentUsageInfo(isPremium) {
    try {
      const today = new Date().toDateString();
      const dailyUsage = await this.getDailyUsage(today);
      const dailyTokens = await this.getDailyTokenUsage(today);
      const storageUsed = await this.getStorageUsage();
      
      const limits = {
        dailyRequests: isPremium ? 999999 : this.FREE_DAILY_LIMIT,
        dailyTokens: isPremium ? this.PREMIUM_TOKEN_LIMIT : this.FREE_TOKEN_LIMIT,
        storage: isPremium ? this.PREMIUM_STORAGE_LIMIT : this.FREE_STORAGE_LIMIT
      };

      return {
        current: {
          dailyRequests: dailyUsage,
          dailyTokens: dailyTokens,
          storage: storageUsed
        },
        limits,
        percentages: {
          dailyRequests: isPremium ? 0 : (dailyUsage / limits.dailyRequests) * 100,
          dailyTokens: (dailyTokens / limits.dailyTokens) * 100,
          storage: (storageUsed / limits.storage) * 100
        },
        canUse: {
          requests: isPremium || dailyUsage < limits.dailyRequests,
          tokens: dailyTokens < limits.dailyTokens,
          storage: storageUsed < limits.storage
        }
      };
    } catch (error) {
      console.error('사용량 정보 조회 오류:', error);
      return null;
    }
  }

  // 사용량 초기화 (새로운 날)
  async cleanupOldUsageData() {
    try {
      // 7일 이상 된 일일 사용량 데이터 삭제
      const keys = await AsyncStorage.getAllKeys();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);

      for (const key of keys) {
        if (key.startsWith('DAILY_USAGE_') || key.startsWith('DAILY_TOKENS_')) {
          const dateStr = key.split('_').pop();
          const keyDate = new Date(dateStr);
          
          if (keyDate < cutoffDate) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('오래된 사용량 데이터 정리 오류:', error);
    }
  }

  // 스토리지 정리
  async cleanupStorage() {
    try {
      // 캐시 정리
      const cachePath = RNFS.CachesDirectoryPath;
      const cacheItems = await RNFS.readDir(cachePath);
      
      for (const item of cacheItems) {
        if (item.isFile()) {
          // 7일 이상 된 캐시 파일 삭제
          const daysDiff = (Date.now() - new Date(item.mtime).getTime()) / (1000 * 60 * 60 * 24);
          if (daysDiff > 7) {
            await RNFS.unlink(item.path);
          }
        }
      }
    } catch (error) {
      console.error('스토리지 정리 오류:', error);
    }
  }

  // 사용량 제한 메시지 생성
  getUsageLimitMessage(isPremium, usageInfo) {
    if (!usageInfo) return '사용량 정보를 불러올 수 없습니다.';

    const { current, limits, canUse } = usageInfo;

    if (!canUse.requests && !isPremium) {
      return `일일 사용 한도(${limits.dailyRequests}회)를 초과했습니다. 프리미엄으로 업그레이드하거나 내일 다시 시도해주세요.`;
    }

    if (!canUse.tokens) {
      return `일일 토큰 한도(${limits.dailyTokens.toLocaleString()})를 초과했습니다. 내일 다시 시도해주세요.`;
    }

    if (!canUse.storage) {
      const storageGB = (limits.storage / (1024 * 1024 * 1024)).toFixed(1);
      return `저장 공간 한도(${storageGB}GB)를 초과했습니다. 일부 데이터를 삭제하거나 프리미엄으로 업그레이드해주세요.`;
    }

    return null;
  }

  // 용량을 읽기 쉬운 형태로 변환
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

export default new UsageService(); 