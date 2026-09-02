---
title: 顺序表（CCC）：可落盘多表的线性表顺序存储
date: 2026-09-02
tags: ["课程","计算机学科基础","数据结构（ds）","线性表"]
summary: 顺序表工程总结：带磁盘持久化与多表切换的菜单系统，附读盘信任文件头、文件名缓冲不足等真实 bug 清单。
---


## 是什么

顺序表是用一段**地址连续**的存储单元依次存放线性表数据元素的存储结构，逻辑上相邻的元素在物理位置上也相邻，因此可以按下标随机存取（`O(1)` 定位），但插入/删除需要成片移动元素（平均 `O(n)`）。

本工程实现了一个以“用户表”为业务模型的顺序表管理程序：每条记录是一个「用户名 + 自增整型 ID」，存放在定长数组中；程序提供了初始化、判空、求长、按位/按值查找、插入、删除、遍历打印等教材标准操作，并把整张表以二进制文件（`<表名>.data`）的形式持久化到磁盘，支持多表切换（读盘/存盘/删除）。

对应《数据结构与算法》(13003) 中“线性表 —— 顺序存储结构”一节的内容：顺序表的类型定义、基本操作实现，以及“插入位置从 1 计、内部下标从 0 计”的典型约定。工程文件（目录）名 `CCC` 与课程名（Computer? 数据结构课程）相关，是作者自己的学习/作业工程。

## 文件结构

| 文件 | 作用 |
| --- | --- |
| `shunxubiao.h` | 头文件：定义数据结构 `SQListData`/`SQList`、相关宏（容量、错误码、文件名长度）以及全部函数原型，并 `extern` 声明全局表 `L1` 与当前表名 `ListName` |
| `shunxubiao.c` | 顺序表全部操作的实现：初始化、判空、求长、输入、插入、删除、打印、销毁、按名/按 ID 查找、磁盘读写，以及查询子菜单 `SubMamu()` |
| `main.c` | 程序入口：定义全局变量 `L1`、`ListName`，提供主菜单循环（0–9）驱动各项操作 |
| `*.data`（如 `default.data`、`test.data`） | 运行时由程序生成/读写的二进制数据文件，不属于源码 |
| `database.exe` 等 | 编译产物，可忽略；`.vscode/`、`build/` 非源码 |

## 核心设计

### 数据结构

```c
#define Maxsize 50          // 顺序表最大容量
#define Maxnamesize 20      // 用户名字符串长度
#define S_Code   300        // 操作成功返回码
#define Erorr_Code 402      // 操作失败返回码（拼写为 Erorr）

typedef struct {
    char username[Maxnamesize];
    int  userid;
} SQListData;               // 一个数据元素：用户名 + ID

typedef struct table {
    SQListData data[Maxsize];  // 定长数组，顺序表本体
    int TableLength;           // 当前表长
} SQList;
```

设计要点：容量写死为 50 的**静态顺序表**，`TableLength` 是实际元素个数；`userid` 由程序在录入时自动取“当前最大 ID + 1”，保证主键不重复。持久化格式为：文件开头写 1 个 `int`（表长），随后紧跟 `TableLength` 个 `SQListData` 结构体原样（二进制）写入。

### 核心函数

```c
int  LoadListForDisk(SQList *L, const char *tableName);  // 从磁盘读入表
void SaveListToDisk (SQList *L, const char *tableName);  // 整表写回磁盘
void InitList        (SQList *L);
bool IsEmpty         (SQList *L);
void Length          (SQList *L);
SQListData GetInput  (SQList *L);                        // 录入一个元素
int  ListInsert      (SQList *L, int index, SQListData data);   // 1 基位序
int  ListDelete      (SQList *L, int index, SQListData *e);
int  PrintList       (SQList *L);
int  DestroyList     (SQList *L, const char *tableName);
void LocateElembyUserName(SQList *L, char UserName[]);   // 按值查找
void LocateElembyID     (SQList *L, int Id);
void GetElem            (SQList *L, int a);             // 按位查找（0 基下标）
```

