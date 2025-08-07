# Gemini Desktop

**AI-Powered Research Assistant with Deep Research, Canvas & MCP Support**

A sophisticated Electron application that brings Google's Gemini AI to the desktop with advanced research capabilities. Built with React, TypeScript, and Gemini 2.5 AI models for professional research workflows.

## 🎯 최종 목표 (Final Goals)

### 🚀 Vision: 차세대 AI 연구 플랫폼
> "Google Gemini의 강력함을 데스크톱에서 완전히 활용할 수 있는 통합 연구 환경 구축"

### 📋 Core Objectives

#### 🧠 **Advanced Deep Research System**
- **다면적 정보 수집**: 학술 논문 + 정부 자료 + 기업 보고서 + 신뢰성 있는 언론
- **분야별 특화 검색**: 경제학, 기술, 헬스케어, 정책 등 도메인별 최적화
- **AI 기반 신뢰도 평가**: 소스별 신뢰도 자동 스코어링 시스템
- **실시간 팩트체킹**: 정보 검증 및 상충하는 데이터 명시

#### 🎨 **Professional Canvas Integration**
- **시각적 사고 도구**: 마인드맵, 플로우차트, 다이어그램 생성
- **AI 협업**: Gemini와 함께하는 실시간 시각적 브레인스토밍
- **프로젝트 관리**: 연구 결과를 시각적으로 구조화

#### 🔗 **MCP (Model Context Protocol) Ecosystem**
- **확장 가능한 플러그인**: 외부 도구 및 서비스 통합
- **API 생태계**: 써드파티 개발자를 위한 확장 인터페이스
- **워크플로우 자동화**: 복잡한 연구 프로세스 자동화

#### 🌐 **Enterprise-Ready Features**
- **팀 협업**: 연구 결과 실시간 공유 및 협업
- **보안 강화**: 기업급 데이터 보호 및 접근 제어
- **클라우드 동기화**: 다중 디바이스 연구 환경 동기화
- **API 통합**: 기업 내부 시스템과의 seamless 연동

---

## 📊 현재 진행 상황 (Current Progress)

### ✅ **완료된 기능 (Completed Features)**

#### 🤖 **Core AI System**
- [x] **Gemini 2.5 Pro/Flash 모델 통합**: 실시간 모델 전환
- [x] **멀티모달 파일 처리**: PDF, DOCX, PPTX, 이미지 분석
- [x] **실시간 스트리밍**: 응답 생성 과정 시각화

#### 🔬 **Deep Research Engine v1.0**
- [x] **5단계 연구 파이프라인**: Planning → Query Refinement → Information Gathering → Deep Analysis → Synthesis
- [x] **Google Scholar 통합**: 학술 논문 자동 검색 및 내용 추출
- [x] **웹 스크래핑 엔진**: Playwright 기반 안정적인 데이터 수집
- [x] **진행 상황 추적**: 사용자 친화적인 연구 진행 시각화

#### 🎨 **Modern Desktop UI**
- [x] **반응형 인터페이스**: Framer Motion 애니메이션
- [x] **다크 테마**: 눈에 편한 전문가용 UI
- [x] **파일 첨부**: 드래그앤드롭 지원

#### 💾 **Data Management**
- [x] **로컬 데이터베이스**: SQLite 기반 설정 저장
- [x] **IPC 통신**: 안전한 프로세스 간 통신

### 🚧 **개발 진행 중 (In Development)**

#### 📈 **Deep Research v2.0 (Phase 1 - 1-2주)**
- [ ] **다중 소스 통합**: 정부 사이트, 언론사 크롤링 추가
  - 🏛️ 정부/공공기관: 한국(정부24, 기재부), 미국(백악관, 연준), 국제기구(IMF, WHO)
  - 📰 신뢰성 언론: 로이터, 블룸버그, 연합뉴스, WSJ
  - 🏢 기업 공식자료: 테크 기업 IR, 컨설팅 보고서
- [ ] **분야별 검색 전략**: 경제학, 기술, 헬스케어 특화 로직
- [ ] **기본 캐싱 시스템**: 검색 결과 로컬 저장

