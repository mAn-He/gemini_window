import { chromium, Browser, Page } from 'playwright';

export interface ResearchResult {
  source: string;
  content: string;
}

export interface PaperInfo {
  title: string;
  link: string;
  snippet: string;
}

export interface DetailedPaperInfo extends PaperInfo {
  fullContent?: string;  // The actual content from the paper
  abstract?: string;     // Extracted abstract
}

class DeepResearchService {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch();
    console.log('DeepResearchService initialized with Playwright.');
  }

  public async searchGoogleScholar(query: string): Promise<PaperInfo[]> {
    if (!this.browser) {
      throw new Error('Deep Research Service not initialized.');
    }
    
    const page = await this.browser.newPage();
    try {
      const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl);
      
      // Wait for the results to load
      await page.waitForSelector('.gs_ri');

      const papers = await page.evaluate(() => {
        const results: PaperInfo[] = [];
        const items = document.querySelectorAll('.gs_ri');
        // Get top 5 results
        items.forEach((item, index) => {
          if (index < 5) { 
            const titleElement = item.querySelector('h3 a') as HTMLAnchorElement;
            const snippetElement = item.querySelector('.gs_rs');
            
            results.push({
              title: titleElement ? titleElement.innerText : 'No title found',
              link: titleElement ? titleElement.href : 'No link found',
              snippet: snippetElement ? snippetElement.textContent || '' : 'No snippet found'
            });
          }
        });
        return results;
      });

      console.log(`Found ${papers.length} papers on Google Scholar for query: "${query}"`);
      return papers;

    } catch (error) {
      console.error('Error searching Google Scholar:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  public async getDetailedPaperContent(paper: PaperInfo): Promise<DetailedPaperInfo> {
    if (!this.browser) {
      throw new Error('Deep Research Service not initialized.');
    }

    const page = await this.browser.newPage();
    try {
      console.log(`Attempting to fetch full content from: ${paper.link}`);
      
      // Try to access the paper's full page
      await page.goto(paper.link, { waitUntil: 'domcontentloaded', timeout: 10000 });
      
      // Extract text content from the page
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

      return {
        ...paper,
        fullContent: content,
        abstract: content.includes('ABSTRACT:') ? content.split('ABSTRACT:')[1].split('\n\n')[0] : undefined
      };

    } catch (error) {
      console.log(`Failed to fetch detailed content from ${paper.link}: ${error}`);
      // Return the original paper info if we can't get detailed content
      return { ...paper };
    } finally {
      await page.close();
    }
  }

  public async performDeepPaperAnalysis(papers: PaperInfo[]): Promise<DetailedPaperInfo[]> {
    console.log(`Performing deep analysis on ${papers.length} papers...`);
    const detailedPapers: DetailedPaperInfo[] = [];
    
    // Process papers one by one to avoid overwhelming the browser
    for (const paper of papers) {
      try {
        const detailedPaper = await this.getDetailedPaperContent(paper);
        detailedPapers.push(detailedPaper);
        
        // Small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing paper ${paper.title}:`, error);
        detailedPapers.push({ ...paper }); // Add original paper info on error
      }
    }
    
    return detailedPapers;
  }

  // The old performResearch is no longer needed in this new flow.
  // We can remove or deprecate it. For now, let's keep it but it won't be used.
  async performResearch(query: string, targetUrl: string): Promise<ResearchResult> {
    if (!this.browser) {
      throw new Error('Deep Research Service not initialized.');
    }

    let fullUrl = targetUrl;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
      console.log(`URL protocol missing. Prepended "https://". New URL: ${fullUrl}`);
    }

    const page: Page = await this.browser.newPage();
    try {
      await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });

      // This is a generic content extraction method.
      // For specific sites (e.g., official docs), we can write more robust selectors.
      const content = await page.evaluate(() => {
        // Try to find the main content area, otherwise fallback to body
        const mainContent = document.querySelector('main, article, #main, #content');
        return mainContent ? mainContent.innerText : document.body.innerText;
      });

      console.log(`Successfully scraped content from ${targetUrl}`);

      return {
        source: targetUrl,
        content: content.trim().substring(0, 10000) // Limit content size for API
      };
    } catch (error) {
      console.error(`Failed to perform research for ${targetUrl}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default new DeepResearchService(); 