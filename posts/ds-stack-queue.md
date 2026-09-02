---
title: 栈与队列（StackAndHeap）：四个容器实现
date: 2026-09-02
tags: ["课程","计算机学科基础","数据结构（ds）","栈与队列"]
summary: 顺序栈、链式栈、循环队列、带头结点链式队列四个 ADT 总结；链队 Init 后未 Push 即销毁会踩野指针等坑。
---


## 是什么

栈（Stack）是只允许在**同一端（栈顶）**进行插入/删除的线性表，后进先出（LIFO）；队列（Queue）是只允许在**一端入队、另一端出队**的线性表，先进先出（FIFO）。二者是两种受限的线性表，在《数据结构与算法》(13003) 中属于“栈和队列”章节，也是后续递归、表达式求值、层次遍历等算法的实现基础。

本工程把这两个 ADT 各实现了两种存储形态，共 4 个“容器”，全部围绕统一的数据单元 `BaseDataUnit`（编号 Mark + 性别 Gender + 姓名 Name）展开：

- **顺序栈**（定长数组）—— `Stack`，`Stack.h/.c`
- **链式栈**（单链表、头插）—— `LinkListStack`，`SingleLinkListStack.h/.c`
- **顺序循环队列**（定长数组 + 队头/队尾下标）—— `ArrayQueue`，`Queue.h/.c`
- **链式队列**（带头结点的单链表）—— `LLQueue`，`LinkListQueue.h/.c`

`main`（`StackAndHeap.c`）不提供交互菜单，而是依次跑四个自动化测试函数，逐步打印每个操作的成败，用来演示/验证各 ADT 的行为。

> ⚠️ 说明：目录名叫 `StackAndHeap`（栈与堆），但**代码里并没有实现“堆”**（二叉堆/优先队列）——全部内容只有栈和队列。“Heap”在这里应理解为“堆内存/动态分配”或历史遗留命名，请勿按数据结构“堆”去查阅。

## 文件结构

| 文件 | 作用 |
| --- | --- |
| `DataType.h` | 公共头：定义统一数据单元 `BaseDataUnit`（Mark / Gender / Name）与 `MaxNameSize` |
| `Stack.h` / `Stack.c` | **顺序栈**：定长数组实现的 LIFO 栈，含初始化/判空/入栈/出栈/取栈顶/销毁 |
| `SingleLinkListStack.h` / `.c` | **链式栈**：单链表头插法实现的无容量限制栈，前缀 `SLLS_`，含清空操作 |
| `Queue.h` / `Queue.c` | **循环队列**：定长数组 + `Front`/`Rear` 游标，牺牲一个单元判满，实现循环利用 |
| `LinkListQueue.h` / `.c` | **链式队列**：带头结点的单链表队列，`Init/Destroy` 用二级指针把外部指针置 NULL |
| `StackAndHeap.c` | 主程序：`printData` 打印工具 + 4 个 `test*` 自动化测试函数 + `main` 顺序调用 |

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

```c
// Queue.h —— 循环队列（定长数组 + 双游标）
typedef struct Queue {
    BaseDataUnit Data[MaxArraySize];  // MaxArraySize = 50
    int Front, Rear;                  // 队头/队尾下标（均 0 基）
} ArrayQueue;
```

```c
// LinkListQueue.h —— 链式队列（带头结点）
typedef struct LLQueueData {
    BaseDataUnit DataUnit;
    struct LLQueueData *Next;
} LLQueueData;
typedef struct LLQueue {
    LLQueueData *Front;  // 头结点（不存数据）
    LLQueueData *Rear;   // 队尾
} LLQueue;
```

设计要点：