逐个说明（重要函数）：

1. **`ListInsert(SQList *L, int index, SQListData data)`**
   在 `index`（1 ≤ index ≤ TableLength+1）处插入。先判“位置合法且未满”，再把 `data[index-1 .. TableLength-1]` 全部后移一位，最后写入 `data[index-1]` 并 `TableLength++`。注意点：循环 `for (j = TableLength; j >= index; j--)` 中当 `index = TableLength+1`（尾插）时不移动、直接写 `data[TableLength]`，逻辑正确；失败返回 `Erorr_Code`。插入是顺序表成本最高的操作（平均移动一半元素）。

2. **`ListDelete(SQList *L, int index, SQListData *e)`**
   删除第 `index` 个元素并**通过指针参数带回被删元素**（供调用方显示），随后前移覆盖并 `TableLength--`。同样 1 基位序、内部 0 基下标。

3. **`GetInput(SQList *L)`**
   交互式录入：`fgets` 读用户名并去掉末尾换行；`userid` 自动设为 `max(existing ids)+1`。注意点：`fgets` 的第三参用了 `Maxnamesize - 1`（19），比数组少一格且**不检查 `fgets` 返回值**；名字超过 18 个字符时剩余字符会残留在输入缓冲，干扰后续读取。

4. **`LocateElembyUserName / LocateElembyID`**
   顺序扫描按值查找，找到即打印“在哪个位置(0 基下标)+内容”并 `return`，找不到打印 `Not Found`。均为 `void`，查找结果只通过打印呈现，无法被程序复用，是教学实现常见取舍。

5. **`GetElem(SQList *L, int a)`**
   按下标直接随机存取并打印。**函数内部没有任何边界检查**——`a` 越界是未定义行为，安全性完全依赖调用方（`main`/`SubMamu` 中先判断 `1 ≤ pos ≤ TableLength` 再以 `pos-1` 传入）。

6. **`SaveListToDisk / LoadListForDisk`**
   用 `snprintf(FilePath, ..., "%s%s", tableName, EXT)` 拼出 `<表名>.data` 后整体 `fwrite`/`fread`。加载前先把 `TableLength` 置 0，读入表长后若大于 `Maxsize` 则截断为 `Maxsize` 再读数据。注意点：见下文“已知问题”第 1、2 条——文件头长度字段被无条件信任、文件名缓冲区偏小。

7. **`DestroyList(SQList *L, const char *tableName)`**
   置空表长并 `remove()` 删除磁盘文件。注意点：**空表时直接返回 `Erorr_Code` 拒绝删除**，即无法删除一张 0 条记录的表文件；`remove` 不可恢复，需用户确认（`main` 中做了二次确认）。

8. **`SubMamu()`（子菜单）**
   直接操作全局表 `L1`，提供“按用户名查 / 按 ID 查 / 按位置查”三个功能 + 帮助。注意点：它绕过参数传递、读写全局变量 `L1`/`ListName`，与其它函数“显式传指针”的风格不一致；且子菜单的 `case 0` 与 `case 9` 都是 `return`（退出子菜单），`8` 号选项并未处理（帮助里却写着 1–9）。

辅助函数：`InitList` 只把 `TableLength` 清零；`IsEmpty` 判空；`Length` 打印表长（**对空表只提示“空”而不输出 0**）。

## 交互/测试

程序是**菜单驱动**的（非自动测试），启动即从 `default.data` 加载：

主菜单（循环直到按 0 退出）：

