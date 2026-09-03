/* 重新生成 assets/covers/manifest.json
 * 用法：在 blog 目录执行  node tools/update-covers.mjs
 * 每次向 assets/covers/ 新增/删除封面图后跑一次，
 * 主页封面查找就走“一次请求清单”，不再逐个扩展名探测（避免一堆 404）。 */
import { readdirSync, writeFileSync } from "node:fs";

const dir = new URL("../assets/covers/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const names = readdirSync(dir)
  .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
  .sort();
writeFileSync(new URL("../assets/covers/manifest.json", import.meta.url), JSON.stringify(names) + "\n");
console.log("manifest 已更新：", names.length, "个封面 →", names.join(", "));
