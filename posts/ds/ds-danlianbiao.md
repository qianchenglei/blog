---
title: 单链表（danlianbiao）：带头结点链表与学生记录
date: 2026-09-02
tags: ["课程","计算机学科基础","数据结构（ds）","线性表"]
summary: 带头结点单链表总结：初始化、头/尾/按位插入、多种方式查找；当前头文件与实现不一致无法编译，尾插自环、全程漏 free。
---


## 是什么

**单链表**是线性表的链式存储结构：每个元素（结点）在内存中不连续存放，结点间通过指针串成一条链。相比顺序表（数组），单链表的插入、删除不需要移动大量元素，代价是无法按下标随机访问、且每个结点要额外存一个指针。

本工程用一个带头结点的单链表实现了一个命令行“学生成绩记录管理”小程序，数据域是一份学生记录 `Students_Data`（成绩、姓名、性别、UUID），实现了：初始化链表、按位置插入、按 UUID/成绩/姓名/性别查找、求表长、遍历打印等操作，并用两个控制台菜单（`main()` 的主菜单 + `sub()` 的二级菜单）驱动演示。

从《数据结构与算法》(13003) 的角度看，本工程对应**“线性表——单链表”**部分：头结点哨兵、按位插入、头插/尾插、按值查找、删除、遍历这些教材中的经典操作都能在代码里找到对应实现（部分实现有缺陷，见文末“已知问题”），是一份用于复习链表基本操作的练习代码。

> ⚠️ 特别提醒：当前目录里的 `.h` 与 `.c` 并不一致（见“已知问题”第 1 条），源码处在某次改动的中间状态，**按现状无法直接编译通过**。以下对“功能”的描述均按代码意图与菜单文字整理。

## 文件结构

| 文件 | 作用 |
| --- | --- |
| `danlianbiao.h` | 头文件：学生记录与链表结点两个数据结构定义、全局链表头指针 `extern` 声明、`InitSingleLinkList` 函数原型（注意：include guard 缺少 `#define`，且原型与实现不一致，见已知问题） |
| `danlianbiao.c` | 链表操作实现：初始化、按位插入、头插/尾插、按索引/成绩/姓名/性别/UUID 查找、删除（未接入菜单）、二级交互菜单 `sub()`、UUID 生成 `GenerateUID()` |
| `main.c` | 程序入口：定义全局链表 `SingleLinkList`、`srand()` 播种、主菜单交互循环（菜单项 1–9，其中 9 进入 `sub()` 二级菜单） |

（目录中的 `SingleLinkLIst.sln / .vcxproj` 是 Visual Studio 工程文件，与源码逻辑无关。提示：本工程源文件为 GBK/ANSI 编码，用 VS 或按 GB2312/ANSI 打开可正常显示中文注释。）

## 核心设计

### 数据结构

带头结点的单链表：`InitSingleLinkList` 会先 `calloc` 一个**头结点（哨兵）**，头结点的数据区不使用，数据从 `NextDataNode` 开始挂接。所有结点结构体相同，头结点与数据结点是同一类型。

```c
#define MaxStudentNameSize 50

typedef struct Students_Data
{
    int  StudentsMark;      /* 成绩 */
    char StudentName[MaxStudentNameSize];
    bool StudentGender;     /* 界面约定 0=男 1=女（与 lianbiao 工程相反，见下） */
    int  StudentUUID;       /* 学号/记录编号，实际由 GenerateUID() 生成后截断存入（见已知问题） */
} Students_Data;

typedef struct SingleLinkList_Data
{
    Students_Data Students_Data;
    SingleLinkList_Data *NextDataNode;   /* 头文件原文如此：C 语言中此处须写 struct 前缀 */
} SingleLinkList_Data;

extern SingleLinkList_Data* SingleLinkList;   /* 全局链表头（在 main.c 中定义） */
```

几点说明：

- 类型名 `Students_Data` 与成员名 `Students_Data` 同名（结构体字段名与类型名分属不同命名空间，合法但易混淆）；
- 结构体内部递归引用 `SingleLinkList_Data *NextDataNode` 没写 `struct` 前缀——在 C++ 里靠“注入类名”合法，**在纯 C 编译下会报语法错误**；
- 本工程性别编码是 `false(0)=男`、`true(1)=女`（菜单提示 “0 for man 1 for female”，打印 “Manl/famanl”），与同目录兄弟工程 `lianbiao`（0=女、1=男）正好相反；
- `.c` 代码里多处出现 `EndDataNode`（尾指针）成员访问，但头文件的结构体里**并没有这个成员**——这是旧版带尾指针设计与当前版本混在一起的残留。

### 核心函数

