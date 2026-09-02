---
title: 队列（StackAndHeap）：循环队列与带头结点链式队列
date: 2026-09-02
tags: ["课程","计算机学科基础","数据结构（ds）","栈和队列"]
summary: 队列（FIFO）的两种实现总结：定长数组的循环队列 + 带头结点链式队列；含 InitLLQueue 头结点 Next 未初始化（未 Push 即销毁会崩）等坑。
---

## 是什么

队列（Queue）是只允许在**一端入队、另一端出队**的线性表，先进先出（FIFO）。它是受限的线性表，在《数据结构与算法》(13003) 中属于"栈和队列"章节，也是层次遍历、BFS、缓冲区等算法的实现基础。

本工程（`duizhan/StackAndHeap`）把队列实现了两种存储形态：

- **顺序循环队列**（定长数组 + 队头/队尾游标）—— `ArrayQueue`，`Queue.h/.c`
- **链式队列**（带头结点的单链表）—— `LLQueue`，`LinkListQueue.h/.c`

栈部分（顺序栈、链式栈）在另一篇笔记《栈》里讲。两个 ADT 共用同一数据单元 `BaseDataUnit`（编号 Mark + 性别 Gender + 姓名 Name）。

> ⚠️ 说明：目录名叫 `StackAndHeap`（栈与堆），但代码里**并没有实现"堆"**——队列相关内容请勿按"堆"去查。

## 文件结构（队列相关）

| 文件 | 作用 |
| --- | --- |
| `DataType.h` | 公共头：定义统一数据单元 `BaseDataUnit`（Mark / Gender / Name）与 `MaxNameSize` |
| `Queue.h` / `Queue.c` | **循环队列**：定长数组 + `Front`/`Rear` 游标，牺牲一个单元判满，循环利用数组 |
| `LinkListQueue.h` / `.c` | **链式队列**：带头结点单链表队列，`Init/Destroy` 用二级指针把外部指针置 NULL |
| `StackAndHeap.c` | 主程序：`printData` + 各 `test*` 自动化测试（队列的两个测试在这里） |

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

- 循环队列用 `(Rear+1) % MaxArraySize == Front` 判满，即**牺牲一个存储单元**区分"空/满"（空：`Front == Rear`）；队头队尾下标按模推进，数组可循环复用。
- 链式队列带**哑头结点**：`Front` 恒指向不存数据的头结点，`Front == Rear` 表示空队（此时 `Rear` 可能指回头结点）。
- `DestroyLLQueue` 接收 `LLQueue **`，销毁后把外部指针置 `NULL`，防止悬垂指针——这是几个容器里接口设计最讲究的一个。

### 核心函数

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

1. **`InQueue` / `PopQueue` / `GetQueue`**：入队 `Data[Rear]=*Data; Rear=(Rear+1)%Max`；出队带回 `Data[Front]` 后 `Front` 模推进；取队头只读 `Data[Front]`。三者均先判空/满、对 `NULL` 返回 `false`，边界处理是本工程最工整的一组。注意点：入/出队参数是 `BaseDataUnit *`（指针）而其它容器的入参是值——风格不一致；判满用"牺牲一格"法，**实际最多存 49 个元素**而非 50。

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

2. **`InitLLQueue`**：先 `malloc` 外壳 `Q` 再 `malloc` 头结点 `Hard`，`Front=Rear=Hard`。注意点：**只检查了 `Hard` 的 malloc 失败、没检查 `Q` 的 malloc 失败；`Hard->Next` 申请后从未初始化**——这是本工程最值得警惕的一处，见已知问题 1。
3. **`PopLLQueue`**：空队先判 `Front==Rear`；否则取 `Front->Next`（真正的首元素）带回数据、摘链、`free`，且**当弹出的是最后一个元素时把 `Rear` 收回指向头结点**——尾指针维护正确，是带头结点链队最容易写错的地方，这里写对了。配合 `PushLLQueue`（尾插 `Rear->Next = new; Rear = new`）出入队均 `O(1)`。
4. **`DestroyLLQueue`**：调 `DeleteLLQueue` 清空数据结点 → `free` 外壳 → `*Queue = NULL`，杜绝悬垂。注意点：`DeleteLLQueue` 名为"Delete"（易误读为销毁整个队列），实际只清空数据结点；而它从 `Front->Next` 开始遍历，与已知问题 1 联动。

## 交互/测试

`StackAndHeap.c` 的 `main` **没有交互菜单**，而是顺序执行自动化演示函数，每步打印 `success/fail`，跑完退出。队列相关两个：

1. `testQueue()` —— 循环队列：入 Grace/Henry/Ivy → GetQueue → Pop×2 → 再入 Jack 验证游标绕回（循环复用）→ Destroy。
2. `testLinkListQueue()` —— 链式队列：入 Kate/Leo/Mia → GetFirst → Pop×2 → 再入 Noah → `DeleteLLQueue` 清空 → `DestroyLLQueue(&q)` 并确认 `q` 已被置 NULL。

> 测试覆盖了正常主路径，但**没有覆盖空容器销毁、malloc 失败等边界路径**——已知问题 1 正是因此未被发现（先 Push 再 Destroy 的顺序恰好掩盖了它）。

## 已知问题与改进建议

1. **【最严重·真实 bug】`InitLLQueue` 中头结点 `Hard` 的 `Next` 未初始化，且外壳 `Q` 的 malloc 失败未检查**（`LinkListQueue.c:14-22`）。
   - 后果 A：若初始化后**从未 Push** 就直接 `DeleteLLQueue`/`DestroyLLQueue`，`DeleteLLQueue` 从 `Queue->Front->Next`（垃圾值）开始 `while (Temp != NULL)` 遍历 → 解引用野指针，崩溃/未定义行为。主测试先 Push 再 Destroy，恰好掩盖了它。
   - 后果 B：`malloc` 外壳失败时仍继续解引用 `Q`；若 `Hard` malloc 失败则提前返回 `false`，此时已分配的 `Q` 外壳泄漏。
   - 修复建议：`InitLLQueue` 分别判 `Q`、`Hard` 是否为空（失败时把已分配的 `free` 掉再返回 `false`），并对 `Hard` 执行 `memset(Hard, 0, sizeof(*Hard))` 或 `Hard->Next = NULL`。
2. **循环队列实际容量为 49**（牺牲一格判满，教科书标准做法），但代码无注释说明，读者容易误以为能存满 50 个。建议在 `Queue.h` 注明；若想存满 50，可改用 `size` 计数法判满。
3. **`DeleteLLQueue` 命名误导**：名字像"销毁队列"，实际语义是"清空数据结点、保留头结点"。结合问题 1，建议把"先判空队再遍历"写进函数自身（当前它对空队直接读 `Front->Next`），或改名 `ClearLLQueue`。
4. **命名不统一**：`Queue` 的 `InQueue/PopQueue/GetQueue` 与 `PushLLQueue/PopLLQueue` 的 `Push/Pop` 命名风格不一致；链队插入函数内局部变量 `InsetData`（Insert 拼错）。
5. **测试覆盖不足**：建议补充边界用例（空队 Pop、`InitLLQueue` 后立即 Destroy、malloc 失败注入），能立刻暴露问题 1。

## 相关

栈（顺序栈 + 链式栈）见笔记《栈》；栈与队列同属 `duizhan/StackAndHeap` 工程。