- 顺序栈以 `TopPrint = -1` 表示空栈，入栈 `Data[++TopPrint] = x`，出栈取 `Data[TopPrint--]`，是标准写法（`TopPrint` 实为 `Top` 的笔误，见已知问题）。
- 链式栈用**头插法**：新结点 `Next = First; First = 新结点`，所以链表头就是栈顶，入/出栈都是 `O(1)`，且**无容量上限**（受堆内存限制）。
- 循环队列用 `(Rear+1) % MaxArraySize == Front` 判满，即**牺牲一个存储单元**区分“空/满”（空：`Front == Rear`），队头队尾下标按模推进，数组可循环复用。
- 链式队列带**哑头结点**：`Front` 恒指向不存数据的头结点，`Front == Rear` 表示空队（此时 `Rear` 可能指回头结点）。`DestroyLLQueue` 接收 `LLQueue **`，销毁后把外部指针置 `NULL`，防止悬垂指针——这是几个容器里接口设计最讲究的一个。

### 核心函数（每个容器挑代表，逐个说明）

```c
// ===== 顺序栈 Stack.c =====
bool InitStack(Stack *Stack);
bool StackEmpty(const Stack *Stack);
bool PushInToStack(Stack *Stack, BaseDataUnit InputDataUnit);
bool PopOfStack(Stack *Stack, BaseDataUnit *BackDataUnit);
bool GetTopDataUnit(Stack *Stack, BaseDataUnit *BackDataUnit);
bool DestroyStack(Stack *Stack);
```

1. **`PushInToStack`**：判满（`TopPrint == MaxDataSize-1`）后 `Data[++TopPrint] = InputDataUnit`，值拷贝整单元。注意点：参数名与类型名都叫 `Stack`（靠 C 的作用域规则勉强能编译，观感差）；失败/空指针提示文案大量拼错成 “Stark”。
2. **`PopOfStack` / `GetTopDataUnit`**：前者先 `StackEmpty` 判空，弹出时用 `Data[TopPrint--]` **带回值但不真正清除数组残留**；后者只读栈顶不出栈。二者对 `NULL` 与空栈都返回 `false`。
3. **`DestroyStack`**：只做 `TopPrint = -1`（静态数组无需释放）。**注意：完全没有 `NULL` 判空**，传 `NULL` 直接解引用崩溃——与本文件其它函数风格不一致（见已知问题 1）。
4. **`InitStack`**：`TopPrint = -1`。`StackEmpty(NULL)` 会打印“未初始化”却返回 `false`（=“非空”），把“无效”误报为“非空”，语义混乱。

```c
// ===== 链式栈 SingleLinkListStack.c =====
bool SLLS_InitStack(LinkListStack *Stack);
bool SLLS_StackEmpty(const LinkListStack *Stack);
bool SLLS_PushInToStack(LinkListStack *Stack, BaseDataUnit TempData);
bool SLLS_PopOfStack(LinkListStack *Stack, BaseDataUnit *BackData);
bool SLLS_GetTopDataUnit(LinkListStack *Stack, BaseDataUnit *BackData);
bool SLLS_CleanStack(LinkListStack *Stack);   // 弹空所有元素
```

5. **`SLLS_PushInToStack`**：`malloc` 新结点并检查失败，头插进链表、`StackSize++`。链式栈没有“满”的概念（内存耗尽才失败），这是相对顺序栈的核心优势。
6. **`SLLS_PopOfStack`**：取表头结点，带回数据后 `free` 并更新 `First`、`StackSize--`——`malloc/free` 配对正确。注意点：判断用的变量名拼写为 `ToFreeNude`（Node 之误）。
7. **`SLLS_CleanStack`**：循环 `SLLS_PopOfStack` 直到 `First == NULL`，把所有结点释放干净。注意点：**空栈时返回 `false` 并提示“未初始化或为空”**——清空一个本来就是空的栈应该算成功，返回值语义有误；且结构体里没有真正“销毁外壳”的函数（本结构仅两个字段，栈上声明即可，无碍）。

```c
// ===== 循环队列 Queue.c =====
bool InitQueue(ArrayQueue *Q);
bool QueueEmpty(ArrayQueue *Q);
bool QueueFull(ArrayQueue *Q);
bool InQueue(ArrayQueue *Q, BaseDataUnit *Data);
bool PopQueue(ArrayQueue *Q, BaseDataUnit *Data);
bool GetQueue(ArrayQueue *Q, BaseDataUnit *Data);
bool DestroyQueue(ArrayQueue *Q);
```

