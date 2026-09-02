---
title: 链表·学生管理（lianbiao）：四种链表形态 + 视图层
date: 2026-09-02
tags: ["课程","计算机学科基础","数据结构（ds）","线性表"]
summary: 单/双/循环单/循环双四种链表共用一套结构 + 状态机中文菜单；循环链表删除越界误判、全工程无 free、UUID 同秒重复。
---


## 是什么

**链表**是线性表的链式存储结构，结点在内存中不连续存放、靠指针相连。本工程把“链表”做成一个**可切换四种形态**的通用结构：单链表、双链表、循环单链表、循环双链表——同一套结点结构（一个数据域 + 前后两个指针域 + 一个“链表类型”标记），全部操作按 `NowListType` 分发到各自的子函数。

更重要的是，本工程**实现了完整的学生信息管理界面**：`view` 层用“状态机式”多级中文菜单提供真正的增删改查（插入支持按位置/头插/尾插，删除按索引，查找支持按 UUID/姓名/性别，打印支持一页全打与每页 7 条分页浏览），数据域正是学生记录 `Students_Data`（成绩、姓名、性别、UUID）。程序运行时先初始化某一种链表，之后所有操作都在该链表上进行。

从《数据结构与算法》(13003) 的角度看，本工程覆盖了**“线性表——链表”章节的主要知识点**：带头结点链表、双链表前驱/后继指针的维护、循环链表的“回绕判空”、插入/删除的指针重接、遍历终止条件（非循环以 NULL 为界、循环以头结点为界）等；`view` 层的分页打印与多级菜单则属于演示/实验性质的应用代码。

## 文件结构

| 文件 | 作用 |
| --- | --- |
| `linklist.h` | 总头文件：链表类型/查找字段常量、`Students_Data` 与 `LinkList`（结点）结构体、全局链表指针 `extern DefaltLinkList`、全部核心函数原型（注意其中重复 typedef 了 `uint64_t`，见已知问题） |
| `linklist.c` | 链表核心实现（约 1000 行）：初始化（四类型分发）、按位插入 `InsertAt`、头插/尾插、删除 `DeleteDataUnit`、遍历打印 `PrintAllList`、按 UUID/姓名/性别查找 `SearchDataUnit`、UUID 生成、ANSI 终端模式开启 |
| `view.h` | 视图层头文件：视图状态常量、`PAGE_SIZE`、`MainMenu`/`ClearInputBuffer`/`PrintAllListPaged`/`WaitForEnter` 声明 |
| `view.c` | 视图层实现：以 `static currentView` 状态机驱动的主菜单，负责所有中文提示、输入采集与对 `linklist.c` 的调用 |
| `main.c` | 程序入口：定义全局 `DefaltLinkList` 与未使用的 `StatusCode`；循环调用 `MainMenu()`，返回 true 即退出（注意：只 `#include "linklist.h"`，漏了 `view.h`） |

（目录中的 `LINKLIST.sln / .vcxproj` 是 Visual Studio 工程文件；`.vs`、`x64`、`Debug` 等构建产物不在讨论范围。提示：含中文注释的源文件为 GBK/ANSI 编码，用 VS 或按 GB2312/ANSI 打开可正常显示。）

## 核心设计

### 数据结构

四种链表共用同一个结点：结点里同时备好“前驱”“后继”两个指针；是单链表时只用后继指针，是双链表/循环双链表时两个都用。链表的**头结点也是同一结构体**，类型标记就存在头结点上，每个数据结点的 `NowListType` 其实是 0（`calloc` 清零，从没被设置过，也没人读）。

