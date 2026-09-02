---
title: 多维数组模块（StringMatch）——真正的索引映射与完整增删改查
date: 2026-09-01
tags: [C语言, 数据结构, 数组, 总结]
summary: 昨天的 DS-ARRAY 只做了"模拟多维"，今天补上了真正的多维下标到一维偏移的映射（Tool_GetAndEffectiveIndex），并修掉了删除留洞、内存泄漏两大问题，新增插入/取值/改值/查找。
---

昨天把 `ArrayHard` 这套动态数组模块梳理了一遍（见《数据结构——手写泛型数组》），当时留了三个尾巴：多维索引映射没做、删除只置零留空洞、`DestroyArray` 没释放内存。今天把整个模块重写了一遍，三个尾巴基本都补上了。这篇记录一下重写后的设计。

## 1. 项目概述

工程名 `StringMatch`，底层仍然是**一段连续的 `int` 内存**，通过一个结构体把 1 维 / 2 维 / 3 维的逻辑抽象出来。与昨天最大的不同：

- 真正实现了**多维下标 → 一维线性偏移**的映射，坐标全部改为 **0 基**；
- `Delete` 不再只置零，而是**左移后续元素**并减小逻辑长度，不再留空洞；
- `DestroyArray` **真正 free 了 `data` 和结构体**，不再内存泄漏。

文件构成：
- `h/publicData.h` – 核心结构体 `ArrayHard`
- `h/Array.h` – 常量与全部函数声明
- `c/Array.c` – 所有数组操作实现
- `main.c` – 交互式测试程序（10 个菜单项）

> 注：工程名叫 `StringMatch`，但目前代码里全是数组逻辑，字符串匹配还没写，先拿它当多维数组模块用。

## 2. 数据结构（`publicData.h`）

```c
typedef struct ArrayHard {
    int* data;                 // 连续内存，存所有元素
    int Dimensional;           // 逻辑维度 1/2/3
    int SingleDimensionalSize; // 底层总容量
    int CurDataUnit;           // 最后一个有效元素的下标（-1 表示空）
    int dims[3];               // 各维度大小：dims[0]=i, dims[1]=j, dims[2]=k
} ArrayHard;
```

`dims` 这次是真正参与寻址的（见下面的偏移计算），不再是"只记录不用"。

## 3. 核心：多维下标到线性偏移（`Tool_GetAndEffectiveIndex`）

这是今天最重要的一段，它把 (i, j, k) 坐标统一换算成 `data` 的下标，并做越界检查：

```c
bool Tool_GetAndEffectiveIndex(ArrayHard* Array, int i, int j, int k, int* Offsetdata);
```

- **一维**：`offset = i`，要求 `0 <= i <= CurDataUnit`
- **二维**：`offset = i * dims[1] + j`，要求坐标在 `dims` 范围内，且偏移不越界
- **三维**：`offset = (i * dims[1] + j) * dims[2] + k`

坐标全部从 0 开始，所有"按位置操作"的函数（Get / Set / Delete / Insert）都先调它拿偏移，拿到的是**同一个线性下标**，从而保证多维与一维访问的是同一份数据。

## 4. 函数功能说明（`c/Array.c`）

### 4.1 `InitArray` – 创建数组

按维度分配 `data` 并清零，记录 `dims`，`CurDataUnit = -1`。相比昨天，每个维度的 `dims` 赋值都正确了（昨天一二维会误把 `k` 塞进 `dims[0]`）。

### 4.2 `PushDataInArray` – 末尾插入

栈式插入，`++CurDataUnit` 后写入，满则打印 `Array is full` 返回 `false`。

### 4.3 `DeleteDataInArray(Array, i, j, k, &ReturnData)` – 指定位置删除 ★已修复

签名从昨天的 `(index)` 改成了 `(i, j, k)` 坐标。**这是修复重点**：

1. 用 `Tool_GetAndEffectiveIndex` 算出偏移；
2. 记录被删的值；
3. **把后面所有元素左移一位**；
4. `CurDataUnit--`。

相比昨天"只置零、留空洞"，现在数组仍是连续的，逻辑长度也会减一，真正删掉了。

### 4.4 `PopDataInArray` – 末尾弹出

取末尾值、置零、`CurDataUnit--`，空数组打印 `Array is empty`。

