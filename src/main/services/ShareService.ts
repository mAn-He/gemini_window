// src/services/ShareService.js
import { Share, Linking, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

class ShareService {
  constructor() {
    this.isShareExtensionSupported = false;
    this.pendingShare = null;
  }

  // Android Share Intent 처리 (텍스트 + 이미지)
  async handleShareIntent() {
    try {
      const ShareIntent = require('react-native-share-intent');
      
      // 텍스트 공유 처리
      ShareIntent.getSharedText((text) => {
        if (text && text.length > 0) {
          this.processSharedContent({ text, type: 'text' });
        }
      });

      // 이미지/영상 공유 처리
      ShareIntent.getSharedFile((files) => {
        if (files && files.length > 0) {
          this.processSharedContent({ 
            files, 
            type: 'media',
            text: files[0].text || '' // 캡션이 있다면 포함
          });
        }
      });

      // URL 공유 처리 (인스타그램/스레드 링크)
      ShareIntent.getSharedWebUrl((url) => {
        if (url && this.isInstagramOrThreadsUrl(url)) {
          this.processSharedContent({ url, type: 'url' });
        }
      });

    } catch (error) {
      console.error('Share Intent 처리 오류:', error);
    }
  }

  // 공유된 콘텐츠 처리
  async processSharedContent(shareData) {
    try {
      let processedData = {
        text: shareData.text || '',
        images: [],
        videos: [],
        url: shareData.url || '',
        timestamp: new Date().toISOString(),
        source: this.detectSource(shareData)
      };

      // 미디어 파일 처리
      if (shareData.files) {
        for (const file of shareData.files) {
          if (this.isImageFile(file.fileName)) {
            const imageData = await this.processImage(file.filePath);
            processedData.images.push(imageData);
          } else if (this.isVideoFile(file.fileName)) {
            const videoData = await this.processVideo(file.filePath);
            processedData.videos.push(videoData);
          }
        }
      }

      // URL에서 콘텐츠 추출
      if (shareData.url) {
        const urlContent = await this.extractContentFromUrl(shareData.url);
        if (urlContent) {
          processedData = { ...processedData, ...urlContent };
        }
      }

      // 글로벌 이벤트로 전달
      this.notifyContentReceived(processedData);

    } catch (error) {
      console.error('콘텐츠 처리 오류:', error);
      Alert.alert('오류', '공유된 콘텐츠를 처리하는 중 오류가 발생했습니다.');
    }
  }

  // URL에서 콘텐츠 추출 (웹 스크래핑)
  async extractContentFromUrl(url) {
    try {
      const isInstagram = url.includes('instagram.com');
      const isThreads = url.includes('threads.net');
      
      if (!isInstagram && !isThreads) return null;

      // 간단한 메타데이터 추출 (실제로는 더 복잡한 스크래핑 필요)
      const response = await fetch(url);
      const html = await response.text();
      
      // 기본적인 메타데이터 파싱
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/i);
      const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/i);

      return {
        title: titleMatch ? titleMatch[1] : '',
        description: descriptionMatch ? descriptionMatch[1] : '',
        thumbnail: imageMatch ? imageMatch[1] : '',
        extractedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('URL 콘텐츠 추출 오류:', error);
      return null;
    }
  }

  // 이미지 처리 및 AI 분석 준비
  async processImage(imagePath) {
    try {
      // 이미지를 base64로 변환 (AI 모델 입력용)
      const imageBase64 = await RNFS.readFile(imagePath, 'base64');
      
      // 이미지 메타데이터 추출
      const stats = await RNFS.stat(imagePath);
      
      return {
        path: imagePath,
        base64: imageBase64,
        size: stats.size,
        mimeType: this.getMimeType(imagePath),
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('이미지 처리 오류:', error);
      return null;
    }
  }

  // 영상 처리
  async processVideo(videoPath) {
    try {
      const stats = await RNFS.stat(videoPath);
      
      // 영상은 썸네일만 추출 (실제로는 ffmpeg 등 사용)
      return {
        path: videoPath,
        size: stats.size,
        mimeType: this.getMimeType(videoPath),
        duration: 0, // 실제로는 영상 길이 추출 필요
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('영상 처리 오류:', error);
      return null;
    }
  }

  // 소스 플랫폼 감지
  detectSource(shareData) {
    if (shareData.url) {
      if (shareData.url.includes('instagram.com')) return 'Instagram';
      if (shareData.url.includes('threads.net')) return 'Threads';
    }
    return 'Unknown';
  }

  // 파일 타입 확인
  isImageFile(fileName) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  isVideoFile(fileName) {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    return videoExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  isInstagramOrThreadsUrl(url) {
    return url.includes('instagram.com') || url.includes('threads.net');
  }

  getMimeType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  // 콘텐츠 수신 알림
  notifyContentReceived(processedData) {
    // React Native의 DeviceEventEmitter 사용
    const { DeviceEventEmitter } = require('react-native');
    DeviceEventEmitter.emit('ContentShared', processedData);
  }

  // 수동으로 갤러리에서 이미지 선택
  async pickImageFromGallery() {
    return new Promise((resolve, reject) => {
      launchImageLibrary({
        mediaType: 'mixed',
        quality: 0.8,
        includeBase64: true
      }, (response) => {
        if (response.didCancel || response.error) {
          reject(response.error || 'User cancelled');
        } else {
          resolve(response.assets[0]);
        }
      });
    });
  }
}

export default new ShareService(); 