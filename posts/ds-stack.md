---
title: 栈（StackAndHeap）：顺序栈与链式栈
date: 2026-09-02
tags: ["课程","计算机学科基础","数据结构（ds）","栈和队列"]
summary: 栈（LIFO）的两种实现总结：定长数组的顺序栈 + 单链表头插的链式栈；含 DestroyStack 无判空、StackEmpty(NULL) 语义颠倒等坑。
---

## 是什么

栈（Stack）是只允许在**同一端（栈顶）**进行插入/删除的线性表，后进先出（LIFO）。它是受限的线性表，在《数据结构与算法》(13003) 中属于"栈和队列"章节，也是递归、表达式求值、括号匹配等算法的实现基础。

本工程（`duizhan/StackAndHeap`）把栈实现了两种存储形态：

- **顺序栈**（定长数组）—— `Stack`，`Stack.h/.c`
- **链式栈**（单链表、头插，无容量限制）—— `LinkListStack`，`SingleLinkListStack.h/.c`

队列部分（循环队列、带头结点链式队列）在另一篇笔记《队列》里讲。两个 ADT 共用同一个数据单元 `BaseDataUnit`（编号 Mark + 性别 Gender + 姓名 Name）。

> ⚠️ 说明：目录名叫 `StackAndHeap`（栈与堆），但代码里**并没有实现数据结构意义上的"堆"**（二叉堆/优先队列）——全部内容只有栈和队列。别按"堆"去查。

## 文件结构（栈相关）

| 文件 | 作用 |
| --- | --- |
| `DataType.h` | 公共头：定义统一数据单元 `BaseDataUnit`（Mark / Gender / Name）与 `MaxNameSize` |
| `Stack.h` / `Stack.c` | **顺序栈**：定长数组实现的 LIFO 栈，含初始化/判空/入栈/出栈/取栈顶/销毁 |
| `SingleLinkListStack.h` / `.c` | **链式栈**：单链表头插法实现，前缀 `SLLS_`，含清空操作 |
| `StackAndHeap.c` | 主程序：`printData` + 各 `test*` 自动化测试（栈的两个测试在这里） |

## 核心设计

### 数据结构

```c
// DataType.h —— 所有容器共用的数据单元
typedef struct BaseDataUnit {
    int  Mark;              // 编号
    bool Gender;            // true=Male / false=Female
    char Name[MaxNameSize]; // MaxNameSize=50
} BaseDataUnit;
```

```c
// Stack.h —— 顺序栈（定长数组）
typedef struct DataUnit {
    BaseDataUnit Data[MaxDataSize];  // MaxDataSize = 50
    int TopPrint;                    // 栈顶下标，空栈为 -1
} Stack;
```

```c
// SingleLinkListStack.h —— 链式栈（单链表，表头即栈顶）
typedef struct LinkListDataUnit {
    BaseDataUnit Data;
    struct LinkListDataUnit *Next;
} LinkListDataUnit;
typedef struct LinkListStack {
    LinkListDataUnit *First;  // 栈顶结点（头插）
    int StackSize;            // 栈内元素个数
} LinkListStack;
```

设计要点：

- 顺序栈以 `TopPrint = -1` 表示空栈，入栈 `Data[++TopPrint] = x`，出栈取 `Data[TopPrint--]`，是标准写法（`TopPrint` 实为 `Top` 的笔误，见已知问题）。
- 链式栈用**头插法**：新结点 `Next = First; First = 新结点`，所以链表头就是栈顶，入/出栈都是 `O(1)`，且**无容量上限**（受堆内存限制）。

### 核心函数

```c
// ===== 顺序栈 Stack.c =====
bool InitStack(Stack *Stack);
bool StackEmpty(const Stack *Stack);
bool PushInToStack(Stack *Stack, BaseDataUnit InputDataUnit);
bool PopOfStack(Stack *Stack, BaseDataUnit *BackDataUnit);
bool GetTopDataUnit(Stack *Stack, BaseDataUnit *BackDataUnit);
bool DestroyStack(Stack *Stack);
```