```c
#define LIST_SINGLE       1   // 单链表
#define LIST_DOUBLE       2   // 双链表
#define LIST_CIRC_SINGLE  3   // 循环单链表
#define LIST_CIRC_DOUBLE  4   // 循环双链表
#define SEARCH_BY_UUID   101   // 按 UUID 查找
#define SEARCH_BY_NAME   102   // 按姓名查找
#define SEARCH_BY_GENDER 103   // 按性别查找
#define UUID_MAKER_CODE 0x425951ULL

typedef struct Students_Data
{
    int  StudentsMark;            // 成绩
    char StudentName[MaxStudentNameSize];   // MaxStudentNameSize = 50
    bool StudentGender;           // 本工程约定 0=女、1=男（菜单提示 0=女,1=男）
    uint64_t  StudentUUID;        // 记录编号，由 GenarateUUID() 生成
} Students_Data;

typedef struct LinkListData
{
    struct LinkListData* PrimaryDataUnitAdd;  // 名为 Primary，实际是“前驱”指针（命名易误导）
    Students_Data StudentsData;               // 数据域
    struct LinkListData* NextDataUnitAdd;     // 后继指针
    int NowListType;                          // 链表类型，仅头结点上的值被使用
} LinkList;
extern LinkList* DefaltLinkList;              // 全局链表（main.c 定义）
```

初始化约定（`InitLinkList`）：四种链表都 `calloc` 一个头结点；单链表/双链表把头结点当哨兵、`NextDataUnitAdd=NULL` 结尾；**循环单/双链表初始化后头结点自指**（`NextDataUnitAdd = PrimaryDataUnitAdd = 自身`）作为“空表”标志。索引语义：界面提示“从 0 开始”，`index=0` 指第一个数据位，`index=表长` 等效尾插。

### 核心函数

| 函数（签名） | 作用与注意点 |
| --- | --- |
| `int InitLinkList(LinkList** List, int ListType)` | 按类型分配并初始化头结点，返回 0；`List==NULL` 返回 201，未知类型返回 202。注意：若全局 `DefaltLinkList` 已指向旧链表，直接覆盖会造成**整条旧链表泄漏**（view 层每次“初始化”都会这么干）。 |
| `uint64_t GenarateUUID()` | 生成编号：`(UUID_MAKER_CODE<<24) | (time(NULL) & 0xFFFFFF)`。前缀固定 + 时间戳低 24 位：同一秒内多次插入 UUID 完全相同；低 24 位周期约 2^24 秒（≈194 天），跨周期必重复，并非真正唯一。 |
| `int InsertAt(LinkList*, int index, Students_Data)` | 按位插入的“总入口”：按 `List->NowListType` 分发到 `IEILASub_Single/Double/cyc_Single/cyc_DOUBLE`。各子函数先 `calloc` 新结点，从哨兵头走 `index` 步后“插到当前位置之后”（越界则 `free` 新结点并返回 203）。**注意**：总入口把子函数错误码全部吞掉、恒 `return 0`，错误只靠 printf（见已知问题 6）。 |
| `int InsertEumeIntotheListByHand(LinkList*, Students_Data)` | 头插：分发到 `IEITLBHSub_*`，一律插到哨兵头之后（循环双链表对“空表/非空表”分情况维护两个方向的指针）。同样恒返回 0。 |
| `int InsertEumeIntotheListByEnd(LinkList*, Students_Data)` | 尾插：分发到 `IEITLBESub_*`。单/双链表遍历到 `NextDataUnitAdd==NULL` 处挂接；循环单链表以“回到头结点”为终止；循环双链表直接用头结点的 `PrimaryDataUnitAdd`（尾）插入并回接。注意：循环单链表的尾插对空表（`List->next==List`）也能正确工作，但未校验分配失败以外的情况。 |
| `int DeleteDataUnit(LinkList*, Students_Data* BackData, int index)` | 删除“第 index 个数据结点”（0 起始）并把被删数据回传 `*BackData`。分发到 `DDUSub_BySingle/Double/By_Cyc_Single/By_Cyc_Double`。**两个真实缺陷**：①循环链表的子函数里越界守卫用错了哨兵，导致只能删 index=0（见已知问题 3）；②总入口同样吞掉错误码恒返回 0，view 层因此永远按“成功”处理并打印**未初始化**的 `deletedData`。 |
| `int PrintAllList(LinkList*)` / `int PrintStudents_Date(Students_Data, int index)` | 遍历打印全部学生（循环链表以头结点为终点哨兵）。`PrintStudents_Date` 输出成绩、姓名（`%50s` 右对齐补宽）、性别（`1=Male/0=Female`）、UUID。注意 `PrintAllList` 声明返回 `int` 却没有 return 语句。 |
| `int SearchDataUnit(LinkList*, int SearchField, const void* SearchValue)` | 查找总入口：按字段（`SEARCH_BY_UUID/NAME/GENDER`）分发到 `SearchSub_Single/Double/CycSingle/CycDouble`，命中即调用 `PrintStudents_Date` 逐个打印并计数，最后统一输出“Found N student(s)”并返回 0。搜索值用 `void*` 传入，由子函数按字段类型强转读取（UUID 按 `uint64_t*`、性别按 `bool*`、姓名按 `char*`）。 |
| `bool MainMenu(void)`（`view.c`） | 整个界面的核心：`static int currentView` 状态机（主菜单 → 初始化/系统功能 → 插入方式/查找字段/打印方式 → 各数据输入页 → 返回）。同一函数内完成“画菜单 + 读选择 + 路由 + 执行”，返回 true 时程序退出。辅助函数 `ClearInputBuffer`（清空 stdin）、`WaitForEnter`（按回车继续）、`PrintAllListPaged`（每页 `PAGE_SIZE=7` 条、翻页清屏）。 |
| `void EnableANSI()` | 打开 Windows 控制台虚拟终端（VT）支持，使打印的边框/字符正常显示。仅 Windows 可用。 |

