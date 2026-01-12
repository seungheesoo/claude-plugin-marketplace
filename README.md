# Claude Plugin Marketplace Test

로컬 개발 환경에서 Claude Code 플러그인을 관리하는 마켓플레이스 서버입니다.

## 서버 시작

```bash
npm start
```

서버가 시작되면 `http://localhost:4874`에서 접속할 수 있습니다.

## 마켓플레이스 등록

Claude Code에서 이 마켓플레이스를 등록하려면:

```bash
# 로컬 환경
/plugin marketplace add http://localhost:4874

# 네트워크 환경 (다른 PC에서 접속 시)
/plugin marketplace add http://<서버-IP>:4874
```

## 플러그인 설치

마켓플레이스 등록 후, 플러그인을 설치합니다:

```bash
claude plugin install <플러그인명>@claude-plugin-marketplace-test
```

## 웹 UI

브라우저에서 `http://localhost:4874`에 접속하면 웹 UI를 통해:
- 플러그인 목록 확인
- Git URL로 플러그인 추가
- 플러그인 업데이트/삭제
- Commands/Skills 목록 확인

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/marketplace` | 마켓플레이스 정보 |
| GET | `/api/plugins` | 플러그인 목록 |
| GET | `/api/plugins/:name` | 플러그인 상세 정보 |
| POST | `/api/plugins` | Git URL로 플러그인 추가 |
| POST | `/api/plugins/:name/update` | 플러그인 업데이트 (git pull) |
| DELETE | `/api/plugins/:name` | 플러그인 삭제 |

## 플러그인 추가 (Git URL)

웹 UI의 "Add Plugin" 버튼을 사용하거나, API를 직접 호출할 수 있습니다:

```bash
# 기본 사용법 (플러그인 이름은 URL에서 자동 추출)
curl -X POST http://localhost:4874/api/plugins \
     -H "Content-Type: application/json" \
     -d '{"gitUrl": "https://github.com/user/my-plugin.git"}'

# 이름과 설명 지정
curl -X POST http://localhost:4874/api/plugins \
     -H "Content-Type: application/json" \
     -d '{
       "gitUrl": "https://github.com/user/my-plugin.git",
       "name": "custom-name",
       "description": "플러그인 설명"
     }'
```

## 플러그인 업데이트

```bash
curl -X POST http://localhost:4874/api/plugins/my-plugin/update
```

## 플러그인 삭제

```bash
curl -X DELETE http://localhost:4874/api/plugins/my-plugin
```

## 플러그인 구조

Git 저장소는 다음 구조를 따라야 합니다:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── my-command.md
└── skills/           (선택)
    └── my-skill/
        └── SKILL.md
```

### plugin.json 예시

```json
{
  "name": "my-plugin",
  "description": "플러그인 설명",
  "version": "1.0.0",
  "author": { "name": "작성자" }
}
```

### 커맨드 파일 예시 (commands/my-command.md)

```markdown
---
description: 커맨드 설명
---

지시사항. 사용자 입력은 $ARGUMENTS로 받음.
```