- `0` 退出程序；`1` 查看使用帮助（不消费干净输入时的处理依赖 `getchar()`）
- `2` 读盘：先自动把当前表存盘，再输入目标表名加载，成功则切换当前表名，失败提示“继续使用当前表”
- `3` 显示当前表长；`4` 录入新用户（自动分配 ID）并指定插入位置；`5` 按位置删除（回显被删元素）；`6` 打印整表；`7` 销毁当前表（二次确认后清内存并删磁盘文件）
- `8` 进入**子菜单 `SubMamu`**：`2` 按用户名查、`3` 按 ID 查、`4` 按位置查（`1` 看子菜单帮助，`0/9` 返回主菜单）
- `9` 存盘（写回当前 `<ListName>.data`）

每次循环顶部都会打印当前状态栏 `==== 当前表: 表名(N 条)====`，方便观察多表切换。输入风格是 `scanf("%d")` + 部分分支手动 `getchar()` 吞换行，整体可用但对“多字符误输入/超长输入”很脆弱。

## 已知问题与改进建议

1. **`LoadListForDisk` 盲目信任文件头，缺少健壮性校验（真实边界 bug）**。只检查了读入表长 `> Maxsize` 后截断，但没有：校验表长为非负；检查两次 `fread` 的返回值与文件实际字节数。若 `.data` 文件被截断/损坏（表长写成负数或巨大值），`fread(&L->data, ...)` 会按错误长度读入，数组残留垃圾数据甚至产生越界读写风险。改进：读入后校验 `0 ≤ TableLength ≤ Maxsize`，并用 `fread` 实读个数校验（不足即报错），读入前先 `memset` 清零数组。

2. **表名缓冲区不足，长表名会被静默截断（真实 bug）**。`MaxFileInPutName` 为 40，而 `main` 用 `scanf("%39s")` 允许输入 39 字符表名，再拼接 `.data` 后缀（5 字符）共需 44 字节，`snprintf` 会截掉后缀，导致存盘/读盘文件名字不符（例如存成了被截断的名字而读不到）。改进：把文件名缓冲加大（≥ `MaxFileName + 5`），或限制输入表名 ≤ 34 字符并提示。

3. **`IsEmpty(NULL)` 语义倒置**：传入空指针时打印“不是有效表”却返回 `true`（“空”），会把“无效”误报成“空表”；`Length` 对空表不显示长度 0 而只是提示“空”。建议：`NULL` 明确返回错误语义或让调用方统一先判空；`Length` 直接输出 `TableLength`（含 0）。

4. **`GetElem` 无边界检查**（见核心函数 5）。建议在函数内加上 `0 ≤ a < TableLength` 的判断。

5. **空表无法销毁**：`DestroyList` 对 `TableLength == 0` 的表返回失败且不删文件，用户无法清理 0 条记录的表文件。建议允许销毁空表（删除文件是主诉求）。

6. **输入处理脆弱**：`scanf("%d")` 与 `fgets` 混用，靠各处零散的 `getchar()` 吞换行；任何超长输入都会污染后续读取且无提示。建议统一用 `fgets + sscanf` 读行，或每次输入后 `fflush(stdin)` 的替代（清空到行尾）。

7. **拼写与可读性**：`Mamu`→`Menu`、`Compelt`→`Complete`、`Faile`→`Fail`、`Erorr_Code`→`ERROR`、提示“Insert Compelt”等大量拼写错误；菜单号称 1–9 但帮助未列出 `8`（子菜单入口），子菜单 `8` 无处理；`case 1` 的 `getchar()` 只能吞一个字符。建议顺手统一改正。

8. **多表切换的隐式存盘策略**：主菜单 `2` 读盘前会先无条件保存当前表，若当前表其实是刚加载的他人数据，可能造成“误覆盖同名文件”，行为依赖全局 `ListName` 状态。建议加载新表前显式询问是否保存，并把当前表名与 `L1` 的耦合（`SubMamu` 直接操作全局量）改为参数传递。

9. 数据模型层面：`TableLength` 与数组容量写死（50），属教材“静态顺序表”的正常教学设定；若要支持更大数据量可改为动态扩容（`realloc` 翻倍）版本。
