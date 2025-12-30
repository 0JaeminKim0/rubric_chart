# Task Scoring System - Ease vs Impact 4-Quadrant Analysis

LLM 기반 과제 점수화 및 4사분면 버블 차트 의사결정 시스템

## Project Overview

- **Name**: Task Scoring System
- **Goal**: 사용자가 정의한 Rubric을 기반으로 LLM(GPT-4o)이 과제 점수를 산출하고, 4사분면 버블 차트로 시각화하여 의사결정 지원
- **Features**:
  - Excel(.xlsx) 파일 업로드로 과제 목록 인식
  - 사용자 정의 Rubric (Ease/Impact 각 1-5점 기준)
  - LLM 기반 자동 점수 산정 (Score-only, 설명 없음)
  - 4사분면 버블 차트 시각화 (ECharts)
  - Human Override - 사용자 점수 수정 및 실시간 반영
  - 결과 Excel 내보내기

## Live URLs

- **Sandbox Preview**: https://3000-i5kktk7ww2qfhyqkndr3k-de59bda9.sandbox.novita.ai
- **API Health Check**: https://3000-i5kktk7ww2qfhyqkndr3k-de59bda9.sandbox.novita.ai/api/health

## Data Architecture

### Data Models
- **Task**: task_id, task_name, description
- **LLM_Score**: task_id, x_score_llm, y_score_llm, model_version, created_at
- **Final_Score**: task_id, x_score_final, y_score_final, human_override, updated_at

### Evaluation Framework
- **X축 (Ease of Implementation)**: 구현 용이성 (1=매우 어려움 ~ 5=매우 쉬움)
- **Y축 (Impact of Implementation)**: 구현 영향력 (1=최소 영향 ~ 5=변혁적 영향)
- **기준선**: X=3, Y=3

### 4사분면 정의
| 사분면 | 조건 | 설명 |
|--------|------|------|
| Quick Wins | X≥3, Y≥3 | 쉽고 영향력 큼 - 우선 추진 |
| Major Projects | X<3, Y≥3 | 어렵지만 영향력 큼 - 전략적 추진 |
| Fill-ins | X≥3, Y<3 | 쉽지만 영향력 작음 - 여유시 추진 |
| Thankless Tasks | X<3, Y<3 | 어렵고 영향력 작음 - 재검토 필요 |

## User Guide

### Step 1: Upload Tasks
1. Excel 파일(.xlsx) 준비
   - 필수 컬럼: `과제명` (또는 task_name, name, title 등)
   - 선택 컬럼: `과제 설명` (또는 description 등)
2. 파일을 드래그 앤 드롭하거나 클릭하여 업로드
3. 최대 42개 과제 지원

### Step 2: Define Rubric
1. **Ease of Implementation (X)** 각 점수(1-5)의 의미 정의
   - 예: 1="12개월 이상, 신기술 필요", 5="1개월 미만, 빠른 적용"
2. **Impact of Implementation (Y)** 각 점수(1-5)의 의미 정의
   - 예: 1="1% 미만 개선", 5="30% 이상 개선"

### Step 3: Run LLM Scoring
1. "Run LLM Scoring" 버튼 클릭
2. LLM이 각 과제를 Rubric 기준으로 평가
3. 점수만 반환 (설명/추론 없음)

### Step 4: Analyze & Override
1. 버블 차트에서 과제 분포 확인
2. 버블 클릭으로 상세 패널 열기
3. 필요시 슬라이더로 점수 수정 (Human Override)
4. 수정 즉시 차트에 반영
5. "Reset to LLM Score" 버튼으로 원래 점수 복구 가능

### Export
- **Export Chart**: PNG 이미지로 차트 내보내기
- **Export Data**: Excel 파일로 모든 점수 데이터 내보내기

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | 메인 애플리케이션 페이지 |
| `/api/parse-excel` | POST | Excel 파일 파싱 |
| `/api/template` | GET | 샘플 Excel 템플릿 다운로드 |
| `/api/score` | POST | LLM 점수 산정 |
| `/api/health` | GET | 헬스 체크 |

### Score API Request
```json
{
  "taskId": "uuid",
  "taskName": "신규 AI 플랫폼 구축",
  "taskDescription": "AI 기반 의사결정 지원 시스템",
  "rubric": {
    "X": { "1": "...", "2": "...", "3": "...", "4": "...", "5": "..." },
    "Y": { "1": "...", "2": "...", "3": "...", "4": "...", "5": "..." }
  }
}
```

### Score API Response
```json
{
  "X": 4,
  "Y": 2
}
```

## Tech Stack

- **Framework**: Hono (Edge-first web framework)
- **Runtime**: Cloudflare Workers / Pages
- **Visualization**: ECharts 5.x
- **Styling**: Tailwind CSS
- **Excel Parsing**: SheetJS (xlsx)
- **LLM**: OpenAI GPT-4o

## Deployment

### Platform
- **Target**: Cloudflare Pages
- **Status**: ✅ Active (Sandbox)

### Environment Variables
```
OPENAI_API_KEY=your-api-key
```

### Local Development
```bash
npm install
npm run build
npm run dev:sandbox
```

### Production Deployment
```bash
npm run deploy:prod
```

## Design Principles

1. **평가 축은 고정** - Ease (X) vs Impact (Y)
2. **점수 의미는 사용자 정의** - 매 세션마다 Rubric 입력
3. **LLM은 숫자만 출력** - 설명/추론 금지
4. **LLM 점수는 초기 추천값** - 참고용
5. **사용자 수정이 최종값** - Human-in-the-loop

## Success Metrics

- LLM 점수 산정 성공률 ≥ 95%
- 사용자 점수 수정률 ≤ 40%
- 평가 소요 시간 기존 대비 ≥ 70% 단축

## Last Updated

2025-12-30
