/**
 * =====================================================================================
 * DeepResearchAgent.ts
 * 역할: LangGraph를 사용하여 자율적 AI 리서치 에이전트의 상태 머신을 정의하고 실행합니다. (4.1)
 * 책임: 연구의 전체 생명주기(계획, 실행, 추론, 종합)를 관리하고, 동적이고 순환적인 작업 흐름을 조율합니다.
 * =====================================================================================
 */

import { StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { ToolBelt } from "./ToolBelt";
import { MultimodalAIService } from "./MultimodalAIService";
import { SourceStrategyManager, SearchStrategy } from "./SourceStrategy";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";

// --- 1. 상태 정의 (State Definition) (4.1) ---

/**
 * 수집된 데이터 소스 정보
 */
interface SourceData {
  id: number;
  url: string;
  title: string;
  content: string; // 스크래핑되거나 요약된 내용
}

/**
 * 연구 계획 구조
 */
interface ResearchPlan {
  title: string;
  steps: string[]; // 구체적인 실행 단계 및 검색 쿼리 포함
  strategy: SearchStrategy;
}

/**
 * 에이전트 상태 (Agent Status) - 흐름 제어 및 사용자 상호작용 관리에 사용
 */
type AgentStatus =
  | "initializing"
  | "clarifying"
  | "planning"
  | "searching"
  | "reasoning"
  | "synthesizing"
  | "awaiting_clarification" // 사용자 명료화 대기
  | "awaiting_approval" // 사용자 계획 승인 대기
  | "completed"
  | "failed";

/**
 * 그래프의 상태 객체 (ResearchState) (4.1)
 * 그래프의 각 노드를 거치며 업데이트되는 중앙 정보 저장소입니다.
 */
interface ResearchState {
  // 입력 및 기본 정보
  originalQuery: string;
  clarifiedQuery: string;
  domain: string;

  // 계획 단계
  researchPlan: ResearchPlan | null;

  // 실행 및 탐색 단계
  collectedData: SourceData[];
  explorationQueue: string[]; // 재귀적 참고문헌 추적을 위한 큐 (4.3)
  currentDepth: number;
  maxDepth: number;

  // 결과물 및 상호작용
  synthesis: string;
  messages: BaseMessage[]; // 대화 기록

  // 제어 흐름
  agentStatus: AgentStatus;
  internalMonologue: string[]; // 에이전트의 내부 사고 과정 기록 (원칙 3: 투명한 추론)
}

// --- 2. 에이전트 구현 (Agent Implementation) ---

export class DeepResearchAgent {
  private graph: Runnable;
  private toolBelt: ToolBelt;
  private aiService: MultimodalAIService;
  private strategyManager: SourceStrategyManager;
  private readonly MAX_DEPTH = 2; // 재귀적 탐색 최대 깊이 설정 (4.3)

  constructor() {
    this.aiService = new MultimodalAIService();
    this.toolBelt = new ToolBelt();
    // SourceStrategyManager에 추론 엔진 전달
    this.strategyManager = new SourceStrategyManager(this.aiService.getReasoningEngine());
    this.graph = this.buildGraph();
  }

  /**
   * LangGraph를 사용하여 상태 머신을 구축합니다. (4.1)
   */
  private buildGraph(): Runnable {
    // 상태 그래프 정의 및 채널(상태 필드) 설정
    const workflow = new StateGraph<ResearchState>({
      channels: {
        // ResearchState의 모든 필드를 채널로 정의하고 기본값 및 병합 로직(Reducer) 설정
        // 단순 값은 덮어쓰기 (y ?? x)
        originalQuery: { value: (x, y) => y ?? x, default: () => "" },
        clarifiedQuery: { value: (x, y) => y ?? x, default: () => "" },
        domain: { value: (x, y) => y ?? x, default: () => "General" },
        researchPlan: { value: (x, y) => y ?? x, default: () => null },
        currentDepth: { value: (x, y) => y ?? x, default: () => 0 },
        maxDepth: { value: (x, y) => y ?? x, default: () => this.MAX_DEPTH },
        synthesis: { value: (x, y) => y ?? x, default: () => "" },
        agentStatus: { value: (x, y) => y, default: () => "initializing" }, // 상태는 항상 최신 값으로 덮어쓰기

        // 배열 값은 병합 (concat)
        collectedData: { value: (x, y) => x.concat(y ?? []), default: () => [] },
        messages: { value: (x, y) => x.concat(y ?? []), default: () => [] },
        internalMonologue: { value: (x, y) => x.concat(y ?? []), default: () => [] },

        // 큐는 최신 상태로 덮어쓰기 (노드에서 전체 큐를 다시 계산하여 반환)
        explorationQueue: { value: (x, y) => y ?? x, default: () => [] },
      },
    });

    // 2.1. 노드 정의 (Nodes Definition)
    workflow.addNode("clarify_node", this.clarifyNode.bind(this));
    workflow.addNode("plan_node", this.planNode.bind(this));
    workflow.addNode("search_node", this.searchNode.bind(this));
    workflow.addNode("reasoning_node", this.reasoningNode.bind(this));
    workflow.addNode("synthesize_node", this.synthesizeNode.bind(this));

    // 2.2. 엣지 정의 (Edges Definition)
    workflow.setEntryPoint("clarify_node");

    // 명료화 -> 계획 또는 종료(대기)
    workflow.addConditionalEdges("clarify_node", (state: ResearchState) => {
      if (state.agentStatus === "awaiting_clarification") {
        // 사용자 입력을 기다려야 하므로 그래프 실행을 종료합니다. (외부에서 재호출 필요)
        return END;
      }
      return "plan_node";
    });

    // 계획 -> 검색 또는 종료(대기)
    workflow.addConditionalEdges("plan_node", (state: ResearchState) => {
      if (state.agentStatus === "awaiting_approval") {
        // 사용자 승인을 기다려야 하므로 그래프 실행을 종료합니다.
        return END;
      }
      // 계획이 승인되면(planning 상태가 아니면) 검색 실행
      return "search_node";
    });

    // 검색 -> 추론 (항상 이동)
    workflow.addEdge("search_node", "reasoning_node");

    // 추론 -> 검색(순환) 또는 종합 (핵심 루프)
    workflow.addConditionalEdges(
      "reasoning_node",
      (state: ResearchState) => {
        // 추론 노드에서 상태를 'searching'으로 설정했으면 다시 검색 노드로 (순환)
        if (state.agentStatus === "searching") {
          return "search_node";
        }
        // 'synthesizing'으로 설정했으면 종합 노드로
        return "synthesize_node";
      },
    );

    // 종합 -> 종료
    workflow.addEdge("synthesize_node", END);

    return workflow.compile();
  }

  // --- 3. 노드 구현 (Node Implementations) ---

  /**
   * 노드 1: 명료화 (Clarify Node)
   * 역할: 사용자의 질문이 모호한지 판단하고, 필요시 명료화 질문을 생성합니다. (원칙 2: 적극적 명료화)
   */
  private async clarifyNode(state: ResearchState): Promise<Partial<ResearchState>> {
    const monologue: string[] = ["[Clarify] 질문 명확성 분석 중..."];
    const llm = this.aiService.getReasoningEngine();
    const query = state.clarifiedQuery || state.originalQuery;

    // 사용자가 명료화 질문에 응답했는지 확인 (HumanMessage 존재 및 상태 확인)
    if (state.agentStatus === "awaiting_clarification") {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage instanceof HumanMessage) {
            const userResponse = lastMessage.content.toString();
            monologue.push(`[Clarify] 사용자 응답 수신: "${userResponse}". 명료화된 질문으로 업데이트.`);
            // 명료화된 쿼리 생성 (원본 쿼리와 사용자 응답 결합 - 실제로는 LLM을 사용해 정제하는 것이 좋음)
            const clarifiedQuery = `원본 요청: ${state.originalQuery} | 사용자 초점: ${userResponse}`;

            // 분야 식별 (4.2)
            const domain = await this.strategyManager.identifyDomain(clarifiedQuery);
            monologue.push(`[Clarify] 분야 식별 완료: ${domain}. 계획 단계로 이동.`);

            return {
                clarifiedQuery: clarifiedQuery,
                domain: domain,
                agentStatus: "planning", // 다음 단계로 진행
                internalMonologue: monologue,
            };
        }
    }

    // 초기 질문의 모호성 판단
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `당신은 사용자의 연구 요청을 명확하게 만드는 역할을 합니다. (원칙 2 준수). 사용자의 질문을 분석하여 모호성이 있는지 판단하십시오.
        만약 질문이 충분히 구체적이고 명확하여 즉시 연구 계획 수립이 가능하다면, 'CLEAR'라고만 응답하십시오.
        만약 질문이 모호하거나, 광범위하거나, 여러 의미로 해석될 수 있다면, 사용자의 의도를 명확히 하기 위한 1~3가지 옵션을 포함한 후속 질문을 생성하십시오.`],
        ["human", query]
    ]);

    try {
        // 실제 LLM 호출
        const chain = prompt.pipe(llm);
        const response = await chain.invoke({});
        let result = "";
        
        if (typeof response === 'string') {
            result = response.trim();
        } else if (response && typeof response === 'object' && 'content' in response) {
            result = response.content.toString().trim();
        }

        if (result.toUpperCase().startsWith("CLEAR")) {
          // 분야 식별 (4.2)
          const domain = await this.strategyManager.identifyDomain(query);
          monologue.push(`[Clarify] 질문이 명확함. 분야 식별 완료: ${domain}. 계획 단계로 이동.`);
          return {
            clarifiedQuery: query,
            domain: domain,
            agentStatus: "planning",
            internalMonologue: monologue,
          };
        } else {
          monologue.push("[Clarify] 질문이 모호함. 명료화 질문 생성 및 사용자 응답 대기.");
          // 사용자에게 명료화 질문을 보내고 대기 상태로 전환
          return {
            messages: [new AIMessage(result)],
            agentStatus: "awaiting_clarification",
            internalMonologue: monologue,
          };
        }
    } catch (error) {
        console.error("[Clarify] LLM 호출 실패:", error);
        
        // 데모용 Mock 응답 (시나리오 기반)
        let result = "CLEAR";
        // 6번 예시 시나리오 재현
        if (query === "그래핀의 미래는?") {
            result = `질문이 매우 광범위합니다. 어떤 측면에 더 관심이 있으신가요?\nA. 그래핀의 기초 과학적 원리와 한계점\nB. 주요 응용 분야와 시장 전망\nC. 한국의 그래핀 연구개발 정책 현황`;
        }

        if (result.toUpperCase().startsWith("CLEAR")) {
          // 분야 식별 (4.2)
          const domain = await this.strategyManager.identifyDomain(query);
          monologue.push(`[Clarify] 질문이 명확함. 분야 식별 완료: ${domain}. 계획 단계로 이동.`);
          return {
            clarifiedQuery: query,
            domain: domain,
            agentStatus: "planning",
            internalMonologue: monologue,
          };
        } else {
          monologue.push("[Clarify] 질문이 모호함. 명료화 질문 생성 및 사용자 응답 대기.");
          // 사용자에게 명료화 질문을 보내고 대기 상태로 전환
          return {
            messages: [new AIMessage(result)],
            agentStatus: "awaiting_clarification",
            internalMonologue: monologue,
          };
        }
    }
  }

  /**
   * 노드 2: 계획 수립 (Plan Node)
   * 역할: 연구 전략을 적용하고, 구체적인 연구 계획을 생성하며, 사용자 승인을 받습니다. (원칙 3: 투명한 추론)
   */
  private async planNode(state: ResearchState): Promise<Partial<ResearchState>> {
    const monologue: string[] = ["[Plan] 연구 계획 수립 시작."];
    const llm = this.aiService.getReasoningEngine();
    const query = state.clarifiedQuery;
    const strategy = this.strategyManager.getStrategyForDomain(state.domain);

    // 사용자 계획 승인 처리
    if (state.agentStatus === "awaiting_approval") {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage instanceof HumanMessage) {
            const userResponse = lastMessage.content.toString().toLowerCase();
            // 단순 키워드 기반 승인 처리
            if (userResponse.includes("승인") || userResponse.includes("진행") || userResponse.includes("좋아요") || userResponse.includes("yes")) {
                monologue.push("[Plan] 사용자 계획 승인 완료. 검색 실행 단계로 이동.");
                // 초기 탐색 큐 설정 (계획 단계의 검색 쿼리들로 초기화)
                const initialQueue = state.researchPlan!.steps;
                return {
                    agentStatus: "searching",
                    explorationQueue: initialQueue,
                    internalMonologue: monologue,
                };
            } else {
                // 수정 요청 처리 (데모에서는 단순화)
                monologue.push("[Plan] 사용자 수정 요청 접수. 계획을 재수립합니다. (데모: 현재 계획 진행)");
                // 실제로는 사용자 피드백을 반영하여 계획을 수정해야 함.
                return {
                    agentStatus: "searching",
                    explorationQueue: state.researchPlan!.steps,
                    internalMonologue: monologue,
                };
            }
        }
    }

    // 계획 수립 (Structured Output 사용하여 신뢰성 확보)
    const planParser = StructuredOutputParser.fromZodSchema(
        z.object({
            title: z.string().describe("연구의 포괄적인 제목"),
            steps: z.array(z.string()).describe("연구를 위한 3~5개의 구체적인 실행 단계 및 예상 검색 쿼리 목록. 검색 전략(Operators)을 반영해야 함.")
        })
    );

    const planningPrompt = ChatPromptTemplate.fromMessages([
        ["system", `당신은 전문 연구 기획자입니다. (원칙 3 준수). 사용자의 요청과 주어진 전략을 바탕으로 상세한 연구 계획을 수립해야 합니다.
        도메인: {domain}
        전략 (검색 연산자 활용): {operators}
        권장 소스: {sources}

        계획의 각 단계는 구체적인 검색 쿼리나 행동을 포함해야 하며, 주어진 검색 연산자를 적극적으로 활용해야 합니다.
        {format_instructions}`], // JSON 형식 강제
        ["human", `연구 주제: {query}`]
    ]);

    try {
        // 실제 LLM 호출
        const chain = planningPrompt.pipe(llm).pipe(planParser);
        const result = await chain.invoke({
            domain: state.domain,
            operators: strategy.searchOperators.join(", "),
            sources: strategy.primarySources.join(", "),
            query: query,
            format_instructions: planParser.getFormatInstructions(),
        });

        const newPlan: ResearchPlan = {
            title: result.title,
            steps: result.steps,
            strategy: strategy,
        };

        // 사용자에게 계획 제시 (원칙 3)
        monologue.push("[Plan] 연구 계획 초안 생성 완료. 사용자 승인 대기.");
        const planOverview = `다음과 같은 연구 계획을 수립했습니다. 진행할까요? (승인/수정 요청)

**${newPlan.title}**
분야: ${state.domain}

**실행 단계:**
${newPlan.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}
        `;

        return {
            researchPlan: newPlan,
            agentStatus: "awaiting_approval",
            messages: [new AIMessage(planOverview)],
            internalMonologue: monologue,
        };
    } catch (error) {
        console.error("[Plan] 계획 수립 실패:", error);
        
        // 데모용 Mock 계획 생성
        const result = {
            title: "그래핀의 주요 응용 분야 및 시장 전망 연구",
            steps: [
                "검색: graphene applications semiconductor (site:arxiv.org OR site:ieee.org)",
                "검색: graphene battery technology advancements 2025 filetype:pdf",
                "검색: global graphene market size forecast 2030 (site:reuters.com OR site:bloomberg.com)",
                "검색: challenges in graphene mass production mckinsey report",
            ]
        };

        const newPlan: ResearchPlan = {
            title: result.title,
            steps: result.steps,
            strategy: strategy,
        };

        // 사용자에게 계획 제시 (원칙 3)
        monologue.push("[Plan] 연구 계획 초안 생성 완료. 사용자 승인 대기.");
        const planOverview = `다음과 같은 연구 계획을 수립했습니다. 진행할까요? (승인/수정 요청)

**${newPlan.title}**
분야: ${state.domain}

**실행 단계:**
${newPlan.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}
        `;

        return {
            researchPlan: newPlan,
            agentStatus: "awaiting_approval",
            messages: [new AIMessage(planOverview)],
            internalMonologue: monologue,
        };
    }
  }

  /**
   * 노드 3: 검색 실행 (Search Node)
   * 역할: explorationQueue에 있는 항목들을 처리하기 위해 도구(ToolBelt)를 호출하고 정보를 수집합니다.
   */
  private async searchNode(state: ResearchState): Promise<Partial<ResearchState>> {
    const monologue: string[] = [
      `[Search] 검색 실행 시작 (Depth: ${state.currentDepth}). 큐 대기열: ${state.explorationQueue.length}개`,
    ];

    // 큐에서 작업 배치 가져오기 (한 번에 최대 3개 처리)
    const batchSize = 3;
    const currentBatch = state.explorationQueue.slice(0, batchSize);
    const remainingQueue = state.explorationQueue.slice(batchSize);

    if (currentBatch.length === 0) {
        monologue.push("[Search] 실행할 작업이 없습니다. 추론 단계로 이동합니다.");
        // 상태 변경 없이 추론 단계로 이동 (agentStatus는 이미 reasoning_node에서 처리될 것임)
        return {
            internalMonologue: monologue,
        };
    }

    const collectedNewData: SourceData[] = [];
    let dataIdCounter = state.collectedData.length + 1;

    // 배치 작업 실행 (순차 실행하지만, 병렬 실행으로 최적화 가능)
    for (const task of currentBatch) {
        monologue.push(`[Search] 작업 처리 중: ${task.substring(0, 60)}...`);
        try {
            // 간단한 도구 호출 시뮬레이션
            // 실제 환경에서는 ToolBelt의 도구들을 사용해야 함
            
            if (task.includes("battery technology advancements")) {
                // 스크래퍼 결과 시뮬레이션 (참고문헌 포함)
                collectedNewData.push({
                    id: dataIdCounter++,
                    url: "https://example.com/graphene-battery-2025",
                    title: "Deep Dive: Graphene Battery Tech 2025",
                    content: `[상세 내용] 그래핀 배터리 연구 상세 보고서... 참고문헌 (References): 1. 'Advanced Graphene Nanostructures for Energy Storage', J. Doe, 2024.`,
                });
            } else {
                // 검색 결과 시뮬레이션
                collectedNewData.push({
                    id: dataIdCounter++,
                    url: `http://example.com/search?q=${encodeURIComponent(task)}`,
                    title: `Search Result for ${task.substring(0, 20)}`,
                    content: `검색 결과 요약: ${task}에 대한 정보입니다. 그래핀은 높은 전도성을 가집니다.`,
                });
            }

        } catch (error: any) {
            monologue.push(`[Search] 오류 발생: ${error.message}`);
        }
    }

    monologue.push(`[Search] 검색 완료. 새로 수집된 데이터: ${collectedNewData.length}개. 남은 큐: ${remainingQueue.length}개.`);

    return {
      collectedData: collectedNewData,
      explorationQueue: remainingQueue,
      // 검색 후 항상 추론 단계로 이동하도록 설정 (상태는 reasoning_node에서 결정)
      internalMonologue: monologue,
    };
  }

  /**
   * 노드 4: 추론 (Reasoning Node)
   * 역할: 수집된 정보를 평가하고, 정보 격차를 분석하며, 다음 행동(추가 검색, 참고문헌 탐색, 종합)을 결정합니다.
   */
  private async reasoningNode(state: ResearchState): Promise<Partial<ResearchState>> {
    const monologue: string[] = ["[Reasoning] 수집된 정보 평가 및 다음 행동 결정 시작."];

    // 1. 재귀적 참고문헌 추적 (4.3)
    let newReferences: string[] = [];
    if (state.currentDepth < state.maxDepth) {
        newReferences = this.parseReferences(state.collectedData);
        if (newReferences.length > 0) {
            monologue.push(`[Reasoning] 새로운 추적 대상 참고문헌 발견: ${newReferences.length}개.`);
        }
    }

    // 2. 간단한 평가 로직 (데모용)
    const assessment = {
        evaluation: "응용 분야 정보는 충분하나, 시장 규모 데이터의 신뢰성이 부족하고 최신 데이터가 필요함.",
        isSufficient: false,
        additionalTasks: ["검색: verified graphene market size data 2025-2030 financial times"]
    };

    // 데모 시나리오: 최대 깊이에 도달하거나 데이터가 충분하면 완료 처리
    if (state.currentDepth >= state.maxDepth || state.collectedData.length > 6) {
        assessment.isSufficient = true;
        assessment.evaluation = (state.currentDepth >= state.maxDepth) ? "최대 탐색 깊이 도달. 현재 정보로 종합 시작." : "모든 필요한 정보가 충분히 수집됨.";
        assessment.additionalTasks = [];
    }

    monologue.push(`[Reasoning] 평가 결과: ${assessment.evaluation}`);

    // 3. 다음 행동 결정 및 큐 업데이트
    let nextStatus: AgentStatus = "synthesizing"; // 기본값은 종합
    const nextQueue = [...state.explorationQueue];
    let nextDepth = state.currentDepth;

    // 참고문헌 추가 (깊이 제한 내에서)
    if (newReferences.length > 0 && state.currentDepth < state.maxDepth) {
        nextQueue.push(...newReferences);
        nextStatus = "searching";
        nextDepth += 1; // 참고문헌 추적 시 깊이 증가
        monologue.push(`[Reasoning] 참고문헌 추적을 위해 검색 단계로 이동합니다. (Depth: ${nextDepth})`);
    }

    // 정보 불충분 시 추가 작업 추가 (isSufficient가 false이고, 큐에 작업이 아직 없는 경우)
    if (!assessment.isSufficient && nextStatus !== "searching") {
        nextQueue.push(...assessment.additionalTasks);
        nextStatus = "searching";
        monologue.push(`[Reasoning] 정보 불충분. 추가 검색 작업 수행을 위해 검색 단계로 이동합니다.`);
    }

    // 만약 큐에 남은 작업이 있다면 계속 검색 진행
    if (nextQueue.length > 0 && nextStatus === "synthesizing") {
        nextStatus = "searching";
        monologue.push(`[Reasoning] 큐에 남은 작업 처리 위해 검색 단계로 이동합니다.`);
    }

    if (nextStatus === "synthesizing") {
        monologue.push("[Reasoning] 모든 탐색 완료. 종합 단계로 이동합니다.");
    }

    return {
      explorationQueue: nextQueue,
      currentDepth: nextDepth,
      agentStatus: nextStatus, // 이 상태 값에 따라 조건부 엣지가 분기됩니다.
      internalMonologue: monologue,
    };
  }

  /**
   * (4.3) 수집된 데이터에서 참고문헌 섹션을 찾아 파싱합니다. (헬퍼 함수)
   */
  private parseReferences(data: SourceData[]): string[] {
    // 실제 구현에서는 정규 표현식이나 NLP 기술을 사용하여 참고문헌 목록을 정교하게 추출해야 합니다.
    const references: string[] = [];
    data.forEach((d) => {
      // 데모를 위한 단순 키워드 매칭
      if (d.content.includes("참고문헌 (References):")) {
        // 특정 참고문헌이 발견되면 검색 가능한 형태로 변환하여 추가
        if (d.content.includes("'Advanced Graphene Nanostructures for Energy Storage', J. Doe, 2024")) {
          references.push("검색: 'Advanced Graphene Nanostructures for Energy Storage' J. Doe 2024");
        }
      }
    });
    return references;
  }

  /**
   * 노드 5: 보고서 종합 (Synthesize Node)
   * 역할: 수집된 모든 정보를 바탕으로 최종 연구 보고서를 작성합니다. (원칙 1: 진실 기반 - 출처 표기)
   */
  private async synthesizeNode(state: ResearchState): Promise<Partial<ResearchState>> {
    const monologue: string[] = ["[Synthesize] 최종 보고서 작성 시작."];

    // 컨텍스트 구성 및 인용 준비
    const bibliography: string[] = [];
    const context = state.collectedData.map((data) => {
      // 인덱스 대신 데이터 ID를 인용 번호로 사용
      const citationIndex = data.id;
      bibliography.push(`[${citationIndex}] ${data.title}. URL: ${data.url}`);
      return `[Source ${citationIndex}]:\n${data.content}\n\n`;
    }).join('');

    // 데모용 Mock 보고서 생성
    const reportContent = `
# 연구 보고서: 그래핀의 주요 응용 분야 및 시장 전망

## 서론
본 보고서는 그래핀의 핵심 응용 분야와 향후 시장 전망을 분석합니다. 그래핀은 뛰어난 물리적 특성으로 인해 '꿈의 신소재'로 불립니다.[1]

## 본론 1: 핵심 응용 분야
그래핀은 반도체와 배터리 분야에서 주로 연구되고 있습니다.[2] 특히 2025년 배터리 기술 동향 보고서에 따르면, 그래핀은 에너지 밀도를 획기적으로 향상시킬 수 있습니다.[3] 이 연구는 J. Doe의 선행 연구('Advanced Graphene Nanostructures', 2024)에 기반하고 있음을 확인했습니다.[5]

## 본론 2: 시장 전망
글로벌 그래핀 시장은 빠르게 성장할 것으로 예상됩니다.[4] 최신 검증된 데이터에 따르면, 2030년까지 연평균 25%의 성장이 예상되며 시장 규모는 50억 달러에 이를 것입니다.[6]

## 결론
그래핀은 미래 산업의 핵심 동력이 될 잠재력을 가지고 있으나, 상용화를 위한 대량 생산 기술 확보가 중요한 과제입니다.
`;

    const finalReport = reportContent + "\n\n--- 참고문헌 ---\n" + bibliography.join('\n');

    monologue.push("[Synthesize] 보고서 작성 완료.");

    return {
      synthesis: finalReport,
      agentStatus: "completed",
      messages: [new AIMessage(finalReport)],
      internalMonologue: monologue,
    };
  }

  // --- 4. 실행 인터페이스 (Public Interface) ---

  /**
   * 에이전트를 실행하거나 재개합니다. (스트리밍 방식 지원)
   * @param input 사용자의 입력 (초기 질문 또는 후속 답변)
   * @param previousState 이전 상태 (대화 재개 시 필요, 명료화/승인 대기 시 재진입용)
   */
  public async run(input: string, previousState?: ResearchState): Promise<ResearchState> {
    let currentState: Partial<ResearchState>;

    if (previousState) {
      // 이전 상태에서 재개 (사용자 응답 처리)
      currentState = {
        ...previousState,
        // 사용자의 최신 입력을 HumanMessage로 추가
        messages: [...previousState.messages, new HumanMessage(input)],
        // 새로운 실행 주기를 위해 내부 사고 과정 초기화
        internalMonologue: [],
      };
    } else {
      // 처음 시작하는 경우 초기 상태 설정
      currentState = {
        originalQuery: input,
        agentStatus: "initializing",
        messages: [], // 초기 메시지는 노드에서 추가됨
        // 기타 필드 초기화...
      };
    }

    console.log("\n🚀 === Deep Research Agent 실행 시작 === 🚀\n");

    let finalState: ResearchState = currentState as ResearchState;

    try {
        // LangGraph 실행 (스트리밍 방식으로 중간 상태 확인)
        for await (const output of await this.graph.stream(currentState, {
          recursionLimit: 20, // 순환 루프 최대 횟수 제한 (무한 루프 방지)
        })) {
          // output은 { nodeName: stateUpdate } 형태입니다.
          const nodeName = Object.keys(output)[0];
          const stateUpdate = output[nodeName];

          if (nodeName !== END && stateUpdate) {
            console.log(`\n🔄 >>> 노드 실행 완료: ${nodeName} | 상태: ${stateUpdate.agentStatus}`);

            // 내부 사고 과정 출력 (원칙 3: 투명성 원칙)
            if (stateUpdate.internalMonologue && stateUpdate.internalMonologue.length > 0) {
                console.log("🧠 [내부 사고 과정]");
                console.log(stateUpdate.internalMonologue.join("\n"));
            }

            // 상태 누적 (LangGraph가 내부적으로 처리하지만, 최종 상태 추적을 위해 저장)
            finalState = { ...finalState, ...stateUpdate };

            // 사용자 대기 상태 시 루프 중단
            if (["awaiting_clarification", "awaiting_approval"].includes(finalState.agentStatus)) {
                console.log("\n🛑 <<< 사용자 응답 대기 중... >>>\n");
                break;
            }
          }
        }
    } catch (error) {
        console.error("❌ LangGraph 실행 중 오류 발생:", error);
        finalState.agentStatus = "failed";
        finalState.messages.push(new AIMessage(`오류 발생: ${error}`));
    }

    console.log("\n🏁 === Deep Research Agent 실행 종료 === 🏁\n");
    return finalState;
  }

  /**
   * 리소스 정리
   */
  public async cleanup(): Promise<void> {
    await this.toolBelt.closeBrowser();
  }
} 