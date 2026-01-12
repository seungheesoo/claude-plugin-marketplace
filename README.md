# Local Claude Plugin Marketplace

## 마켓플레이스 등록

```bash
/plugin marketplace add ./
```

## 플러그인 설치

```bash
claude plugin install hello-world@local-marketplace
```

## 새 플러그인 추가

### Windows (PowerShell)
```powershell
.\add-plugin.ps1 -Name "my-plugin" -Description "설명"
```

### Linux/Mac
```bash
./add-plugin.sh my-plugin "설명"
```

자동으로:
- `plugins/my-plugin/` 디렉토리 생성
- `plugin.json` 생성
- 기본 커맨드 파일 생성
- `marketplace.json`에 등록

## 수동으로 플러그인 만들기

### 1. 구조
```
plugins/my-plugin/
├── .claude-plugin/
│   └── plugin.json
└── commands/
    └── my-command.md
```

### 2. plugin.json
```json
{
  "name": "my-plugin",
  "description": "설명",
  "version": "1.0.0",
  "author": { "name": "작성자" }
}
```

### 3. 커맨드 (commands/my-command.md)
```markdown
---
description: 커맨드 설명
---

지시사항. 사용자 입력은 $ARGUMENTS로 받음.
```

### 4. marketplace.json에 추가
```json
{"name": "my-plugin", "source": "./plugins/my-plugin", "description": "설명"}
```

## 기타 명령어

```bash
claude plugin uninstall <plugin>   # 삭제
claude plugin enable <plugin>      # 활성화
claude plugin disable <plugin>     # 비활성화
/plugin marketplace list           # 마켓플레이스 목록
```
