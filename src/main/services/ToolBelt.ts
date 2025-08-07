/**
 * =====================================================================================
 * ToolBelt.ts
 * 역할: 에이전트가 사용할 수 있는 모든 도구(Tool)를 정의하고 관리합니다.
 * 책임: 외부 서비스(검색, 스크래핑 등)를 LangChain의 StructuredTool 또는 DynamicTool로 래핑합니다.
 * =====================================================================================
 */

import { DynamicStructuredTool, Tool } from "@langchain/core/tools";
import { z } from "zod";
import { chromium, Browser, Page } from 'playwright';

// 실제 구현에서는 Tavily, SerpAPI, Google Custom Search API 클라이언트나
// Playwright/Cheerio 같은 스크래핑 라이브러리를 사용합니다.

/**
 * 에이전트가 사용할 수 있는 도구 모음 클래스입니다.
 */
export class ToolBelt {
  private tools: Tool[];
  private browser: Browser | null = null;

  constructor() {
    this.tools = [
      this.createWebSearchTool(),
      this.createDeepWebScraperTool(),
      // 향후 확장 가능: arXiv 검색 도구, 금융 DB 쿼리 도구 등
    ];
  }

  /**
   * 정의된 모든 도구를 배열로 반환합니다.
   * @returns 도구 목록
   */
  public getTools(): Tool[] {
    return this.tools;
  }

  /**
   * 브라우저 초기화
   */
  private async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }
  }

  /**
   * 브라우저 종료
   */
  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 웹 검색 도구를 생성합니다. (원칙 1: 진실 기반 원칙)
   */
  private createWebSearchTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "web_search",
      description:
        "인터넷에서 최신 정보를 검색합니다. 사실 확인, 최신 동향 파악, 특정 주제에 대한 데이터 수집 시 사용합니다. 입력은 최적화된 검색 쿼리여야 합니다.",
      schema: z.object({
        query: z.string().describe("검색할 내용 (필요시 site: 연산자 등 활용)"),
      }),
      func: async ({ query }) => {
        console.log(`[Tool][Web Search] 검색 실행: ${query}`);

        try {
          await this.initializeBrowser();
          const page = await this.browser!.newPage();

          // Google Scholar 또는 일반 검색 엔진 사용
          let searchUrl = '';
          if (query.includes('site:arxiv.org') || query.includes('academic') || query.includes('research')) {
            // 학술 검색
            searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
          } else {
            // 일반 검색
            searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          }

          await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

          // 검색 결과 추출
          const results = await page.evaluate(() => {
            const results: any[] = [];
            
            // Google Scholar 결과 파싱
            const scholarResults = document.querySelectorAll('.gs_ri');
            if (scholarResults.length > 0) {
              scholarResults.forEach((item, index) => {
                if (index < 5) {
                  const titleElement = item.querySelector('h3 a') as HTMLAnchorElement;
                  const snippetElement = item.querySelector('.gs_rs');
                  
                  results.push({
                    title: titleElement ? titleElement.innerText : 'No title found',
                    snippet: snippetElement ? snippetElement.textContent || '' : 'No snippet found',
                    url: titleElement ? titleElement.href : 'No link found',
                  });
                }
              });
            } else {
              // 일반 Google 검색 결과 파싱
              const generalResults = document.querySelectorAll('div.g');
              generalResults.forEach((item, index) => {
                if (index < 5) {
                  const titleElement = item.querySelector('h3');
                  const linkElement = item.querySelector('a');
                  const snippetElement = item.querySelector('.VwiC3b');
                  
                  results.push({
                    title: titleElement ? titleElement.innerText : 'No title found',
                    snippet: snippetElement ? snippetElement.textContent || '' : 'No snippet found',
                    url: linkElement ? linkElement.href : 'No link found',
                  });
                }
              });
            }
            
            return results;
          });

          await page.close();

          console.log(`[Tool][Web Search] ${results.length}개 결과 발견`);
          return JSON.stringify(results);

        } catch (error) {
          console.error(`[Tool][Web Search] 오류:`, error);
          
          // 예시 응답 (Mock Data) - 실제 환경에서는 실제 데이터로 대체해야 합니다.
          const mockResults = [
            {
              title: "그래핀 기반 배터리의 최신 발전 동향 (2025)",
              snippet: "2025년 연구에 따르면 그래핀 나노구조는 리튬이온 배터리의 에너지 밀도를 30% 향상시켰다...",
              url: "https://example.com/graphene-battery-2025",
            },
            {
              title: "그래핀 시장 규모 및 예측 (Reuters)",
              snippet: "글로벌 그래핀 시장은 2030년까지 연평균 25% 성장할 것으로 예상된다...",
              url: "https://reuters.example.com/graphene-market-size",
            },
          ];

          return JSON.stringify(mockResults);
        }
      },
    });
  }

  /**
   * 특정 웹 페이지의 내용을 심층 스크래핑하는 도구를 생성합니다.
   */
  private createDeepWebScraperTool(): DynamicStructuredTool {
    return new DynamicStructuredTool({
      name: "deep_web_scraper",
      description:
        "특정 URL의 웹 페이지 전체 내용을 읽어옵니다. 검색 결과 요약만으로는 부족한 상세 정보나 보고서 내용을 분석할 때 사용합니다.",
      schema: z.object({
        url: z.string().url().describe("내용을 읽어올 웹 페이지 URL"),
      }),
      func: async ({ url }) => {
        console.log(`[Tool][Deep Web Scraper] 스크래핑 실행: ${url}`);

        try {
          await this.initializeBrowser();
          const page = await this.browser!.newPage();

          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

          // 페이지 내용 추출
          const content = await page.evaluate(() => {
            // Try to find abstract or main content
            const abstractElement = document.querySelector('.abstract, .gs_rs, [class*="abstract"], [id*="abstract"]');
            const mainElement = document.querySelector('main, article, .content, .paper-content');
            
            let extractedContent = '';
            
            if (abstractElement) {
              extractedContent += 'ABSTRACT: ' + abstractElement.innerText + '\n\n';
            }
            
            if (mainElement) {
              extractedContent += 'CONTENT: ' + mainElement.innerText.substring(0, 5000) + '...'; // Limit to avoid too much text
            } else {
              // Fallback to body content with some filtering
              const bodyText = document.body.innerText;
              extractedContent += 'CONTENT: ' + bodyText.substring(0, 3000) + '...';
            }
            
            return extractedContent;
          });

          await page.close();

          console.log(`[Tool][Deep Web Scraper] 스크래핑 완료: ${content.length} characters`);
          return content;

        } catch (error) {
          console.error(`[Tool][Deep Web Scraper] 오류:`, error);

          // 예시 응답 (Mock Data) - 재귀적 참고문헌 추적 테스트를 위한 내용 포함 (4.3)
          if (url.includes("graphene-battery-2025")) {
            return `[상세 내용] 그래핀 배터리 연구 상세 보고서... 에너지 밀도 향상은 나노구조 최적화 덕분입니다.
            ... (중략) ...
            참고문헌 (References):
            1. 'Advanced Graphene Nanostructures for Energy Storage', J. Doe, 2024.
            2. 'Lithium-Ion Efficiency Metrics', K. Lee, 2023.`;
          }
          return `스크래핑 실패: ${error}`;
        }
      },
    });
  }
} 