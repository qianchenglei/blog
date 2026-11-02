---
title: 二叉树：顺序存储、链式存储与七次踩坑
date: 2026-11-02
tags: ["课程","计算机学科基础","数据结构（ds）","树与二叉树"]
summary: 二叉树的两种存储（数组下标映射 / 指针左右孩子）写完一遍的总结：三条下标公式、遍历只差 visit 的位置、判完全二叉树的两种方言，以及七个真正踩过的坑（==写成=、%C 大写、漏跳空槽、const 传染…）。
---

## 是什么

二叉树是每个结点至多两棵子树的树。它的定义**本身就是递归的**：

> 一棵二叉树 = 一个根 + 左子树 + 右子树，而左右子树也是二叉树。

这句话决定了后面所有算法的形状——**绝大部分树算法都是"问左、问右、组合"**。

同一个 ADT，有两条实现路线：

| | 顺序存储 | 链式存储 |
| --- | --- | --- |
| 结构 | 一个数组 + 一个上界 | 结点 + 两个指针 |
| 父子关系 | 下标算出来 | 指针指出来 |
| 适合 | 完全二叉树 | 任意形状 |
| 本工程 | `05-tree/sq-bi-tree` | `05-tree/linked-bi-tree` |

---

## 一、顺序存储：把树摊进数组

### 座位表模型

把整棵树按层从上到下、从左到右编号入座，`data[1]` 是根，`data[0]` 永久空着不用。

父子关系完全不存，**靠下标算术现算**：

| 关系 | 公式 |
| --- | --- |
| 左孩子 | `2 * i` |
| 右孩子 | `2 * i + 1` |
| 父亲 | `i / 2`（向下取整） |

```c
#define MaxChindUnit 99
typedef char ElemType;

typedef struct SqBinaryTree {
    ElemType data[MaxChindUnit + 1];   // data[0] 空着，结点住 1..n
    int n;                             // 最后一个实心槽位的下标
} SqBinaryTree;
```

### `n` 不是结点数

这是第一个容易想歪的地方。

`"AB#D"` 表示 A 的左右是 B、空，B 的右孩子是 D：

```
data[1]=A  data[2]=B  data[3]=空  data[4]=D
```

槽位用到 4 号，但实际只有 **3 个结点**。

> `n` 是"最后一个有人住的槽位门牌号"，不是"住了多少户"。

**所以结点数必须靠遍历去数，不能直接读 `n`。** 只有在完全二叉树上两者才碰巧相等——这也是为什么用带空洞的用例才测得出错。

### 建树：`#` 存成 0

```c
void CreateBinaryTree(SqBinaryTree *T, const ElemType *S) {
    InItBinaryTree(T);                        // 先清场，防旧数据残留
    for (int i = 1; S[i - 1] != '\0' && i < MaxChindUnit + 1; i++) {
        if (S[i - 1] == '#') {
            T->data[i] = 0;                   // 空位存 0，占住下标
        } else {
            T->data[i] = S[i - 1];
            T->n = i;                         // 只有实心槽才推进边界
        }
    }
}
```

**空位必须占住下标**，否则后面的结点全部错位。存成 `0`（也就是 `'\0'`）还有个好处：`!data[i]` 判断特别顺手。

### 代价：非完全树会浪费到离谱

深度为 h 的单支树只有 h 个结点，却要占 `2^h - 1` 个槽位。

```
A 只有右孩子 B，B 只有右孩子 C，C 只有右孩子 D
编号：A=1、B=3、C=7、D=15
4 个结点，数组得开到 15 格，其中 11 格永久空着
```

**这就是"顺序存储只用于完全二叉树"的真正原因**——不是不能存，是浪费随深度指数增长。

---

## 二、链式存储：两个指针

```c
typedef char ElementType;

typedef struct BinaryTreeNode {
    struct BinaryTreeNode *Left;
    ElementType data;
    struct BinaryTreeNode *Right;
} BinaryTreeNode, BinaryTree;      // 注意 BinaryTree 是结构体本身，不是指针
```

