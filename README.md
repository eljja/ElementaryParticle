# Subatomic Particle Database & Simulation Physics Engine

이 프로젝트는 표준 모형(Standard Model)의 모든 입자들과 최신 현대 물리학 이론에서 예측/추정하는 다양한 **표준 모형 외 가상 입자(BSM, Beyond the Standard Model)**들의 완전한 특성(질량, 전하, 스핀, 칼라 전하, 다양한 양자수, 붕괴 모드 및 수명)을 수집하고 체계적으로 데이터베이스화한 물리 컴퓨팅 패키지입니다.

기존 데이터베이스와 Python 계산 엔진을 넘어, 누구나 웹 브라우저에서 편리하게 입자 정보를 탐색하고 직접 붕괴 및 충돌 반응을 검증할 수 있는 **상호작용형 웹 UI 시뮬레이터(Web UI Simulator)**가 완벽하게 내장되어 있습니다.

---

## 🚀 1. 주요 제공 기능

### ① 정밀 물리 데이터베이스 (`particles.json`)
표준 모형 입자 및 반입자 31종과 BSM 가상 입자 13종을 포함하여 **총 44종의 정밀 데이터**를 구축하였습니다.
- 질량 ($MeV/c^2$, PDG 최신 정밀 상수 기준)
- 전기 전하 ($Q$), 스핀 ($J$), 바리온 수 ($B$), 자기 전하 (Magnetic charge, BSM용)
- 세대별(맛깔별) 렙톤 수 ($L_e, L_\mu, L_\tau$)
- 약한 아이소스핀 ($T_3$), 약한 하이퍼차지 ($Y_W$)
- 강력의 색전하 상태 (글루온의 8가지 Color-Octet 상태 정의 포함)
- 평균 수명 ($\tau$, 초 단위), 붕괴 폭 ($\Gamma$, GeV 단위) 및 분기비가 반영된 붕괴 채널

### ② 객체 지향 Python 물리 엔진 API (`database/particles.py`)
- `Particle` 객체 모델링 및 페르미온/보손 자동 판별 기능.
- **반입자 물리 대칭성(CPT) 전수 검사**: 두 입자가 서로 완벽한 켤레 공액(Conjugate) 관계에 있는지 확인합니다.
- **반응성 물리 법칙 오디터**: 임의의 반응(붕괴, 충돌)에 대해 *전하, 바리온수, 맛깔별 렙톤수, 자기전하, 에너지-질량 장벽* 보존 여부를 100% 정밀 판정합니다.

### ③ 시각적인 웹 UI 시뮬레이터 (`index.html`, `style.css`, `app.js`)
- **글래스모피즘(Glassmorphism) 기반 다크 네온 테마**: 극도로 현대적이고 세련된 이론 물리학 포털 스타일링.
- **소립자 격자판(Periodic Table Grid)**: 쿼크, 렙톤, 게이지 보손, 힉스 및 BSM 입자를 터치 한 번으로 양자 특성과 붕괴 모드를 즉시 확인.
- **반입자 토글러**: 한 번의 스위치로 모든 입자를 반입자 모드로 대칭 반전하여 시각화.
- **충돌 및 붕괴 시뮬레이터 슬롯**: 드래그/클릭으로 반응물(Reactants)과 생성물(Products)을 조합.
- **Canvas 물리 궤적 비주얼라이저**: 반응식을 구동하면 입자의 물리적 특성(전하, 질량, 스핀 등)을 바탕으로 안개상자(Bubble Chamber) 검출기 궤적을 2D 애니메이션으로 렌더링합니다:
  - **양전하 입자**: 전자기장 내에서 반시계 방향으로 나선형(Helix) 궤적을 그리며 휨.
  - **음전하 입자**: 시계 방향으로 나선형 궤적을 그리며 휨.
  - **중성 입자 (중성미자, LSP 등)**: 검출기에 잡히지 않는 점선으로 곧게 뻗어나감.
  - **광자 및 게이지 보손**: 사인파 파동 형태의 특이 궤적 렌더링.
  - **물리 법칙 위반 반응**: 검출기 중앙에서 붉은 경보 스파크와 함께 경고 출력.

---

## 🌐 2. 웹 UI 구동 및 GitHub Pages 호스팅 방법

### 방법 A. 로컬에서 바로 실행하기
서버 구동 없이 `index.html` 파일을 웹 브라우저(Chrome, Safari, Edge 등)로 더블 클릭하여 즉시 대화형 시뮬레이터를 구동할 수 있습니다. 

### 방법 B. GitHub Pages로 웹에 배포하기 (`github.io`)
본 리포지토리는 GitHub Pages와 연동되어 푸시되는 즉시 전 세계 어디서나 웹으로 접속할 수 있는 구조입니다.
1. 이 프로젝트의 모든 파일(루트의 `index.html`, `style.css`, `app.js`, `particles.json` 포함)을 원격 저장소(`main` 브랜치)로 푸시합니다.
2. 해당 GitHub 저장소 웹사이트(`https://github.com/eljja/ElementaryParticle`)로 이동합니다.
3. **Settings (설정)** &rarr; **Pages** 메뉴로 이동합니다.
4. Build and deployment에서 Branch를 **`main`** (또는 `/root`)으로 선택하고 **Save**를 누릅니다.
5. 약 1~2분 후, 다음 주소를 통해 전 세계 사용자에게 퍼블리싱됩니다:
   👉 **`https://eljja.github.io/ElementaryParticle/`**

---

## 💻 3. Python API 및 단위 테스트 실행 방법

### 로컬 테스트 환경 설정
- Python 3.8 이상 필요

### 1) 단위 테스트 (물리 법칙 보존 상태 검사)
데이터베이스에 저장된 입자들이 물리적으로 모순이 없고, 반입자 대칭성이 무결한지 엄격하게 검사합니다.
```powershell
python -m pytest tests/
```

### 2) 터미널 데모 CLI 구동
터미널에서 텍스트 기반으로 입자 사전을 열람하고 반응을 감사해보려면 아래의 스크립트를 구동합니다.
```powershell
python demo.py
```

### 3) Python 시뮬레이션 활용 예시
```python
from database import ParticleDatabase

db = ParticleDatabase()

# 뮤온 붕괴 반응 법칙 보존 검사
result = db.verify_reaction(
    reactants=["mu-"], 
    products=["e-", "anti_nu_e", "nu_mu"]
)

if result["is_physically_allowed"]:
    print("✓ 물리적으로 가능함!")
else:
    print("✗ 불가능함:", result["conservations"])
```
