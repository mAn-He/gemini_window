/**
 * =====================================================================================
 * MultimodalAIService.ts
 * 역할: LangChain과 Gemini 모델(ChatGoogleGenerativeAI) 간의 연동을 담당합니다.
 * 책임: 모델 초기화, 환경 설정, 저수준 API 호출 인터페이스 제공.
 * =====================================================================================
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

// LangChain types for compatibility
interface BaseLanguageModel {
  invoke(input: string): Promise<{ content: string }>;
}

interface FakeLanguageModel extends BaseLanguageModel {
  responses: string[];
  currentIndex: number;
}

export class MultimodalAIService {
  // 추론 및 종합을 위한 고성능 모델 (Gemini 2.5 Pro/Flash 사용)
  private reasoningEngine: BaseLanguageModel | GoogleGenerativeAI;
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    // 환경 변수에서 API 키 로드 (보안을 위해 .env 파일 사용 권장)
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("경고: GOOGLE_API_KEY가 설정되지 않았습니다. 구조 테스트를 위해 Mock 모델을 사용합니다.");
      // API 키가 없을 경우, Mock 모델 사용 (데모용)
      this.reasoningEngine = this.initializeMockModel();
    } else {
      // API 키가 있을 경우 실제 Gemini 모델 초기화
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.reasoningEngine = this.genAI;
    }
  }

  /**
   * 데모 및 테스트 환경을 위한 Mock 모델을 초기화합니다.
   */
  private initializeMockModel(): FakeLanguageModel {
    return {
      responses: [
        "질문이 매우 광범위합니다. 어떤 측면에 더 관심이 있으신가요?\nA. 그래핀의 기초 과학적 원리와 한계점\nB. 주요 응용 분야와 시장 전망\nC. 한국의 그래핀 연구개발 정책 현황",
        "다음과 같은 연구 계획을 수립했습니다. 진행할까요? (승인/수정 요청)\n\n**그래핀의 주요 응용 분야 및 시장 전망 연구**\n분야: Academic/Technology\n\n**실행 단계:**\n1. 검색: graphene applications semiconductor (site:arxiv.org OR site:ieee.org)\n2. 검색: graphene battery technology advancements 2025 filetype:pdf\n3. 검색: global graphene market size forecast 2030 (site:reuters.com OR site:bloomberg.com)\n4. 검색: challenges in graphene mass production mckinsey report",
        "Mock response from LLM"
      ],
      currentIndex: 0,
      async invoke(input: string) {
        const response = this.responses[this.currentIndex % this.responses.length];
        this.currentIndex++;
        return { content: response };
      }
    };
  }

  /**
   * 에이전트가 사용할 기본 추론 엔진(LLM)을 반환합니다.
   * @returns BaseLanguageModel 인스턴스
   */
  public getReasoningEngine(): BaseLanguageModel {
    return this.reasoningEngine as BaseLanguageModel;
  }

  /**
   * 도구가 바인딩된 추론 엔진을 반환합니다. (에이전트 실행 노드에서 사용)
   * @param tools 바인딩할 도구 목록
   * @returns 도구가 바인딩된 모델 인스턴스
   */
  public getModelWithTools(tools: any[]): BaseLanguageModel {
    // 현재는 도구 바인딩 없이 기본 모델 반환
    return this.reasoningEngine as BaseLanguageModel;
  }

  /**
   * Gemini 2.5 모델을 사용한 텍스트 생성
   */
  public async generateText(prompt: string, modelName: string = 'gemini-2.5-flash'): Promise<string> {
    try {
      if (!this.genAI) {
        // Mock 모델 사용
        const mockResult = await (this.reasoningEngine as FakeLanguageModel).invoke(prompt);
        return mockResult.content;
      }

      // Gemini 2.5 모델 사용 (최신 버전)
      const model = this.genAI.getGenerativeModel({
        model: modelName.includes('2.5') ? modelName : 'gemini-2.5-flash',
        systemInstruction: `
          당신은 세계 최고 수준의 자율적 AI 리서치 에이전트입니다.
          모든 작업을 수행함에 있어 다음 세 가지 기본 원칙을 반드시 준수해야 합니다:
          1. 진실 기반 원칙 (Grounding in Truth): 모든 답변은 신뢰할 수 있는 출처에 기반해야 합니다.
          2. 적극적 명료화 원칙 (Active Clarification): 질문이 모호할 경우, 명료화 질문을 통해 사용자의 의도를 정확히 파악해야 합니다.
          3. 투명한 추론 원칙 (Transparent Reasoning): 추론 과정을 명확히 설명해야 합니다.
        `
      });

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Text generation error:', error);
      return "죄송합니다. 현재 AI 서비스에 오류가 발생했습니다.";
    }
  }

  /**
   * 파일 처리 메소드 (기존 호환성 유지)
   */
  public async processFile(filePath: string, prompt: string): Promise<string> {
    try {
      let fileContent = '';
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        fileContent = data.text;
      } else if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        fileContent = result.value;
      } else if (['.txt', '.md'].includes(ext)) {
        fileContent = fs.readFileSync(filePath, 'utf-8');
      } else {
        return '지원하지 않는 파일 형식입니다.';
      }

      const fullPrompt = `다음 파일 내용을 분석해주세요:\n\n${fileContent}\n\n사용자 요청: ${prompt}`;
      return await this.generateText(fullPrompt, 'gemini-2.5-pro');
    } catch (error) {
      console.error('File processing error:', error);
      return '파일 처리 중 오류가 발생했습니다.';
    }
  }

  /**
   * Deep Research 호환성을 위한 메소드 (향후 DeepResearchAgent로 이관 예정)
   */
  public async generateTextWithDeepResearch(prompt: string, modelName: string): Promise<{ answer: string; refinedQuery: string }> {
    // 임시 구현 - DeepResearchAgent가 완전히 통합되면 제거 예정
    console.log('Legacy deep research method called. Consider migrating to DeepResearchAgent.');
    
    try {
      const answer = await this.generateText(`Deep research analysis: ${prompt}`, 'gemini-2.5-pro');
        return {
        answer,
        refinedQuery: prompt // 단순화된 구현
      };
    } catch (error) {
      console.error('Deep research error:', error);
      return { 
        answer: "Deep research 처리 중 오류가 발생했습니다.",
        refinedQuery: prompt
      };
    }
  }
} 