### 2n 个指针域，只有 n-1 个有用

n 个结点，每个 2 个指针域，共 **2n** 个。
整棵树只有 n-1 条边（除根外每个结点恰好被指一次），所以非空指针只有 **n-1** 个。
空指针数量：

> **2n − (n−1) = n + 1**

7 个结点的满二叉树：14 个指针域，6 个非空，**8 个空着**。这个恒等式在任何二叉树上都成立，是线索二叉树的出发点——**那 n+1 个空指针太浪费了，回收它们就得到线索二叉树。**

### 建树：先序串 + 移动游标

顺序存储吃层序串，链式这里吃**先序串**（`#` 表示空子树）。两者不能混用。

```c
static char SeqNext(const ElementType **Seq) {
    char Ch = **Seq;
    if (Ch != '\0') (*Seq)++;      // 读到结尾就不再前进，避免越界
    return Ch;
}

void BuildBiTree(BinaryTree **root, const ElementType **Seq) {
    char Ch = SeqNext(Seq);

    if (Ch == '#' || Ch == '\0') {
        *root = NULL;              // 星号不能少，改的是调用者的指针
        return;
    }

    BinaryTreeNode *Node = NewNode(Ch);
    BuildBiTree(&Node->Left,  Seq);   // 递归建左
    BuildBiTree(&Node->Right, Seq);   // 递归建右
    *root = Node;                     // 孩子全建好才挂上去
}
```

`*root = NULL` 那行的星号是最典型的静默 bug：写成 `root = NULL` 只改了形参这个局部副本，调用者的指针纹丝不动。

---

## 三、三种遍历：只差一行

三种遍历是**同一个 DFS 的三种访问时机**，路线完全相同，区别只在 `visit` 放在哪。

```c
void PreOrder(const SqBinaryTree *T, int index) {     // 根左右
    if (index > T->n || !T->data[index]) return;
    visit(T->data[index]);
    PreOrder(T, 2 * index);
    PreOrder(T, 2 * index + 1);
}

void InOrder(const SqBinaryTree *T, int index) {      // 左根右
    if (index > T->n || !T->data[index]) return;
    InOrder(T, 2 * index);
    visit(T->data[index]);
    InOrder(T, 2 * index + 1);
}

void PostOrder(const SqBinaryTree *T, int index) {    // 左右根
    if (index > T->n || !T->data[index]) return;
    PostOrder(T, 2 * index);
    PostOrder(T, 2 * index + 1);
    visit(T->data[index]);
}
```

链式版一模一样，只是 `2*index` 换成 `node->Left`，出口从"下标越界或空槽"换成"指针为空"：

```c
void PreOrder(BinaryTree *node) {
    if (node == NULL) return;
    visit(node->data);
    PreOrder(node->Left);
    PreOrder(node->Right);
}
```

**链式版反而更短**——因为不用管越界，也不用区分"越界"和"空槽"两种空。

### 那行 `if` 是递归出口，不是防御性检查

`if (index > T->n || !T->data[index]) return;` 的两个条件对应两种完全不同的"没东西"：

| 情况 | 例子 | 谁挡住 |
| --- | --- | --- |
| 编号超出范围 | `index = 10`，但 `n = 5` | `index > T->n` |
| 编号合法但没人住 | `index = 4`，`n = 5`，`data[4] = 0` | `!T->data[index]` |

`||` 的短路顺序**不能反**：范围检查必须在左边，否则 `index` 越界时会先去读 `data[index]`。

---

## 四、非递归遍历：显式栈

递归用的是系统栈，深度大了会爆。改用显式栈，先序就这么写：

```c
void PreOrderIter(BinaryTree root) {
    if (root == NULL) return;

    Stack s;
    InitStack(&s);
    Push(&s, root);

    while (!StackEmpty(&s)) {
        BinaryTree node;
        Pop(&s, &node);
        visit(node->data);

        if (node->Right) Push(&s, node->Right);   // 先压右
        if (node->Left)  Push(&s, node->Left);    // 后压左
    }
}
```

