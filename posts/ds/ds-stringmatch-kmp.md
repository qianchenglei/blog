---
title: 字符串匹配 KMP（C 版）：从“数组带不出来”到 15 条用例全绿
date: 2026-09-08
tags: [C语言, 数据结构, 字符串匹配, KMP, 总结]
summary: 学“字符串查找”：把朴素匹配改成 KMP（前缀函数表 next + 不回溯匹配），并用 C 写通。过程踩了 int** vs int***、next 表忘了写回、匹配时把自己当文本遍历等一堆坑，最终 -Wall -Wextra 零警告 + 15 条边界用例实测全绿。
---

学数据结构 13003 的“字符串查找”这一块，朴素匹配（BF）会反复回溯文本下标，最坏 O(n·m)。KMP 的思路是**文本下标永不后退**，失配时靠模式串自己的“前缀函数表”（next）跳着走。这篇记录我用 C 把它写通的全过程——尤其是我反复踩的 C 指针/数组坑。

## 1. next 表是什么：最长相同真前后缀

`next[i]` 的定义：**模式串前缀 `p[0..i]` 的最长相同真前后缀长度**。

以 `P = "ababaca"` 为例，逐位看：

| i | 前缀 p[0..i] | 相同真前后缀 | next[i] |
| --- | --- | --- | --- |
| 0 | `a` | 单字符没有真前后缀 | 0 |
| 1 | `ab` | 无 | 0 |
| 2 | `aba` | `a` | 1 |
| 3 | `abab` | `ab` | 2 |
| 4 | `ababa` | `aba` | 3 |
| 5 | `ababac` | 无（结尾 c 对不上开头） | 0 |
| 6 | `ababaca` | `a` | 1 |

所以 `next = [0, 0, 1, 2, 3, 0, 1]`。

**递推的关键一行**（也是我最绕晕的地方）：

```c
while (matchLength > 0 && pattern[pos] != pattern[matchLength]) {
    matchLength = next[matchLength - 1];   // 失配：跳到“次长边界”
}
```

含义：我本来想延续长度为 `matchLength` 的前后缀，新字符不匹配，就退而求其次——看**那段已匹配前后缀自己的最长相同真前后缀**（存在 `next[matchLength-1]` 里），链式回退直到能接上或退到 0。它不是 `-1` 硬退，而是跳着退，不重不漏。

## 2. C 实现第一个坎：next 数组怎么“带出函数”

KMP_Next 里 malloc 出来的 next 表要还给调用者。C 没有“返回数组”，只有两条路：

- **调用者开好传进来**：函数只负责填（`int *next` 形参）；
- **函数 malloc + 输出参数带出**：形参写成 `int **NextList`，调用者传 `&next`，函数里 `*NextList = next;`。

我选了第二种，结果踩了个大坑：**`int** NextList[]` 是三层指针，不是二层！**

```c
int  *p;          // 一级：指向 int
int  **pp;        // 二级：指向 int*
int  **arr[];     // ❗ int** 的数组，形参退化后 ≡ int***（三层!）
```

函数形参里的数组会退化成指向首元素的指针，`int** NextList[]` 退化成 `int***`。要去掉 `[]`，**真正的二级指针写法是 `int **NextList`**，调用处传 `&next`。

带回时也有讲究：`Next`（malloc 的返回值）本身就是数组首地址，直接 `*NextList = Next`；写 `*NextList = &Next` 就把“指针变量的地址”带出去了，类型和语义全错。

## 3. 完整实现（最终调通版）

**KMP.h**

```c
#ifndef KMP_H
#define KMP_H

#include <stdbool.h>

bool KMP_Next(char pattern[], int **nextList, int *patternLength);
bool KMP_Search(char text[], int **next, int *textLength,
                char pattern[], int *matchmark);

#endif
```

**KMP.c**

```c
#include "KMP.h"
#include <string.h>
#include <stdlib.h>

bool KMP_Next(char pattern[], int **nextList, int *patternLength) {
    *patternLength = (int)strlen(pattern);
    if (*patternLength == 0) {
        *nextList = NULL;
        return false;
    }

    int *next = (int *)malloc(*patternLength * sizeof(int));  // ★ int 大小
    if (next == NULL) {
        *nextList = NULL;
        return false;
    }

    int matchLength = 0;
    next[0] = 0;                                     // 单字符无真前后缀
    for (int pos = 1; pos < *patternLength; pos++) { // ★ 从 1 开始
        while (matchLength > 0 && pattern[pos] != pattern[matchLength]) {
            matchLength = next[matchLength - 1];     // 失配：跳次长边界
        }
        if (pattern[pos] == pattern[matchLength]) {
            matchLength++;
        }
        next[pos] = matchLength;                     // ★ 把结果写进表!
    }

    *nextList = next;
    return true;
}

bool KMP_Search(char text[], int **next, int *textLength,
                char pattern[], int *matchmark) {
    int patternLength = (int)strlen(pattern);

    if (*textLength == 0 || next == NULL || *next == NULL) return false;
    if (patternLength == 0 || patternLength > *textLength) return false;

    int matched = 0;
    for (int pos = 0; pos < *textLength; pos++) {        // 遍历的是【文本】
        while (matched > 0 && text[pos] != pattern[matched]) {
            matched = (*next)[matched - 1];              // 失配回退
        }
        if (text[pos] == pattern[matched]) {             // 文本[pos] vs 模式[matched]
            matched++;
        }
        if (matched == patternLength) {                  // ★ 完成 = 模式长度
            *matchmark = pos - matched + 1;
            return true;
        }
    }
    return false;
}
```