8. **`InQueue` / `PopQueue` / `GetQueue`**：入队 `Data[Rear]=*Data; Rear=(Rear+1)%Max`；出队带回 `Data[Front]` 后 `Front` 模推进；取队头只读 `Data[Front]`。三者均先判空/满、对 `NULL` 返回 `false`，边界处理是本工程最工整的一组。注意点：入/出队参数是 `BaseDataUnit *`（指针）而其它容器的入参是值——风格不一致；判满用“牺牲一格”法，**实际最多存 49 个元素**而非 50。

```c
// ===== 链式队列 LinkListQueue.c =====
bool InitLLQueue(LLQueue **Queue);        // 二级指针：申请外壳+头结点
bool LLQueueEmpty(const LLQueue *Queue);
bool PushLLQueue(LLQueue *Queue, BaseDataUnit DataUnit);
bool PopLLQueue(LLQueue *Queue, BaseDataUnit *DataUnit);
bool GetFirstLLQueue(LLQueue *Queue, BaseDataUnit *DataUnit);
bool DeleteLLQueue(LLQueue *Queue);       // 清空数据结点、保留头结点
bool DestroyLLQueue(LLQueue **Queue);     // 清空+释放外壳+外部指针置 NULL
```

9. **`InitLLQueue`**：先 `malloc` 外壳 `Q` 再 `malloc` 头结点 `Hard`，`Front=Rear=Hard`。注意点：**只检查了 `Hard` 的 malloc 失败、没检查 `Q` 的 malloc 失败；`Hard->Next` 申请后从未初始化**——这是本工程最值得警惕的一处，见已知问题 1。
10. **`PopLLQueue`**：空队先判 `Front==Rear`；否则取 `Front->Next`（真正的首元素）带回数据、摘链、`free`，且**当弹出的是最后一个元素时把 `Rear` 收回指向头结点**——尾指针维护正确，是带头结点链队最容易写错的地方，这里写对了。配合 `PushLLQueue`（尾插 `Rear->Next = new; Rear = new`）出入队均 `O(1)`。
11. **`DestroyLLQueue`**：调 `DeleteLLQueue` 清空数据结点 → `free` 外壳 → `*Queue = NULL`，杜绝悬垂。注意点：`DeleteLLQueue` 名为“Delete”（易误读为销毁整个队列），实际只清空数据结点；而它从 `Front->Next` 开始遍历，与已知问题 1 联动。

## 交互/测试

`StackAndHeap.c` 的 `main` **没有交互菜单**，而是顺序执行四个自动化演示函数，每个函数把每一步（初始化、入 3 个元素、取顶/取头、出 2 个、再入 1 个验证“空后可用”）的结果以 `success/fail` + `printData` 打印出来，跑完即退出（返回 0）：

1. `testSequentialStack()` —— 顺序栈：Push Alice/Bob/Charlie → GetTop → Pop×2 → 判空 → Destroy。验证 LIFO（先出 Charlie、Bob）。
2. `testLinkListStack()` —— 链式栈：Push David/Eva/Frank → GetTop → Pop×2 → CleanStack → 判空。演示链式栈同样 LIFO 且无容量限制。
3. `testQueue()` —— 循环队列：入 Grace/Henry/Ivy → GetQueue → Pop×2 → 再入 Jack 验证游标绕回（循环复用）→ Destroy。
4. `testLinkListQueue()` —— 链式队列：入 Kate/Leo/Mia → GetFirst → Pop×2 → 再入 Noah → `DeleteLLQueue` 清空 → `DestroyLLQueue(&q)` 并确认 `q` 已被置 NULL。

测试数据（Alice/Bob/…/Noah、Mark 按 1xx/2xx/3xx 分段）便于肉眼核对输出顺序是否符合“后进先出/先进先出”。测试覆盖了每个容器的正常主路径，但**没有覆盖空容器销毁、malloc 失败等边界路径**——第 1 号已知问题正是因此未被发现。