**唯一要死记的一点：先压右、后压左。** 栈是后进先出，要让左孩子先出，就得让它后进。写反了不报错，输出变成"根右左"。

中序要麻烦一层，必须先一路走到最左：

```c
void InOrderIter(BinaryTree root) {
    Stack s; InitStack(&s);
    BinaryTree p = root;

    while (p != NULL || !StackEmpty(&s)) {
        while (p != NULL) {          // 一路压到最左
            Push(&s, p);
            p = p->Left;
        }
        Pop(&s, &p);
        visit(p->data);
        p = p->Right;
    }
}
```

后序最难——栈里看不出回来的是左孩子还是右孩子，得加一个 `lastVisit` 指针判断"右孩子是不是刚回来"。

**所以：先序最容易转非递归，中序次之，后序最难。**

---

## 五、判完全二叉树：两种方言

"完全"的定义是**层序编号 1..n 连续，中间不能跳号**。

注意这不是"左右孩子齐不齐"。下面两棵树左右看着都正常，但左边那棵的 D 是 C 的左孩子（编号 5），跳过 4 号，**不是**完全二叉树：

```
    A              A
   / \            / \
  B   C          B   C
     /          /
    D          D
  编号 1,2,3,5   编号 1,2,3,4
```

### 顺序存储：一个等号

数组里 `n` 就是最大编号，所以：

```c
bool IsComplete(const SqBinaryTree *T) {
    return NodeCount(T) == T->n;      // 结点数 == 最大编号 ⟺ 没跳号
}
```

### 链式存储：自己造编号

链式没有下标，得用参数把编号传下去：

```c
static void scan(const BinaryTree *root, int idx, int *count, int *maxIdx) {
    if (root == NULL) return;

    (*count)++;
    if (idx > *maxIdx) *maxIdx = idx;          // 记最大编号

    scan(root->Left,  2 * idx,     count, maxIdx);
    scan(root->Right, 2 * idx + 1, count, maxIdx);
}

bool IsComplete(const BinaryTree *Root) {
    int count = 0, maxIdx = 0;
    scan(Root, 1, &count, &maxIdx);
    return count == maxIdx;
}
```

**这两个函数是同一句话的两种方言**：一个用现成的 `n`，一个自己记 `maxIdx`。

### 为什么不用 BFS

BFS 判完全二叉树是最贴合定义的做法：队列里遇到空结点后，不允许再出现非空结点。但链式存储**没有"后面"这个概念**——树只定义父子，不定义邻居，必须先用队列把结点按层序排队出来，"后面"才成立。

所以两条路：

| 路线 | 需要 | 备注 |
| --- | --- | --- |
| BFS + 空标记 | 队列 | 最直观，代码也最长 |
| DFS + 编号 | 递归即可 | 15 行，但有溢出风险 |

**编号法的隐患**：`idx` 是 `int`，一棵 32 层的退化单支树编号就到 `2^31`，溢出成负数，判据直接失效。BFS 没有这个问题。所以工程上 BFS 更稳，考试里编号法更快。

---

## 六、踩过的七个坑

写这一遍真正卡住的地方，按杀伤力排序。

### 1. 两个等号：`T->n == i`

```c
T->n == i;      // 比较，结果被丢弃
T->n = i;       // 赋值
```

编译器基本不拦，运行时**不崩、不报错、一点输出都没有**。这类"编译通过、静默失败"最难查。

**解法**：开 `-Wall -Wextra`，或者干脆 `-Werror`。

### 2. `%C` 写成大写

```c
printf("%C", c);    // 宽字符格式符，不是 %c
printf("%c", c);    // 对
```

`%C` 在 glibc 下要求 `wint_t` 参数，传 `char` 轻则警告重则乱码。**C 是大小写敏感的语言，不是风格问题。**

### 3. 叶子数把空槽也算进去了

