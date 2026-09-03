# 封面图片放这里

把书本封面图放进本目录，命名成对应的课程 id，主页书架会自动替换占位封面，**不用改任何代码**。

## ⚠️ 加/删图片后请重建清单（重要）
页面靠 `manifest.json` 知道有哪些封面（不再逐个试扩展名，避免一堆 404 请求）。
放好新图后，在 blog 目录跑一次：
```
node tools/update-covers.mjs
```
它会重写 `assets/covers/manifest.json`，然后把改动 `git push` 即可。

## 命名规则

| 书本 | 文件名（任选一种格式） |
| --- | --- |
| 马克思主义基本原理 | `marxism.jpg` |
| 中国近现代史纲要 | `history.jpg` |
| 习近平新时代中国特色社会主义思想概论 | `xithought.jpg` |
| 毛泽东思想和中国特色社会主义理论体系概论 | `maozhongte.jpg` |
| 思想道德与法治 | `ideol-morality.jpg` |
| 形势与政策 · 时事政治 | `current-affairs.jpg` |
| **考研政治（六门合并成一本）** | `politics.jpg` |
| 英语（专升本） | `english.jpg` |
| 数据结构（自考 13003 / 考研 408 共用） | `ds.jpg` |
| 高等数学（数学一） | `math-calculus.jpg` |
| 线性代数（数学一） | `math-linalg.jpg` |
| 概率论与数理统计（数学一） | `math-prob.jpg` |
| 英语一 · 单词 | `eng1-vocab.jpg` |
| 英语一 · 阅读 | `eng1-reading.jpg` |
| 英语一 · 长难句 | `eng1-sentences.jpg` |
| 英语一 · 作文 | `eng1-writing.jpg` |
| 计算机组成原理（408） | `cs408-co.jpg` |
| 操作系统（408） | `cs408-os.jpg` |
| 计算机网络（408） | `cs408-net.jpg` |

支持的格式：`.jpg` `.jpeg` `.png` `.webp`，四种格式任选其一即可。

## 建议

- 尺寸：接近书本比例（宽 : 高 ≈ 5 : 7），高度 600px 以上清晰度最佳
- 如果图片不是书本比例也没关系，会自动铺满封面、压暗底部显示书名

## 验证

放好后刷新主页，书架上的占位封面就会变成你的图片。
找不到图片时会自动回退到渐变占位封面，不会报错。