#### ⚡ **성능 최적화 (Phase 2 - 1-2개월)**
- [ ] **병렬 처리**: 논문 분석 동시 실행
- [ ] **신뢰도 평가**: 소스별 credibility 스코어링
- [ ] **대화형 UI**: 단계별 사용자 피드백

### 🔮 **향후 계획 (Future Roadmap)**

#### 🎨 **Canvas Integration (Phase 3 - 3-6개월)**
- [ ] **시각적 연구 도구**: 마인드맵, 다이어그램 생성
- [ ] **AI 협업 캔버스**: Gemini와 실시간 시각적 브레인스토밍
- [ ] **프로젝트 워크스페이스**: 연구 결과 시각적 구조화

#### 🔗 **MCP Integration (Phase 4 - 6-12개월)**
- [ ] **플러그인 아키텍처**: 확장 가능한 모듈 시스템
- [ ] **외부 도구 연동**: Notion, Obsidian, Zotero 통합
- [ ] **API 생태계**: 써드파티 개발자 지원

#### 🌐 **Enterprise Features (Phase 5 - 12-18개월)**
- [ ] **팀 협업**: 실시간 연구 결과 공유
- [ ] **클라우드 동기화**: 다중 디바이스 지원
- [ ] **기업 보안**: SSO, 접근 제어, 감사 로그

---

## 🛠️ 기술 스택 (Tech Stack)

### **Frontend**
- React 18 + TypeScript
- Tailwind CSS + Framer Motion
- Electron Renderer Process

### **Backend** 
- Electron Main Process + Node.js
- Google Generative AI SDK (Gemini 2.5)
- Playwright (Web Scraping)
- SQLite3 (Local Database)

### **Development**
- Electron Vite (Build Tool)
- ESLint + Prettier (Code Quality)
- Electron Builder (Packaging)

---

## 🚀 빠른 시작 (Quick Start)

### 📋 필수 요구사항
- Node.js 18+
- Google Generative AI API 키
- Git

### 🔧 설치 및 실행
```bash
# 저장소 클론
git clone https://github.com/your-username/gemini-desktop.git
cd gemini-desktop

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 입력

# 개발 모드 실행
npm run dev

# 프로덕션 빌드
npm run build

# 배포용 패키징
npm run package
```

### 🔑 환경 설정
`.env` 파일 생성:
```env
GEMINI_API_KEY=your-google-ai-api-key-here
```

---

## 📊 성과 지표 (Performance Metrics)

### 🎯 **목표 지표**
- **검색 소스**: 현재 1개 → 목표 20+ 개
- **검색 정확도**: 현재 70% → 목표 90%+
- **응답 속도**: 현재 30초 → 목표 15초
- **사용자 만족도**: 목표 4.5/5.0

### 📈 **현재 달성도**
- ✅ **핵심 AI 기능**: 100% 완료
- ✅ **Deep Research v1.0**: 100% 완료  
- 🚧 **다중 소스 통합**: 20% 진행
- 📋 **Canvas 기능**: 계획 수립 완료
- 📋 **MCP 통합**: 설계 진행 중

---

## 🤝 기여하기 (Contributing)

### 🎯 기여 방향
1. **Deep Research 소스 확장**: 새로운 신뢰성 있는 데이터 소스 추가
2. **UI/UX 개선**: 사용자 경험 향상 아이디어
3. **성능 최적화**: 검색 속도 및 정확도 개선
4. **버그 리포트**: 이슈 발견 시 상세한 리포트 제출

### 📝 개발 가이드라인
- TypeScript 엄격 모드 준수
- Prettier + ESLint 설정 사용
- 컴포넌트 단위 테스트 작성
- 명확한 커밋 메시지 작성

---

## 📄 라이선스 (License)

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

---

## 📞 연락처 (Contact)

- **이슈 리포트**: [GitHub Issues](https://github.com/your-username/gemini-desktop/issues)
- **기능 제안**: [GitHub Discussions](https://github.com/your-username/gemini-desktop/discussions)
- **이메일**: your-email@example.com

---

## 🏆 크레딧 (Credits)

### 🙏 **Special Thanks**
- Google AI Team for Gemini API
- Electron Team for the amazing framework
- React & TypeScript communities
- Open source contributors

---

*"AI와 함께하는 미래의 연구, 지금 시작하세요."*

**Made with ❤️ by Gemini Desktop Team** 