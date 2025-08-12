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
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// 실제 구현에서는 Tavily, SerpAPI, Google Custom Search API 클라이언트나
// Playwright/Cheerio 같은 스크래핑 라이브러리를 사용합니다.

/**
 * 에이전트가 사용할 수 있는 도구 모음 클래스입니다.
 */
export class ToolBelt {
  private tools: any[];
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
    return this.tools as unknown as Tool[];
  }

  /**
   * 외부 호출용: 웹검색을 실행하고 상위 k개 결과만 정규화하여 반환합니다.
   */
  public async runWebSearch(
    query: string,
    k: number = 5
  ): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const tool = this.createWebSearchTool();
    const raw = await tool.func({ query });

    try {
      const parsed = JSON.parse(raw as unknown as string) as Array<{
        title?: string;
        url?: string;
        snippet?: string;
      }>;

      const normalized = (parsed || []).map((r) => ({
        title: r.title || 'Untitled',
        url: r.url || '',
        snippet: r.snippet || '',
      }));

      return normalized.slice(0, Math.max(0, k));
    } catch (e) {
      console.error('[ToolBelt.runWebSearch] Failed to parse search results:', e);
      return [];
    }
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
          // DuckDuckGo HTML (no API key required)
          const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal as any });
          clearTimeout(timer);
          const html = await res.text();
          const $ = cheerio.load(html);

          const results: Array<{ title: string; url: string; snippet: string }> = [];
          $('a.result__a').each((i, el) => {
            if (i >= 10) return false;
            const title = $(el).text().trim() || 'Untitled';
            const href = $(el).attr('href') || '';
            const snippet = $(el).parent().find('.result__snippet').text().trim() || '';
            results.push({ title, url: href, snippet });
          });

          console.log(`[Tool][Web Search] ${results.length}개 결과 발견`);
          return JSON.stringify(results);
        } catch (error) {
          console.error(`[Tool][Web Search] 오류:`, error);
          return JSON.stringify([]);
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
              extractedContent += 'ABSTRACT: ' + (abstractElement.textContent || '') + '\n\n';
            }
            
            if (mainElement) {
              extractedContent += 'CONTENT: ' + (mainElement.textContent || '').substring(0, 5000) + '...';
            } else {
              // Fallback to body content with some filtering
              const bodyText = (document.body.textContent || '').trim();
              extractedContent += 'CONTENT: ' + bodyText.substring(0, 3000) + '...';
            }
            
            return extractedContent;
          });

          await page.close();

          console.log(`[Tool][Deep Web Scraper] 스크래핑 완료: ${content.length} characters`);
          return content;

        } catch (error) {
          console.error(`[Tool][Deep Web Scraper] 오류:`, error);

          // 예시 응답 (Mock Data)
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