## 交互 / 测试

入口 `main()`：开 ANSI 后 `while(1)` 循环调 `MainMenu()`。界面是纯中文多级菜单（状态机）：

1. **主菜单**：1 初始化链表 / 2 系统功能 / 0 退出。
2. **初始化**：选 1 单链表、2 双链表、3 循环单链表、4 循环双链表 → 调 `InitLinkList`（会**直接覆盖**可能已存在的旧链表）。
3. **系统功能**：1 插入 / 2 删除 / 3 查找 / 4 打印 / 0 返回。
   - **插入**：选插入方式（1 按位置、2 头插、3 尾插）后逐项录入姓名、Mark、性别(0=女 1=男)；UUID 自动生成；
   - **删除**：输入索引（0 起始），删除并打印被删学生；越界索引时（尤其循环链表下 index≥1 必失败）会误报“删除成功”并打印垃圾数据；
   - **查找**：选字段（UUID/姓名/性别）后输入值，逐个打印命中项并报告命中数；
   - **打印**：1 一页全打（`PrintAllList`），2 分页打（`PrintAllListPaged`，每页 7 条、按回车翻页）。

**测试要点**：单/双链表的增删查打、循环链表的插入与打印都可用；重点试一下**循环单/双链表的按索引删除（index≥1）**——会误报成功但什么都没删（见已知问题 3）；同秒内连续插入两条会得到相同 UUID（按 UUID 查找一次命中多条）。程序唯一退出点是主菜单输 0；退出前不释放任何链表内存。

## 已知问题与改进建议

