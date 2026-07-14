# Game Jam Prototype 협업 가이드

팀원들이 각자 아이디어를 별도 프로토타입으로 만들고 비교할 수 있도록 하는 작업 규칙입니다.

## 공유 저장소

- 저장소: https://github.com/seungchanhonggs/GameJam-August-Prep
- 현재 플레이테스트: https://seungchanhonggs.github.io/GameJam-August-Prep/rotation-v2-prototype/
- 기존 피봇 버전: https://seungchanhonggs.github.io/GameJam-August-Prep/pivot-prototype/

## 시작하기

```bash
git clone https://github.com/seungchanhonggs/GameJam-August-Prep.git
cd GameJam-August-Prep
python3 -m http.server 5176
```

브라우저에서 `http://127.0.0.1:5176/`를 엽니다.

## 각자 작업하는 방법

1. `main`에서 작업 브랜치를 새로 만듭니다.

```bash
git switch main
git pull
git switch -c prototype/<이름>
```

2. 기존 프로토타입 폴더를 덮어쓰지 말고 새 폴더를 사용합니다.

```text
<이름>-prototype/
  index.html
  styles.css
  game.js
  README.md
```

3. 본인 폴더의 `README.md`에 조작법, 핵심 가설, 확인할 플레이테스트 질문을 적습니다.
4. 작업이 끝나면 브랜치를 푸시하고 Pull Request를 생성합니다.

```bash
git add <이름>-prototype/
git commit -m "Add <이름> prototype"
git push -u origin prototype/<이름>
```

## 보존해야 하는 폴더

- `pivot-prototype/`: 전방 1열 비교 버전
- `rotation-v2-prototype/`: 현재 360도 회전 버전

두 폴더는 비교 기준이므로 삭제하거나 다른 아이디어로 덮어쓰지 않습니다.

## 비교를 쉽게 만드는 최소 기준

- 휴대폰 세로 화면에서 조작 가능
- 시작 방법과 재시작 방법 표시
- 핵심 조작을 한 문장으로 설명
- 밸런스 수치를 코드 상단 또는 별도 패널에 모아두기
- 콘솔 오류 없이 실행
- 변경한 가설과 플레이테스트 결과를 README에 기록