## 4. 我踩过的坑清单（每条都真实发生过）

1. **`int** NextList[]`**：以为写的是二级指针，实际退化成三层 `int***`。删掉 `[]`。
2. **`malloc(len * sizeof(char))`**：next 存 int，只分 1/4 空间必然越界。要 `sizeof(int)`。
3. **`Next[0] = 0` 写错对象**：`NextList[0]=0` 改的是指针数组元素；要 `(*NextList)[0] = 0` 即 `next[0] = 0`。
4. **循环从 `P=0` 开始**：`pattern[0]==pattern[0]` 恒成立，把 next[0] 污染成 1。必须从 `P=1` 起。
5. **`Next[P] = Next[MatchStringLength]`**：把“要写入的值”写成“查表”。next[P] 存的就是算出的长度本身：`Next[P] = MatchStringLength`。
6. **忘了把结果写进表**：只更新 `matchLength` 不写 `next[pos]`，表全空。`next[pos] = matchLength;` 是最容易漏的一行。
7. **`while (StringLength > 0 && ...)`**：该判断的是 `matchLength > 0`。否则 matchLength 为 0 时 `next[matchLength-1]` = `next[-1]` 直接越界崩。
8. **`if (StringLength == 0)`**：判的是指针本身；要 `*StringLength == 0`。
9. **Search 里“把自己捞进去”**：循环写 `for (P=0; P<ModeLength; P++)` 并比较 `SearchModeString[P] != Main[Matched]`——拿模式当文本遍历。**规则：哪个串挂着 next 表，哪个就是模式；循环遍历的一定是另一个（文本）。**
10. **完成条件写成 `Matched == *StringLength`**：matched 是对模式的计数，要等于**模式长度** `ModeLength`。
11. **`*NextList = &Next`**：带回的是 malloc 返回的数组首地址，不是指针变量的地址。
12. **漏 `return true` / 漏 `#include <string.h>`**：低级但编译期就被逮。

## 5. 测试：13 组用例，15/15 全绿

用自校验测试套件（每条同时比对 next 表 + 匹配位置），CLion 自带 MinGW 的 `gcc -Wall -Wextra -std=c11` **零警告**编译：

```c
runTest("匹配在中间",    "abababacab", "ababaca");  // next 0 0 1 2 3 0 1 → 位置 2
runTest("模式在开头",    "hello world", "hello");   // 位置 0
runTest("模式在结尾",    "hello world", "world");   // 位置 6
runTest("重复字符",      "aaaaaaaa",    "aaa");     // next 0 1 2 → 位置 0
runTest("模式=整个文本", "kmp",          "kmp");    // 位置 0
runTest("重叠型",        "ababab",       "abab");   // next 0 0 1 2 → 位置 0
runTest("经典 mississippi", "mississippi", "issip");// next 0 0 0 1 0 → 位置 4
runTest("单字符命中",    "aaaa",         "a");      // 位置 0
runTest("模式不存在",    "hello",        "xyz");    // 未找到
runTest("模式比文本长",  "ab",           "abc");    // 未找到
runTest("空文本",        "",             "a");      // 未找到
runTest("空模式串",      "abc",          "");       // 未找到
runTest("单字符不命中",  "aaaa",         "b");      // 未找到
```

实测输出（摘要）：

```
next  = 0 0 1 2 3 0 1        ← "ababaca"
找到!起始下标 2,内容: ababacab
...
通过 15 / 15 条用例
```

验证口径：文本 `"abababacab"` 中 `"ababaca"` 从下标 2 开始（`text+mark` 打印能直接看到），next 表与手算一致。

## 6. 小结

KMP 本身不难，难的是我在 C 的“数组/指针带出”上栽了大跟头。沉淀成三条：

- **函数要改调用者的什么，就传什么的地址**：改 `int` → `int*`；让 `int*` 指向新数组 → `int**`。二级指针是终点，出现“三级指针”就该回头检查是不是多了 `[]`。
- **谁挂着 next 表谁是模式**，循环遍历的是文本——两个角色分清楚，Search 就不会“自己捞自己”。
- **先写对再优化**：我的 bug 大多不是 KMP 思想错，而是 C 语法/生命周期错。用严格警告 + 边界用例（空串、单字符、模式=文本、模式更长）兜底，比肉眼排查快得多。

下一篇把 KMP 的“返回所有匹配位置”“BM / 改进版 next”补上。
