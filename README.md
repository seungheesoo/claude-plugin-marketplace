# Claude Plugin Marketplace Test

## 서버 시작

```bash
npm start
```

## 마켓플레이스 등록

```bash
/plugin marketplace add http://localhost:4874/.claude-plugin/marketplace.json
```

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

## Claude Code에서 플러그인 설치

```bash
claude plugin install my-plugin@claude-plugin-marketplace-test
```

## 플러그인 구조

Git 저장소는 다음 구조를 따라야 합니다:

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json
└── commands/
    └── my-command.md
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
