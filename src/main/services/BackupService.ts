// src/services/BackupService.js
import { GoogleSignin, GoogleDrive } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import DatabaseService from './DatabaseService';
import { Alert } from 'react-native';

class BackupService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    try {
      await GoogleSignin.configure({
        scopes: ['https://www.googleapis.com/auth/drive.file'],
        webClientId: 'your-web-client-id.googleusercontent.com', // 실제 클라이언트 ID로 교체
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('백업 서비스 초기화 오류:', error);
    }
  }

  async signInToGoogle() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      return userInfo;
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      throw error;
    }
  }

  async signOutFromGoogle() {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Google 로그아웃 오류:', error);
    }
  }

  async isSignedIn() {
    try {
      const isSignedIn = await GoogleSignin.isSignedIn();
      return isSignedIn;
    } catch (error) {
      console.error('로그인 상태 확인 오류:', error);
      return false;
    }
  }

  async getCurrentUser() {
    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo;
    } catch (error) {
      console.error('현재 사용자 정보 조회 오류:', error);
      return null;
    }
  }

  async createBackup() {
    try {
      const isSignedIn = await this.isSignedIn();
      if (!isSignedIn) {
        throw new Error('Google 계정에 로그인이 필요합니다.');
      }

      // 1. 모든 콘텐츠 데이터 수집
      const allContent = await DatabaseService.getClassifiedContent(10000);
      
      // 2. 설정 데이터 수집
      const settings = await this.getAllSettings();
      
      // 3. 사용 통계 수집
      const stats = await DatabaseService.getCategoryStats();
      
      // 4. 미디어 파일 수집 (이미지들)
      const mediaFiles = await this.collectMediaFiles(allContent);

      // 5. 백업 데이터 구성
      const backupData = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        metadata: {
          totalItems: allContent.length,
          categories: stats.length,
          mediaFiles: mediaFiles.length
        },
        content: allContent,
        settings: settings,
        statistics: stats,
        mediaIndex: mediaFiles.map(file => ({
          id: file.id,
          originalPath: file.path,
          fileName: file.fileName,
          size: file.size
        }))
      };

      // 6. Google Drive에 백업 데이터 업로드
      const backupResult = await this.uploadToGoogleDrive(backupData);
      
      // 7. 미디어 파일들 업로드
      if (mediaFiles.length > 0) {
        await this.uploadMediaFiles(mediaFiles, backupResult.fileId);
      }

      // 8. 마지막 백업 시간 저장
      await AsyncStorage.setItem('LAST_BACKUP_DATE', new Date().toISOString());

      return {
        success: true,
        fileId: backupResult.fileId,
        itemCount: allContent.length,
        mediaCount: mediaFiles.length
      };

    } catch (error) {
      console.error('백업 생성 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadToGoogleDrive(backupData) {
    try {
      const fileName = `ContentClassifier_Backup_${Date.now()}.json`;
      const content = JSON.stringify(backupData, null, 2);
      
      // 임시 파일로 저장
      const tempPath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      await RNFS.writeFile(tempPath, content, 'utf8');

      // Google Drive API 호출을 위한 토큰 획득
      const tokens = await GoogleSignin.getTokens();
      
      const formData = new FormData();
      formData.append('metadata', JSON.stringify({
        name: fileName,
        parents: ['appDataFolder'] // 앱 전용 폴더에 저장
      }));
      formData.append('file', {
        uri: `file://${tempPath}`,
        type: 'application/json',
        name: fileName
      });

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'multipart/related',
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Google Drive 업로드 실패: ${response.status}`);
      }

      const result = await response.json();
      
      // 임시 파일 삭제
      await RNFS.unlink(tempPath);

      return result;
    } catch (error) {
      console.error('Google Drive 업로드 오류:', error);
      throw error;
    }
  }

  async getBackupList() {
    try {
      const isSignedIn = await this.isSignedIn();
      if (!isSignedIn) {
        return [];
      }

      const tokens = await GoogleSignin.getTokens();
      
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=parents in "appDataFolder" and name contains "ContentClassifier_Backup"&orderBy=createdTime desc',
        {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error('백업 목록 조회 실패');
      }

      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('백업 목록 조회 오류:', error);
      return [];
    }
  }

  async restoreFromBackup(fileId) {
    try {
      const isSignedIn = await this.isSignedIn();
      if (!isSignedIn) {
        throw new Error('Google 계정에 로그인이 필요합니다.');
      }

      // 1. 백업 파일 다운로드
      const backupData = await this.downloadFromGoogleDrive(fileId);
      
      // 2. 기존 데이터 백업 (안전을 위해)
      await this.createLocalBackup();
      
      // 3. 데이터베이스 초기화 및 복원
      await this.restoreDatabase(backupData);
      
      // 4. 설정 복원
      await this.restoreSettings(backupData.settings);
      
      // 5. 미디어 파일 복원 (옵션)
      if (backupData.mediaIndex && backupData.mediaIndex.length > 0) {
        await this.restoreMediaFiles(backupData.mediaIndex, fileId);
      }

      return { success: true, restoredItems: backupData.content?.length || 0 };
    } catch (error) {
      console.error('백업 복원 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async downloadFromGoogleDrive(fileId) {
    try {
      const tokens = await GoogleSignin.getTokens();
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error('백업 파일 다운로드 실패');
      }

      const backupText = await response.text();
      return JSON.parse(backupText);
    } catch (error) {
      console.error('백업 파일 다운로드 오류:', error);
      throw error;
    }
  }

  async restoreDatabase(backupData) {
    try {
      // 기존 데이터 삭제 (주의: 모든 데이터가 삭제됨)
      await DatabaseService.db.executeSql('DELETE FROM classified_content');
      
      // 백업 데이터 복원
      if (backupData.content && backupData.content.length > 0) {
        for (const item of backupData.content) {
          // 새로운 스키마에 맞게 데이터 변환
          const convertedItem = this.convertLegacyData(item);
          await DatabaseService.saveClassifiedContent(convertedItem);
        }
      }
    } catch (error) {
      console.error('데이터베이스 복원 오류:', error);
      throw error;
    }
  }

  convertLegacyData(item) {
    // 기존 데이터를 새로운 스키마로 변환
    return {
      date: item.date || item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      topic: item.topic || item.original_text?.substring(0, 50) || '제목 없음',
      keywords: item.keywords || [],
      content: item.content || item.original_text || '',
      url: item.url || '',
      category: item.category || '기타',
      subCategories: item.subCategories || item.sub_categories || [],
      summary: item.summary || '',
      sentiment: item.sentiment || 'neutral',
      sentimentScore: item.sentimentScore || item.sentiment_score || 0,
      mentionedBrands: item.mentionedBrands || item.mentioned_brands || [],
      targetAudience: item.targetAudience || item.target_audience || '',
      qualityScore: item.qualityScore || item.quality_score || 0,
      trendElements: item.trendElements || item.trend_elements || [],
      hasImages: item.hasImages || item.has_images || false,
      hasVideos: item.hasVideos || item.has_videos || false,
      imageAnalysis: item.imageAnalysis || item.image_analysis || {},
      mediaPaths: item.mediaPaths || item.media_paths || [],
      sourcePlatform: item.sourcePlatform || item.source_platform || 'unknown',
      modelUsed: item.modelUsed || item.model_used || 'legacy',
      confidence: item.confidence || 0,
      processedAt: item.processedAt || item.processed_at || item.created_at
    };
  }

  async getAllSettings() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const settings = {};
      
      for (const key of keys) {
        if (key.startsWith('SETTING_') || key.startsWith('USER_') || key.startsWith('CONFIG_')) {
          const value = await AsyncStorage.getItem(key);
          settings[key] = value;
        }
      }
      
      return settings;
    } catch (error) {
      console.error('설정 수집 오류:', error);
      return {};
    }
  }

  async restoreSettings(settings) {
    try {
      if (!settings) return;
      
      for (const [key, value] of Object.entries(settings)) {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('설정 복원 오류:', error);
    }
  }

  async collectMediaFiles(contents) {
    try {
      const mediaFiles = [];
      
      for (const content of contents) {
        if (content.mediaPaths && content.mediaPaths.length > 0) {
          for (const path of content.mediaPaths) {
            try {
              const exists = await RNFS.exists(path);
              if (exists) {
                const stats = await RNFS.stat(path);
                mediaFiles.push({
                  id: content.id,
                  path: path,
                  fileName: path.split('/').pop(),
                  size: stats.size
                });
              }
            } catch (fileError) {
              console.warn('미디어 파일 확인 오류:', path, fileError);
            }
          }
        }
      }
      
      return mediaFiles;
    } catch (error) {
      console.error('미디어 파일 수집 오류:', error);
      return [];
    }
  }

  async createLocalBackup() {
    try {
      const backupPath = `${RNFS.DocumentDirectoryPath}/local_backup_${Date.now()}.json`;
      const allContent = await DatabaseService.getClassifiedContent(10000);
      
      await RNFS.writeFile(backupPath, JSON.stringify(allContent), 'utf8');
      
      // 로컬 백업 정보 저장
      await AsyncStorage.setItem('LOCAL_BACKUP_PATH', backupPath);
      
      return backupPath;
    } catch (error) {
      console.error('로컬 백업 생성 오류:', error);
      throw error;
    }
  }

  async getLastBackupDate() {
    try {
      const lastBackup = await AsyncStorage.getItem('LAST_BACKUP_DATE');
      return lastBackup ? new Date(lastBackup) : null;
    } catch (error) {
      console.error('마지막 백업 날짜 조회 오류:', error);
      return null;
    }
  }

  async deleteBackup(fileId) {
    try {
      const tokens = await GoogleSignin.getTokens();
      
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        }
      });

      return response.ok;
    } catch (error) {
      console.error('백업 삭제 오류:', error);
      return false;
    }
  }

  // 자동 백업 설정
  async scheduleAutoBackup() {
    // React Native에서는 백그라운드 작업 제한이 있으므로
    // 앱이 활성화될 때마다 자동 백업 조건을 확인
    try {
      const lastBackup = await this.getLastBackupDate();
      const now = new Date();
      
      if (!lastBackup || (now - lastBackup) > 7 * 24 * 60 * 60 * 1000) { // 7일
        Alert.alert(
          '자동 백업',
          '마지막 백업 이후 7일이 지났습니다. 백업을 진행하시겠습니까?',
          [
            { text: '나중에' },
            { text: '백업', onPress: () => this.createBackup() }
          ]
        );
      }
    } catch (error) {
      console.error('자동 백업 스케줄 오류:', error);
    }
  }
}

export default new BackupService(); 