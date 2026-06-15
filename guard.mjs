// .claude/hooks/guard.mjs
// PreToolUse フック：自動更新タスクが data.json 以外を書き換えるのを物理的にブロック。
// Node 製でクロスプラットフォーム（Windows でも動作）。標準入力で tool 情報を受け取る。

let input = "";
process.stdin.on("data", c => (input += c));
process.stdin.on("end", () => {
  let d = {};
  try { d = JSON.parse(input); } catch { /* 解析不能なら素通り */ }
  const tool = d.tool_name || "";
  const ti = d.tool_input || {};
  const fp = String(ti.file_path || ti.path || ti.notebook_path || "");
  const WRITE = ["Write", "Edit", "MultiEdit", "NotebookEdit"];

  if (WRITE.includes(tool)) {
    const ok = /(^|[\/\\])data\.json$/.test(fp);
    if (!ok) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "この自動更新では data.json 以外の編集は禁止です（UI/設定/スクリプトの改変防止）。スコアや status の更新は data.json に対して行ってください。"
        }
      }));
      process.exit(0);
    }
  }
  process.exit(0);
});