| 函数（签名） | 作用与注意点 |
| --- | --- |
| `bool InitSingleLinkList(SingleLinkList_Data** List)`（`.c` 内实现） | 分配并初始化一个头结点。注意：头文件里声明的原型是 `InitSingleLinkList(SingleLinkList_Data* List)`，**声明与定义参数不一致**，会直接造成编译冲突；实现里还访问了不存在的 `EndDataNode`，`calloc` 之后再 `memset` 也属冗余。 |
| `bool AddEumeForTheList(SingleLinkList_Data** List, Students_Data, int Index)` | 按 1 起始的位置插入：`Index=1` 插到第一个数据位，`Index=表长+1` 相当于尾插；遍历中若 `NextDataNode` 已为 NULL 会提前返回 false（索引过大则插入失败）。插入点找错/找不到都会静默失败，调用方只能看到 true/false。 |
| `int SingleLinkListLength(SingleLinkList_Data* List)` | 从头结点下一结点数起，返回**数据结点个数**（不计哨兵头）。仅当 `List==NULL` 才返回 -1，空表返回 0，调用方把 -1 当“空表”提示，逻辑上勉强可用。 |
| `int LookingSingleLinkListByIndex(...)` / `ByMark` / `ByName` / `ByGender` / `ByUUID` | 按条件查找。ByIndex 通过 `BackData` 回传命中结点；ByMark/Name/UUID 会把所有命中记录**追加到调用方提供的“结果链表”**（把 `&data` 当新链头，用 `AddEumeForTheList` 逐个插入），ByGender 同样。注意：这几个函数遍历起点不一致（ByMark/ByName/ByUUID 从**头结点**开始、会把哨兵头结点当数据参与匹配），返回的 `Count` 是“命中条数”，且结果链上的 malloc 结点从不释放。 |
| `int LookingSingleInsertForTheListBeing(...)` | 头插：新结点插到头结点之后，返回 0。逻辑本身正确，但返回码恒为 0，无失败分支。 |
| `int LookingSingleInsertForTheListEding(...)` | 尾插：**有严重逻辑错误**（见已知问题 3）——先给“尾指针”赋值再判空，导致判空分支恒不执行，新结点把自己链到自己形成环；且全程依赖不存在的 `EndDataNode` 成员，本函数实际不可用。 |
| `Students_Data DeleteSingleInsertDataUnit(SingleLinkList_Data** List, int Index)` | 按位置删除（死代码，未被任何菜单调用）。遍历循环写错：`ForwardData = (*List)->NextDataNode;` 每次迭代都重置回第一个数据结点，`Index≥2` 时删的是错的结点；越界时 `DeleteNode` 为 NULL 会被解引用崩溃；`free` 之后才拿 `DeleteNode==NULL` 去比尾指针，比较恒假；函数声明返回 `Students_Data` 却写 `return ;`（空返回）。 |
| `long long GenerateUID()` | 生成“唯一编号”：`time(NULL)*10000 + rand()%10000`。注意：返回值是 `long long` 却被塞进 `int` 型成员 `StudentUUID`，数值溢出被截断；同一秒内连续插入时 `rand` 序列若不前进还可能撞号。 |
| `void sub()` | 二级菜单（见下节“交互/测试”）。整段代码与 `main()` 的菜单几乎复制粘贴。 |

## 交互 / 测试

运行后先打印欢迎语并连续执行两次 `InitSingleLinkList`（第 5、7 行各一次），然后进入 `while(1)` 主菜单，按提示输入 0–9：

- **1 查看帮助（System Memo）**：列出各菜单项含义；
- **2 初始化链表**：再次 `InitSingleLinkList`（会覆盖现有链表头指针）；
- **3 插入一条学生记录**：依次输入成绩、姓名、性别(0 男/1 女)、位置 index，UUID 自动生成，调 `AddEumeForTheList` 按位插入；
- **4 求链表长度**；
- **5 按位置查找**：输入 index，调 `LookingSingleLinkListByIndex`；
- **6 / 7 / 8 按成绩 / 姓名 / 性别查找**：把命中记录链到局部 `data` 后面逐个打印；
- **9 进入二级菜单（NextLever → sub()）**：二级菜单里提供 1 看帮助、2 按 UUID 查找、3 头插、4 尾插、0 返回。其中“4 尾插”因 `LookingSingleInsertForTheListEding` 的 bug 实际不可用。

**测试要点**：头插、按位插入、按成绩/姓名/性别/索引查找、求长度在数据量小时都能演示；删除功能没有任何入口；二级菜单的尾插会破坏链表结构（自环）；按 UUID 找 0（或成绩 0、空姓名、性别男）会把哨兵头结点当一条记录列出。

菜单退出方式：没有退出选项，只能 Ctrl+C 结束进程（进程结束前所有堆内存都不会释放）。

## 已知问题与改进建议

以下按严重程度列出阅读源码时发现的问题（含真实 bug）：