1. **`PushInToStack`**：判满（`TopPrint == MaxDataSize-1`）后 `Data[++TopPrint] = InputDataUnit`，值拷贝整单元。注意点：参数名与类型名都叫 `Stack`（靠 C 的作用域规则勉强能编译，观感差）；失败/空指针提示文案大量拼错成 "Stark"。
2. **`PopOfStack` / `GetTopDataUnit`**：前者先 `StackEmpty` 判空，弹出时用 `Data[TopPrint--]` **带回值但不真正清除数组残留**；后者只读栈顶不出栈。二者对 `NULL` 与空栈都返回 `false`。
3. **`DestroyStack`**：只做 `TopPrint = -1`（静态数组无需释放）。**注意：完全没有 `NULL` 判空**，传 `NULL` 直接解引用崩溃——与本文件其它函数风格不一致（见已知问题 1）。
4. **`InitStack`**：`TopPrint = -1`。`StackEmpty(NULL)` 会打印"未初始化"却返回 `false`（="非空"），把"无效"误报为"非空"，语义混乱。

```c
// ===== 链式栈 SingleLinkListStack.c =====
bool SLLS_InitStack(LinkListStack *Stack);
bool SLLS_StackEmpty(const LinkListStack *Stack);
bool SLLS_PushInToStack(LinkListStack *Stack, BaseDataUnit TempData);
bool SLLS_PopOfStack(LinkListStack *Stack, BaseDataUnit *BackData);
bool SLLS_GetTopDataUnit(LinkListStack *Stack, BaseDataUnit *BackData);
bool SLLS_CleanStack(LinkListStack *Stack);   // 弹空所有元素
```

5. **`SLLS_PushInToStack`**：`malloc` 新结点并检查失败，头插进链表、`StackSize++`。链式栈没有"满"的概念（内存耗尽才失败），这是相对顺序栈的核心优势。
6. **`SLLS_PopOfStack`**：取表头结点，带回数据后 `free` 并更新 `First`、`StackSize--`——`malloc/free` 配对正确。注意点：判断用的变量名拼写为 `ToFreeNude`（Node 之误）。
7. **`SLLS_CleanStack`**：循环 `SLLS_PopOfStack` 直到 `First == NULL`，把所有结点释放干净。注意点：**空栈时返回 `false`** 并提示"未初始化或为空"——清空一个本来就是空的栈应该算成功，返回值语义有误。

## 交互/测试

`StackAndHeap.c` 的 `main` **没有交互菜单**，而是顺序执行自动化演示函数，每步把结果以 `success/fail` + `printData` 打印，跑完退出（返回 0）。栈相关两个：

1. `testSequentialStack()` —— 顺序栈：Push Alice/Bob/Charlie → GetTop → Pop×2 → 判空 → Destroy。验证 LIFO（先出 Charlie、Bob）。
2. `testLinkListStack()` —— 链式栈：Push David/Eva/Frank → GetTop → Pop×2 → CleanStack → 判空。演示链式栈同样 LIFO 且无容量限制。

> 测试只覆盖了正常主路径，**没有覆盖空栈 Pop、顺序栈满 Push、传 NULL 等边界**——已知问题 1/2/3 正是因此没被发现。

## 已知问题与改进建议

1. **`DestroyStack` 无 NULL 判空**（`Stack.c:64-67`）：`Stack == NULL` 时直接崩溃，与同文件其它函数统一判空的风格矛盾。另 `StackEmpty(NULL)` 打印"未初始化"却返回 `false`（相当于报"非空"），语义颠倒，建议 NULL 时返回明确错误语义。
2. **判空/清空等函数带打印副作用**：`SLLS_StackEmpty` 每次调用都会输出 "is empty / is not empty"，`StackEmpty(NULL)`、`SLLS_CleanStack` 空栈时也打印。作为教学演示可接受，作为可复用库函数不干净；且 `SLLS_StackEmpty` 用 `First==NULL && StackSize==0` 双条件绑定判空，两者不同步时会误报。建议：纯函数只返回 bool，提示文案移到测试/调用层。
3. **`SLLS_CleanStack` 对空栈返回 `false`**："清空一个空栈"应视为成功，当前实现却报失败并打印 "uninitialized or Empty"。建议空栈时直接 `return true`。
4. **跨平台问题**：`Stack.h` 引入了 `windows.h` 但代码里并未使用任何 Win32 API，导致该模块无法在非 Windows 平台编译。建议去掉无用头文件。
5. **命名与拼写**：栈顶字段名 `TopPrint`（疑为 Top）；链式栈局部变量 `ToFreeNude`（Node）；提示语 "Stark/Was Fail" 等；`typedef struct DataUnit` 的标签名与"数据单元"含义不符（结构体本义是"栈"）。
6. **测试覆盖不足**：建议补充边界用例（空栈 Pop、顺序栈满 Push、`DestroyStack(NULL)` 等），能立刻暴露问题 1/2/3。

## 相关

队列（循环队列 + 带头结点链式队列）见笔记《队列》；栈与队列同属 `duizhan/StackAndHeap` 工程。
