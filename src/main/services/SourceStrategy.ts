/**
 * =====================================================================================
 * SourceStrategy.ts
 * 역할: 사용자의 질문 분야를 식별하고, 해당 분야에 최적화된 검색 전략을 제공합니다. (4.2)
 * 책임: '분야 인식(Domain Awareness)' 및 '다중 소스 전략(Multi-Source Strategy)' 구현.
 * =====================================================================================
 */

import { BaseLanguageModel } from "@langchain/core/language_models/base";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// 검색 전략 인터페이스 정의
export interface SearchStrategy {
  domain: string;
  primarySources: string[];
  searchOperators: string[]; // 예: filetype:pdf, site:
}

/**
 * 분야별 검색 전략을 관리하는 클래스입니다.
 */
export class SourceStrategyManager {
  // DeepResearchAgent로부터 LLM 인스턴스를 주입받습니다.
  constructor(private llm: BaseLanguageModel) {}

  // 사전 정의된 도메인 및 전략 매핑 (요구사항 4.2 반영)
  private strategyMap: Record<string, Omit<SearchStrategy, "domain">> = {
    "Academic/Technology": {
        primarySources: ["arXiv", "IEEE Xplore", "JSTOR", "Nature", "Science"],
        searchOperators: ["site:arxiv.org OR site:ieee.org", "filetype:pdf"],
    },
    "Economics/Finance": {
        primarySources: ["IMF", "World Bank", "OECD", "Reuters", "Bloomberg", "Financial Times", "Central Banks"],
        searchOperators: ["site:imf.org OR site:worldbank.org", "site:reuters.com/business"],
    },
    "Medical/Biology": {
        primarySources: ["PubMed", "The Lancet", "JAMA"],
        searchOperators: ["site:pubmed.ncbi.nlm.nih.gov"],
    },
    "Corporate Analysis": {
        primarySources: ["Company IR/Newsroom", "McKinsey", "BCG", "Bain & Company"],
        searchOperators: ["site:mckinsey.com/our-insights OR site:bcg.com/publications", "filetype:pdf 'industry report'"],
    },
    "Government/Policy": {
        primarySources: ["Government Portals (korea.kr, whitehouse.gov)", "National Research Institutes"],
        searchOperators: ["site:.gov OR site:.go.kr", "policy OR regulation"],
    },
    "General News": {
        primarySources: ["Reuters", "AP News", "BBC"],
        searchOperators: [],
    },
  };

  /**
   * 사용자 질문의 핵심 분야를 식별합니다. (Gemini 추론 사용) (4.2)
   * @param query 사용자의 원본 질문
   * @returns 식별된 도메인 문자열
   */
  public async identifyDomain(query: string): Promise<string> {
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "당신은 전문 연구 사서입니다. 사용자의 연구 질문을 분석하여 사전 정의된 도메인 중 하나로 분류해야 합니다."],
        ["human", `다음 질문을 분석하여 가장 관련성이 높은 주요 연구 도메인을 결정하십시오.
         가능한 도메인 목록:
         {domains}

         질문: {query}

         목록에 있는 도메인 이름 하나만 응답하고, 다른 설명은 추가하지 마십시오.`]
    ]);

    try {
        // 실제 LLM 호출 로직
        const chain = prompt.pipe(this.llm);
        const response = await chain.invoke({
            domains: Object.keys(this.strategyMap).join(", "),
            query: query,
        });
        
        let identifiedDomain = "";
        if (typeof response === 'string') {
            identifiedDomain = response.trim();
        } else if (response && typeof response === 'object' && 'content' in response) {
            identifiedDomain = response.content.toString().trim();
        }

        // 결과 검증
        if (Object.keys(this.strategyMap).includes(identifiedDomain)) {
            return identifiedDomain;
        }
    } catch (error) {
        console.error("[SourceStrategy] 도메인 식별 실패:", error);
        
        // 데모 환경을 위한 Mock 응답 (실제 환경에서는 위 코드를 사용)
        let identifiedDomain = "General News";
        if (query.toLowerCase().includes("그래핀") || query.toLowerCase().includes("ai") || query.toLowerCase().includes("technology")) {
            identifiedDomain = "Academic/Technology";
        } else if (query.toLowerCase().includes("금리") || query.toLowerCase().includes("경제") || query.toLowerCase().includes("market")) {
            identifiedDomain = "Economics/Finance";
        } else if (query.toLowerCase().includes("의학") || query.toLowerCase().includes("병원") || query.toLowerCase().includes("health")) {
            identifiedDomain = "Medical/Biology";
        } else if (query.toLowerCase().includes("정책") || query.toLowerCase().includes("정부") || query.toLowerCase().includes("policy")) {
            identifiedDomain = "Government/Policy";
        }
        
        return identifiedDomain;
    }

    return "General News"; // 식별 실패 시 기본값
  }

  /**
   * 식별된 분야에 최적화된 소스 목록과 검색 전략을 반환합니다.
   * @param domain 식별된 분야
   * @returns 해당 분야의 SearchStrategy
   */
  public getStrategyForDomain(domain: string): SearchStrategy {
    const strategy = this.strategyMap[domain];

    if (!strategy) {
        // 정의되지 않은 도메인 처리
        return {
            domain: domain,
            primarySources: this.strategyMap["General News"].primarySources,
            searchOperators: this.strategyMap["General News"].searchOperators,
        };
    }

    return {
      domain: domain,
      ...strategy,
    };
  }

  /**
   * 모든 사용 가능한 도메인 목록을 반환합니다.
   * @returns 도메인 이름 배열
   */
  public getAvailableDomains(): string[] {
    return Object.keys(this.strategyMap);
  }

  /**
   * 특정 도메인의 상세 정보를 반환합니다.
   * @param domain 도메인 이름
   * @returns 해당 도메인의 전략 정보
   */
  public getDomainDetails(domain: string): SearchStrategy | null {
    if (this.strategyMap[domain]) {
      return this.getStrategyForDomain(domain);
    }
    return null;
  }
} 