### 4.5 `InsertDataInArray` – 指定位置插入 ★新增

在任意位置插入（允许在末尾，即 `offset <= CurDataUnit + 1`）：先把 `CurDataUnit` 到 `offset` 的元素**逐个后移**，再写入，`CurDataUnit++`。数组满则拒绝。

### 4.6 `GetDataInArray` / `SetDataInArray` – 取值 / 改值 ★新增

按 (i, j, k) 坐标读/写单个元素，底层都走 `Tool_GetAndEffectiveIndex`。

### 4.7 `SearchDataInArray` – 查找 ★新增

线性查找，找到返回该元素的**线性偏移下标**，找不到返回 `false`。

### 4.8 `PrintArray` – 打印 ★已修复

只打印 `0 .. CurDataUnit`（有效元素），并按维度输出逻辑坐标：

- 一维：`[i] -> v`
- 二维：`(i, j) -> v`
- 三维：`(i, j, k) -> v`

同时打印 `dims` 和当前元素个数。昨天的冗余输出 `"This a cur Arrar :"` 已删除。

### 4.9 `GetLength` – 取长度

返回 `CurDataUnit`（最后一个有效下标）。注意 main 里打印时用的是 `len + 1`，因为元素个数 = `CurDataUnit + 1`。

### 4.10 `DestroyArray` – 销毁 ★已修复

```c
bool DestroyArray(ArrayHard* Array, int i, int j, int k) {
    if (Array == NULL) return false;
    free(Array->data);
    free(Array);
    return true;
}
```

真正释放了内存。`(i, j, k)` 参数是**为兼容保留的、未使用**——这个小尾巴后面可以清理掉。

## 5. 测试程序（`main.c`）

交互式菜单，10 个选项：

| 编号 | 操作 | 说明 |
| --- | --- | --- |
| 1 | Push | 末尾插入 |
| 2 | Delete | 指定坐标删除 |
| 3 | Pop | 末尾弹出 |
| 4 | Insert | 指定坐标插入 |
| 5 | Get | 取指定坐标值 |
| 6 | Set | 改指定坐标值 |
| 7 | Search | 查找值 |
| 8 | Print | 带坐标打印 |
| 9 | GetLength | 当前有效元素个数 |
| 10 | Destroy | 销毁并退出 |

其它细节：
- 创建时按维度输入各维大小，总容量 `size = i` / `i*j` / `i*j*k`；
- 输入用 `fgets + strtol` 安全读取，一维长度支持直接回车用默认值 `50`；
- Windows 下 `system("chcp 65001")` 解决中文乱码；
- 删除/取值/改值在 main 里按维度分支去读不同个数的坐标，再统一调用 `(i, j, k)` 版本。

## 6. 已知问题 / 后续

1. **`GetLength` 语义**：函数名是"取长度"，返回的却是最后一个下标 `CurDataUnit`，main 里要靠 `+1` 兜底。建议让它直接返回元素个数（`CurDataUnit + 1`），语义更清晰。
2. **`DestroyArray` 的多余参数**：`(i, j, k)` 保留只为兼容，函数体没用，可以简化成 `void DestroyArray(ArrayHard*)`。
3. **二维/三维的插入**：插入发生在"行中间"时，底层线性数组后移，同一逻辑坐标在插入后指向的元素会变，这与一维数组的"插入后元素顺移"行为一致，但用坐标表达时比较隐晦，测试时要注意。
4. **工程名与内容不符**：叫 `StringMatch` 但还没有字符串匹配代码；后续若在这个模块上做字符串匹配，正好接上这个"多维数组/串"的主题。

## 7. 总结

今天把昨天的动态数组模块重写成"真·多维数组"：

- ✅ 多维下标 → 一维偏移的映射做出来了（`Tool_GetAndEffectiveIndex`），坐标统一 0 基；
- ✅ 删除会左移元素、逻辑长度减少，不再留空洞；
- ✅ `DestroyArray` 真正释放内存；
- ✅ 补上了 Insert / Get / Set / Search 四类操作，功能比昨天完整得多。

昨天的三个大问题都处理掉了。剩下的是接口语义、冗余参数这类"洁净度"问题，不影响正确性。下一步要么把这套模块接到字符串匹配（对得上工程名），要么把测试程序再扩展些边界用例。

路虽远，行则将至。
