
// src/services/MCPService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class MCPService {
  constructor() {
    this.obsidianConfig = null;
    this.notionConfig = null;
    this.isEnabled = false;
  }

  async initialize() {
    try {
      const obsidianConfig = await AsyncStorage.getItem('OBSIDIAN_CONFIG');
      const notionConfig = await AsyncStorage.getItem('NOTION_CONFIG');

      if (obsidianConfig) {
        this.obsidianConfig = JSON.parse(obsidianConfig);
      }

      if (notionConfig) {
        this.notionConfig = JSON.parse(notionConfig);
      }

      this.isEnabled = !!(this.obsidianConfig || this.notionConfig);
      console.log('MCP 서비스 초기화 완료:', { obsidian: !!this.obsidianConfig, notion: !!this.notionConfig });
    } catch (error) {
      console.error('MCP 서비스 초기화 오류:', error);
    }
  }

  // Obsidian 설정
  async configureObsidian(config) {
    try {
      const obsidianConfig = {
        baseUrl: config.baseUrl || 'http://localhost:27123',
        token: config.token,
        vaultName: config.vaultName,
        enabled: true,
        lastSync: null
      };

      await AsyncStorage.setItem('OBSIDIAN_CONFIG', JSON.stringify(obsidianConfig));
      this.obsidianConfig = obsidianConfig;
      this.isEnabled = true;

      // 연결 테스트
      const isConnected = await this.testObsidianConnection();
      return { success: isConnected, config: obsidianConfig };
    } catch (error) {
      console.error('Obsidian 설정 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // Notion 설정
  async configureNotion(config) {
    try {
      const notionConfig = {
        apiKey: config.apiKey,
        databaseId: config.databaseId,
        enabled: true,
        lastSync: null
      };

      await AsyncStorage.setItem('NOTION_CONFIG', JSON.stringify(notionConfig));
      this.notionConfig = notionConfig;
      this.isEnabled = true;

      // 연결 테스트
      const isConnected = await this.testNotionConnection();
      return { success: isConnected, config: notionConfig };
    } catch (error) {
      console.error('Notion 설정 오류:', error);
      return { success: false, error: error.message };
    }
  }

  async testObsidianConnection() {
    if (!this.obsidianConfig) return false;

    try {
      const response = await fetch(`${this.obsidianConfig.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.obsidianConfig.token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Obsidian 연결 테스트 실패:', error);
      return false;
    }
  }

  async testNotionConnection() {
    if (!this.notionConfig) return false;

    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.notionConfig.apiKey}`,
          'Notion-Version': '2022-06-28'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Notion 연결 테스트 실패:', error);
      return false;
    }
  }

  // Obsidian에 노트 생성
  async createObsidianNote(title, content, category) {
    if (!this.obsidianConfig?.enabled) {
      throw new Error('Obsidian이 설정되지 않았습니다.');
    }

    try {
      const noteContent = this.formatForObsidian(content, category);

      const response = await fetch(`${this.obsidianConfig.baseUrl}/api/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.obsidianConfig.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filename: `${title}.md`,
          content: noteContent,
          folder: `ContentClassifier/${category}`
        })
      });

      if (!response.ok) {
        throw new Error(`Obsidian API 오류: ${response.status}`);
      }

      const result = await response.json();
      console.log('Obsidian 노트 생성 성공:', result);
      return result;
    } catch (error) {
      console.error('Obsidian 노트 생성 오류:', error);
      throw error;
    }
  }

  // Notion에 페이지 생성
  async createNotionPage(title, content, category) {
    if (!this.notionConfig?.enabled) {
      throw new Error('Notion이 설정되지 않았습니다.');
    }

    try {
      const pageData = {
        parent: { database_id: this.notionConfig.databaseId },
        properties: {
          'Name': {
            title: [{ text: { content: title } }]
          },
          'Category': {
            select: { name: category }
          },
          'Source': {
            select: { name: 'ContentClassifier' }
          },
          'Created': {
            date: { start: new Date().toISOString() }
          }
        },
        children: this.formatForNotion(content)
      };

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.notionConfig.apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pageData)
      });

      if (!response.ok) {
        throw new Error(`Notion API 오류: ${response.status}`);
      }

      const result = await response.json();
      console.log('Notion 페이지 생성 성공:', result);
      return result;
    } catch (error) {
      console.error('Notion 페이지 생성 오류:', error);
      throw error;
    }
  }

  formatForObsidian(content, category) {
    const { originalText, summary, keywords } = content;
    const timestamp = new Date().toISOString().split('T')[0];

    return `---
category: ${category}
tags: [${keywords.join(', ')}]
created: ${timestamp}
source: ContentClassifier
---

# ${category} 콘텐츠

## 원본 텍스트
${originalText}

## 요약
${summary}

## 키워드
${keywords.map(k => `- ${k}`).join('\n')}

## 메타데이터
- 분류일: ${timestamp}
- 분류 카테고리: ${category}
- 생성 앱: ContentClassifier
`;
  }

  formatForNotion(content) {
    const { originalText, summary, keywords } = content;

    return [
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '원본 텍스트' } }]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: originalText } }]
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '요약' } }]
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: summary } }]
        }
      },
      {
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: '키워드' } }]
        }
      },
      {
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: keywords.map(keyword => ({
            text: { content: keyword }
          }))
        }
      }
    ];
  }

  // 자동 동기화
  async syncContent(contentData) {
    const results = {};

    if (this.obsidianConfig?.enabled) {
      try {
        results.obsidian = await this.createObsidianNote(
          `${contentData.category}_${Date.now()}`,
          contentData,
          contentData.category
        );
      } catch (error) {
        results.obsidian = { error: error.message };
      }
    }

    if (this.notionConfig?.enabled) {
      try {
        results.notion = await this.createNotionPage(
          `${contentData.category} 콘텐츠`,
          contentData,
          contentData.category
        );
      } catch (error) {
        results.notion = { error: error.message };
      }
    }

    return results;
  }

  async getSettings() {
    return {
      obsidian: {
        enabled: this.obsidianConfig?.enabled || false,
        connected: this.obsidianConfig ? await this.testObsidianConnection() : false,
        vaultName: this.obsidianConfig?.vaultName
      },
      notion: {
        enabled: this.notionConfig?.enabled || false,
        connected: this.notionConfig ? await this.testNotionConnection() : false,
        databaseId: this.notionConfig?.databaseId
      }
    };
  }

  async disableObsidian() {
    await AsyncStorage.removeItem('OBSIDIAN_CONFIG');
    this.obsidianConfig = null;
    this.isEnabled = !!this.notionConfig;
  }

  async disableNotion() {
    await AsyncStorage.removeItem('NOTION_CONFIG');
    this.notionConfig = null;
    this.isEnabled = !!this.obsidianConfig;
  }
}

export default new MCPService();