1. **【编译性硬伤】当前源码无法一致编译**（最关键，建议先修）：
   - `danlianbiao.h` 的 include guard 只有 `#ifndef DANLIANBIAO_H`，**没有配对的 `#define DANLIANBIAO_H`**，多次包含时内容会被重复处理；
   - 头文件声明 `InitSingleLinkList(SingleLinkList_Data *List)`，实现却是 `(SingleLinkList_Data** List)`，声明与定义冲突；
   - `.c` 内 `InitSingleLinkList`、`LookingSingleInsertForTheListEding`、`DeleteSingleInsertDataUnit` 多处访问 `EndDataNode`，**该成员在结构体中不存在**（旧版残留）；
   - 结构体内部递归指针未加 `struct` 前缀，纯 C 模式编译会报语法错误；
   - `main.c`/`sub()` 调用的很多函数（`AddEumeForTheList`、`GenerateUID`、各类查找等）在头文件中都没有原型，靠 C89 隐式声明才能编过。
   - 改进：补全 guard 的 `#define`、统一原型并补齐所有函数声明、把递归指针改为 `struct SingleLinkList_Data*`、删掉对 `EndDataNode` 的引用（或重新加回该成员并修正所有尾插/尾删逻辑）。

2. **【内存泄漏】** 无任何 `free`/销毁路径：
   - `main()` 开头连续两次 `InitSingleLinkList(&SingleLinkList)`（第 5、7 行），第二次分配的新头直接覆盖第一次的指针，第一块内存泄漏；同时“欢迎语”也打印了两遍（疑似复制粘贴遗留）；
   - 主菜单“2 初始化”重初始化同样直接覆盖旧头指针，**旧链表全部已插入结点泄漏**；
   - 各查找函数用 `AddEumeForTheList` 往结果链表里 malloc 的结点从不释放；进程退出也没有销毁链表的函数。
   - 改进：新增 `DestroyList`/退出时逐结点 `free`；重初始化前先释放旧链；查找结果链用后释放。

3. **【真实逻辑错误】`LookingSingleInsertForTheListEding`（尾插）形成自环**：
   `(*List)->EndDataNode = InsertData;` 这行先执行，紧接着 `if ((*List)->EndDataNode == NULL)` 恒为假，必然走进 else 分支把 `InsertData->NextDataNode` 设成它自己 → 插入即成环，链表被破坏；正确写法应是先判空、头插或遍历到表尾再挂接、最后才更新尾指针。
4. **【真实逻辑错误】`DeleteSingleInsertDataUnit`（按位删除）**（目前是死代码）：前驱定位循环每轮都把 `ForwardData` 重置为第一个数据结点，`Index≥2` 时删错对象；索引越界时 `ForwardData->NextDataNode` 为 NULL，接着 `DeleteNode->NextDataNode` 空指针解引用会崩溃；`free` 后再比较尾指针因 `DeleteNode` 已置 NULL 而恒假，尾指针永远回退不了；且函数声明返回 `Students_Data` 却无返回值。
5. **【真实逻辑错误】查找遍历把哨兵头结点当数据参与匹配**：ByMark/ByName/ByUUID 从 `List`（头结点）开始遍历而 ByGender 从 `List->NextDataNode` 开始，行为不一致；当查找 UUID=0、成绩=0、姓名为空串或性别=男(0) 时，会把哨兵头结点里全 0 的数据当成一条记录追加进结果。应统一从 `List->NextDataNode` 开始，且只遍历数据结点。
6. **【边界/语义问题】按位置查找 `LookingSingleLinkListByIndex`**：越界时不返回 -1，而是返回**末尾结点的数据**并回传一个“遍历步数”；返回值和打印的 “The data base was at %d” 是步数/命中数而不是位置本身，展示给用户的“位置”经常是错的。循环里同时维护 `Count` 与 `CurrentIndex` 两套计数，正是出错根源，应只留一套并在越界时明确报错。
7. **【类型/越界风险】UUID 与性别读写**：`GenerateUID()` 返回 `long long`，存入 `int` 成员会被截断（时间戳×10000 远超 int 范围）；`scanf("%d", &TempData.StudentGender)` 向 1 字节的 `bool` 写 4 字节，属未定义行为（会写穿到相邻字段，当前因随后立即重赋 `StudentUUID` 才未显形）。另外 `main.c` 里 `scanf("%49s", &LookingName)` 多了取地址符（类型不匹配）。应把 UUID 字段改成 64 位、性别用 `int` 中转后转 `bool`、去掉多余的 `&`。
8. **【输入健壮性】** 主菜单/二级菜单的 `scanf("%d", &UserInput)` 不检查返回值；一旦输入非数字字符，残留字符永远不被消费，`UserInput` 是未初始化变量 → 循环无限刷屏或随机跳转。建议校验返回值 + 失败时清空输入缓冲（可参考 `lianbiao` 工程的 `ClearInputBuffer` 写法）。
9. **【风格问题】** 菜单与提示几乎全是英文且拼写错误多（“Insist eume”“Being/Eding”“Faile”“Manl/famanl”等）；`main()` 与 `sub()` 大段重复；错误只靠 printf 不靠返回码；性别 0/1 语义仅靠界面文字约定，两处工程（`lianbiao`）编码正好相反，建议在头文件里用宏/枚举定义并注释。改进方向：统一命名（如 `InsertAtFront/InsertAtEnd/DeleteByIndex`）、抽公共菜单框架、用返回码 + 集中错误提示、加注释说明 0/1 性别含义。
