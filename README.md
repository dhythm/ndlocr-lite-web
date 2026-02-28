# NDLOCR Lite Web

[ndlocr-lite](https://github.com/ndl-lab/ndlocr-lite)（国立国会図書館のOCRエンジン）をブラウザ完結で動作させるWebアプリケーションです。
ONNX Runtime Web を使用し、サーバー通信なしにブラウザ内でレイアウト検出・文字認識を実行します。

## 参考

このプロジェクトは以下のリポジトリを参考にしています：

- [ndlocr-lite](https://github.com/ndl-lab/ndlocr-lite)
- [ndlocrlite-web](https://github.com/yuta1984/ndlocrlite-web)

## 機能

- 画像（JPEG, PNG, WebP, BMP, TIFF）およびPDFのOCR処理
- DEIM によるレイアウト検出（17クラス）
- PARSeq による文字認識（7143文字対応、3段階カスケード）
- XY-Cut アルゴリズムによる読み順整序
- 結果のエクスポート（TXT / JSON / PAGE XML）
- IndexedDB によるモデルキャッシュ（2回目以降の高速ロード）
- PWA対応（オフライン動作可能）

## セットアップ

### 前提条件

- Node.js 18+
- pnpm

### インストール

```bash
pnpm install
```

### モデルファイルの配置

ONNXモデルファイルが `public/models/` に必要です。ndlocr-liteリポジトリから取得します:

```bash
# 自動ダウンロード（約147MB）
curl -L -o public/models/deim-s-1024x1024.onnx \
  "https://raw.githubusercontent.com/ndl-lab/ndlocr-lite/master/src/model/deim-s-1024x1024.onnx"

curl -L -o public/models/parseq-ndl-16x256-30-tiny-192epoch-tegaki3.onnx \
  "https://raw.githubusercontent.com/ndl-lab/ndlocr-lite/master/src/model/parseq-ndl-16x256-30-tiny-192epoch-tegaki3.onnx"

curl -L -o public/models/parseq-ndl-16x384-50-tiny-146epoch-tegaki2.onnx \
  "https://raw.githubusercontent.com/ndl-lab/ndlocr-lite/master/src/model/parseq-ndl-16x384-50-tiny-146epoch-tegaki2.onnx"

curl -L -o public/models/parseq-ndl-16x768-100-tiny-165epoch-tegaki2.onnx \
  "https://raw.githubusercontent.com/ndl-lab/ndlocr-lite/master/src/model/parseq-ndl-16x768-100-tiny-165epoch-tegaki2.onnx"
```

### 開発サーバー起動

```bash
pnpm dev
```

ブラウザで http://localhost:5173 を開きます。

### テスト

```bash
pnpm test        # ウォッチモード
pnpm test:run    # 1回実行
```

### ビルド

```bash
pnpm build
```

ビルド成果物は `dist/` に出力されます。

## 技術スタック

- **ビルド**: Vite + React + TypeScript
- **推論**: onnxruntime-web (WASM)
- **並列化**: Web Worker
- **PDF**: pdfjs-dist
- **キャッシュ**: IndexedDB
- **オフライン**: PWA (Service Worker via vite-plugin-pwa)
- **テスト**: vitest + @testing-library/react

## ライセンス

モデルファイルのライセンスは [ndlocr-lite](https://github.com/ndl-lab/ndlocr-lite) のライセンスに従います。

## Create environment

```sh
touch README.md && cat << 'EOF' > CLAUDE.md
# CLAUDE.md

## Context

- see @AGENTS.md
EOF
cat << 'EOF' > AGENTS.md
# AGENTS.md

## Guideline

- follow TDD, follow t-wada method
- read the latest code when starting a new task, because it might be updated independently of your work

---

## Workflow

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start forelevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. Plan First: Write plan to `tasks/todo.md` with checkable items
2. Verify Plan: Check in before starting implementation
3. Track Progress: Mark items complete as you go
4. ExplChanges: High-level summary at each step
5. Document Results: Add review section to `tasks/todo.md`
6. Capture Lessons: Update `tasks/lessons.md` after corrections

---

## Core Principles

- Simplicity First: Make every change as simple as possible. Impact minimal code.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Changes should only touch what's necessary. Avoid introducing bugs.

---

## Development Environment

- use `pnpm` as a package manager
- use `vitest` for testing

EOF
cat << 'EOF' > .gitignore
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules

# next.js
/.next/
/out/

# production
/build

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files
.env*
!.env*.example

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
EOF
pnpm install && git init
```