1. **【内存泄漏：全工程没有任何 `free`】** 所有插入的结点、初始化的头结点都没有释放路径；view 层每次重新“初始化”都会覆盖 `DefaltLinkList`，旧链整条泄漏；进程退出也不清理。改进：新增 `DestroyLinkList(LinkList**)`（按类型遍历逐结点 `free`），重初始化前先销毁旧链，退出前调用。
2. **【真实逻辑错误：循环链表删除只能删 index=0】** `DDUSub_By_Cyc_Single` / `DDUSub_By_Cyc_Double` 把“越界哨兵”错记为 `FristDataUnit = List->NextDataUnitAdd`（**第一个数据结点**，非头结点），每走一步前检查 `CurrentDataUnit->NextDataUnitAdd == FristDataUnit` 即报 205。链表多于 1 个结点时，任何 `index>=1` 的删除都在第一步被误判越界——只有 index=0 能成功。应与循环插入一致，用**头结点 `List` 本身**作为回绕哨兵（先走到位再判断，或判断目标不是头结点）。
3. **【真实缺陷：总入口吞掉错误码 + 打印未初始化数据】** `InsertAt`、`InsertEumeIntotheListByHand/ByEnd`、`DeleteDataUnit` 的分发外壳把所有子函数返回码（201/203/204/205…）只用于 printf，函数本身**恒 `return 0`**；而 205（越界）这类码在外壳里连分支都没有，会落进 `else` 打印 “Delete/Insert Success”。后果：view 层删除越界索引时，`DeleteDataUnit` 恒返回 0 → 界面永远显示“删除成功”并调用 `PrintStudents_Date` 打印**未初始化的栈上 `deletedData`**（垃圾值）。改进：外壳透传错误码，view 层在 `ret==0` 时才打印被删数据。
4. **【越界/安全风险：`scanf("%s")` 无宽度限制】** view.c 中插入三条路径的 `scanf("%s", tempData.StudentName)` 与按名查找的 `scanf("%s", name)` 都无宽度，超过 49 字符会**写穿 50 字节的数组**。应统一改成 `scanf("%49s", ...)`。
5. **【UUID 不唯一】** `GenarateUUID` 用固定前缀 + 时间戳低 24 位：同一秒内多次插入 UUID 完全相同；约 194 天一个周期，跨周期重复。改进：掺入进程内计数器/`rand()` 或直接自增序列，保证同程序内唯一。
6. **【编译隐患与风格】**
   - `linklist.h` 里 `typedef unsigned long long uint64_t;` 与已 include 的 `<stdint.h>` 重复定义同类型（多数编译器按 C11/C++ 的“同类型允许重定义”放行，但移植性差，纯 C89 下报错）；应删除这行、直接用 `<stdint.h>` 的 `uint64_t`；
   - `main.c` 只 `#include "linklist.h"` 却调用 `view.h` 里声明的 `MainMenu()` → 隐式声明（MSVC 的 C89 模式只给警告；开 `/WX` 或按 C++ 编译即报错），应补 `#include "view.h"`；
   - `PrintAllList` 声明返回 `int` 却没有 return 语句；全局 `StatusCode` 定义了但从未使用；`DefaltLinkList` 拼写错误（Defalt）；
   - 命名误导：`PrimaryDataUnitAdd` 实际是**前驱**指针；每个结点都带 `NowListType` 但只有头结点上的值被读取（数据结点恒为 0）；
   - 外壳函数打印的错误文案与错误码语义对不上且拼写错误（如 202 打印 “The manren was fill”，203 在头插/尾插语境里根本没有“索引”概念）；`main()` 与 `MainMenu()` 都 `system("cls")` 造成双清屏；
   - `InsertAt` 对负 index 不校验，等同 index=0 静默头插。
   - 改进方向：统一错误码并透传、去掉重复 typedef、补齐 include 与 return、把 `PrimaryDataUnitAdd` 改名为 `PrevDataUnitAdd`、增加输入校验与中文注释。
7. **【字段语义提醒】** 本工程性别编码 **0=女、1=男**（菜单提示与 `PrintStudents_Date` 的 Male/Female 输出一致），但 `StudentGender` 是 `bool`，容易误当成“男=1”之外的语义；同目录下的 `danlianbiao` 工程约定正好相反（0=男、1=女）。若两工程代码互相参考/合并，务必统一性别编码，建议用枚举 `enum Gender { FEMALE=0, MALE=1 }` 消除歧义。