## 已知问题与改进建议

1. **【最严重·真实 bug】`InitLLQueue` 中头结点 `Hard` 的 `Next` 未初始化，且外壳 `Q` 的 malloc 失败未检查**（`LinkListQueue.c:14-22`）。
   - 后果 A：若初始化后**从未 Push** 就直接 `DeleteLLQueue`/`DestroyLLQueue`，`DeleteLLQueue` 从 `Queue->Front->Next`（垃圾值）开始 `while (Temp != NULL)` 遍历 → 解引用野指针，崩溃/未定义行为。主测试先 Push 再 Destroy，恰好掩盖了它。
   - 后果 B：`malloc` 外壳失败时仍继续解引用 `Q`；若 `Hard` malloc 失败则提前返回 `false`，此时已分配的 `Q` 外壳泄漏。
   - 修复建议：`InitLLQueue` 中分别判 `Q`、`Hard` 是否为空（失败时把已分配的先 `free` 掉再返回 `false`），并对 `Hard` 执行 `memset(Hard, 0, sizeof(*Hard))` 或 `Hard->Next = NULL`。

2. **`DestroyStack` 无 NULL 判空**（`Stack.c:64-67`）：`Stack == NULL` 时直接崩溃，与同文件其它函数统一判空的风格矛盾。另 `StackEmpty(NULL)` 打印“未初始化”却返回 `false`（相当于报“非空”），语义颠倒，建议 NULL 时返回明确错误语义。

3. **判空/判满等“查询类”函数带打印副作用**：`SLLS_StackEmpty` 每次调用都会输出 “is empty / is not empty”，`StackEmpty(NULL)`、`SLLS_CleanStack` 空栈时也打印。作为教学演示可以接受，但作为可复用库函数不干净；且 `SLLS_StackEmpty` 用 `First==NULL && StackSize==0` 双条件绑定判空，两者不同步时会误报。建议：纯函数只返回 bool，提示文案移到测试/调用层。

4. **`SLLS_CleanStack` 对空栈返回 `false`**：“清空一个空栈”应视为成功，当前实现却报失败并打印“uninitialized or Empty”，返回值语义不对。建议空栈时直接 `return true`。

5. **跨平台与依赖问题**：`Stack.h` 引入了 `windows.h` 但代码里并未使用任何 Win32 API，导致该模块无法在非 Windows 平台编译；`Queue.c`/`LinkListQueue.c` 注释日期为 `2026/8/28`（疑为笔误）。建议去掉无用头文件、修正注释。

6. **命名与拼写（多处）**：栈顶字段名 `TopPrint`（疑为 Top）；链式栈局部变量 `ToFreeNude`（Node）；链队插入函数内 `InsetData`（Insert）；提示语 “Stark/Was Fail” 等；`typedef struct DataUnit` 的标签名与“数据单元”含义不符（结构体本义是“栈”）。`Queue` 的 `InQueue/PopQueue/GetQueue` 与 `Push/Pop` 命名不统一。头文件同时使用 `#pragma once` 与 include guard（无害冗余）。

7. **循环队列实际容量为 49**（牺牲一格判满，教科书标准做法），但代码无任何注释说明，读者容易误以为能存满 50 个。建议在 `Queue.h` 注释或 README 中说明；若想存满 50，可改用 `size` 计数法判满。

8. **`DeleteLLQueue` 命名误导**：名字像“销毁队列”，实际语义是“清空数据结点、保留头结点”。结合 bug 1，建议把“先判空队再遍历”写进函数自身（当前它对空队直接读 `Front->Next`），或改名 `ClearLLQueue`。

9. 测试覆盖不足：4 个 `test*` 只走正常主路径。建议补充边界用例（空栈/空队 Pop、顺序栈满 Push、InitLLQueue 后立即 Destroy、malloc 失败注入），这些用例能立刻暴露问题 1/2/4。