```c
for (int i = 1; i <= T->n; i++) {
    int L = 2*i, r = L+1;
    int HasL = (L <= T->n && T->data[L]);
    int HasR = (r <= T->n && T->data[r]);
    if (!HasL && !HasR) cnt++;      // ✗ 4 号是空槽，也被判成叶子
}
```

`"ABC#D"` 跑出 3 个叶子（正确是 2 个：C 和 D）。**漏了一行 `if (!T->data[i]) continue;`。**

这个 bug 是被性质抓住的：4 个结点的树不可能有 3 个叶子——`n0 = n2 + 1` 一算就矛盾。**这就是把公式写成断言的用处。**

### 4. `IsComplete` 连续三次写反

第一版：`if (T->data[i] != 0) return false;`（找到一个结点就判否）
第二版：内层 `for (int j = 1; ...) { return false; }`（循环第一轮就 return，等于无条件 false）
第三版：`== 0` 对了，但内层从 `j = 1` 开始，把前面又扫一遍

教训：**两层嵌套里"外层找什么、内层从哪开始"，光看代码看不出来，必须拿一个具体用例手推。**

`"AB#D"` 推一遍：`i=1` 是 A，非零——如果这里就返回 false，说明逻辑反了。**一秒暴露，比盯代码十分钟管用。**

### 5. const 传染

```c
bool IsBiTreeEmpty(BinaryTree *Root);          // 参数没 const
bool BiTreeDepth(const BinaryTree *Root) {     // 这里传进去就报警告
    if (IsBiTreeEmpty(Root)) { ... }           // discards 'const' qualifier
}
```

规则：**一个 `const` 指针只能传给同样接受 `const` 的函数。** 所以只读函数必须一律加 `const`，否则会卡住所有调用者。

### 6. 栈里存结构体而不是指针

```c
typedef BinaryTree StackElement;         // 存 24 字节的副本
S->data[S->top] = NULL;                  // ✗ void* 赋给结构体，类型错误
```

改成 `typedef BinaryTree *StackElement;` 才对。**栈里该放"结点在哪"，不是"结点长什么样"。**

### 7. `.C` 后缀在 Linux 上是 C++

文件叫 `SqBinaryTree.C`，`CMakeLists.txt` 里写 `SqBinaryTree.c`，报"找不到源文件"。

Linux 严格区分大小写，而且大写 `.C` 有固定含义——**C++ 源文件**，CMake 会去调 `g++`。Windows 上这一切都不存在（不区分大小写），所以迁移到 WSL 才暴露。

---

## 七、取舍

| | 顺序存储 | 链式存储 |
| --- | --- | --- |
| 空间 | 固定 `MAX`，非完全树浪费严重 | 每结点 24 字节 + n+1 个空指针 |
| 找孩子 | `2i` / `2i+1`，O(1) | `->Left` / `->Right`，O(1) |
| 找父亲 | `i/2`，O(1) | 需要三叉链表或从头找，O(n) |
| 判完全 | 一个等号 | 要造编号或上队列 |
| 层序信息 | 天然有序 | 必须用队列重建 |
| 插入删除 | 牵动整棵树编号，几乎不做 | 改指针即可 |

一句话总结：**顺序存储的优势是"位置天生有序"，劣势也是"位置被锁死"。**

而"完全二叉树"这个限制，本质上就是在说：**只有形状规整到能塞满前缀的树，才配得上位置带来的好处。**

---

## 附：两种实现的对答案

同一棵逻辑树，两种写法，输出必须逐字一致。

`ABCDEFG`（满树，3 层）：

| 遍历 | 预期 |
| --- | --- |
| 先序 | `A B D E C F G` |
| 中序 | `D B E A F C G` |
| 后序 | `D E B F G C A` |
| 结点数 | 7 |
| 叶子数 | 4 |
| 深度 | 3 |

**两套代码跑出同一个结果，才说明你真的理解了"存储方式不影响 ADT"。**
