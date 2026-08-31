---
title: 动态数组模块（Array）项目总结
date: 2026-08-31
tags: [C语言, 数据结构, 调试, 总结]
---

今天把之前写的动态数组模块彻底梳理了一遍，记录下整体设计、每个函数的作用，以及目前存在的几个问题。这篇文章既是总结，也是给以后的自己留个参考。

## 1. 项目概述

该项目实现了一个**通用的动态数组（线性表）模块**，支持一维、二维、三维的逻辑抽象（底层实际是一段连续的 `int` 内存）。同时附带一个**交互式测试程序**（`main.c`）用于验证数组的增删改查功能。

项目文件构成：
- `publicData.h` – 定义核心数据结构 `ArrayHard`
- `Array.h` – 声明数组操作函数及常量
- `Array.c` – 实现所有数组操作函数
- `main.c` – 测试程序（用户交互菜单）

> 注：`README.md` 描述的是另一个静态博客站点，与当前数组模块无关。

---

## 2. 数据结构定义（`publicData.h`）

```c
typedef struct ArrayHard {
    int* data;                 // 指向连续内存的指针，存储所有元素
    int Dimensional;           // 逻辑维度（1、2 或 3）
    int SingleDimensionalSize; // 底层数组的总容量（即所有维度元素总数）
    int CurDataUnit;           // 当前已存储的最后一个元素的下标（-1 表示空）
    int dims[3];               // 各个维度的大小，仅用于记录（dims[0]=i, dims[1]=j, dims[2]=k）
} ArrayHard;
```
- 底层采用一维数组 data 存储所有元素，通过 SingleDimensionalSize 记录总容量。
- CurDataUnit 用于追踪当前有效数据的末尾位置，实现“栈式”插入和弹出（后进先出）。
- dims 只作为维度信息的记录，不参与实际寻址（目前未实现多维索引映射）。
## 3. 函数功能说明（`Array.c`）

### 3.1 `ArrayHard* InitArray(int Dimension, int SingDimensionalSize, int i, int j, int k)`

**作用**  
根据指定的维度（1/2/3）和总容量（`SingDimensionalSize`）分配内存，初始化数组结构。

**参数**
- `Dimension`：逻辑维度（1、2 或 3）
- `SingDimensionalSize`：底层数组的总元素个数（即容量）
- `i, j, k`：各维度的大小（仅用于记录到 `dims` 中）

**返回值**  
指向新分配的 `ArrayHard` 结构体的指针，失败返回 `NULL`。

**内部逻辑**
- 为 `ArrayHard` 结构体分配内存
- 为 `data` 分配 `SingDimensionalSize * sizeof(int)` 字节，并清零
- 设置 `CurDataUnit = -1`（表示空数组）
- 设置 `dims[0] = i, dims[1] = j, dims[2] = k`

**注意**  
原代码中对于一维和二维分支，错误地将 `dims[0] = k`，导致维度信息错乱，已手动修正。

---

### 3.2 `bool PushDataInArray(ArrayHard *Array, int Data)`

**作用**  
向数组尾部插入一个数据（类似栈的 push）。

**参数**
- `Array`：数组指针
- `Data`：待插入的整数

**返回值**  
成功返回 `true`，失败（数组已满或 `Array` 为 `NULL`）返回 `false`。

**内部逻辑**
- 检查 `CurDataUnit` 是否小于 `SingleDimensionalSize - 1`
- 若未满，则 `++CurDataUnit`，并将 `Data` 存入 `data[CurDataUnit]`
- 若已满，打印提示并返回 `false`

---

### 3.3 `bool DeleteDataInArray(ArrayHard *Array, int index, int *Data)`

**作用**  
删除指定位置（`index`）的元素，将其值通过 `Data` 返回，并将该位置置为 `0`。  
**注意**：实际并未移动后续元素，仅置零，导致数组中出现“空洞”。

**参数**
- `Array`：数组指针
- `index`：有效下标（从 0 开始）
- `Data`：输出参数，存放被删除的值

**返回值**  
成功返回 `true`，失败（`Array` 为 `NULL` 或 `index` 无效）返回 `false`。

**内部逻辑**
- 检查 `index` 是否在 `[0, CurDataUnit]` 范围内
- 若有效，将 `Array->data[index]` 赋给 `*Data`，再将 `data[index]` 置为 `0`
- 注意：`CurDataUnit` 不变，因此数组的逻辑长度并未减少，只是该位置变为 `0`

---

### 3.4 `bool PopDataInArray(ArrayHard *Array, int *Data)`

**作用**  
弹出末尾元素（类似栈的 pop），将其值通过 `Data` 返回，并将末尾位置置零，同时 `CurDataUnit--`。

**参数**
- `Array`：数组指针
- `Data`：输出参数，存放弹出的值

**返回值**  
成功返回 `true`，失败（数组为空或 `Array` 为 `NULL`）返回 `false`。

**内部逻辑**
- 检查 `CurDataUnit >= 0`
- 若不为空，将 `data[CurDataUnit]` 赋给 `*Data`，置零该位置，然后 `CurDataUnit--`
- 如此数组逻辑长度减少 1

---

### 3.5 `bool PrintArray(ArrayHard *Array)`

**作用**  
打印数组的**所有元素**（包括未使用的元素，即从 0 到 `SingleDimensionalSize-1` 全部打印）。

**参数**
- `Array`：数组指针

**返回值**  
成功（`Array` 非空）返回 `true`，否则返回 `false`。

**内部逻辑**
- 若 `Array` 为 `NULL`，输出提示并返回 `false`
- 若 `CurDataUnit == -1`，输出“Array is Empty”
- 遍历 `i = 0` 到 `SingleDimensionalSize-1`，逐个打印 `data[i]`
- 打印格式为 `"[%d] "`，但在每个元素前都输出 `"This a cur Arrar :"`，导致输出冗余（可能为测试痕迹）

---

### 3.6 `void DestroyArray()`

**声明**  
在 `Array.h` 中声明为无参函数，但实现为空（`void DestroyArray() {}`），**未释放任何内存**。

**问题**  
当前版本内存泄漏严重，需要实现带参版本并释放 `data` 和结构体本身。

---

## 4. 测试程序（`main.c`）

**功能**  
提供一个交互式命令行菜单，让用户测试数组操作。

**流程**
1. 用户选择维度（1/2/3），输入各维度大小（一维可输入长度，二维/三维分别输入 `i,j,k`）。
2. 计算总容量 `size`（一维 `size=i`，二维 `size=i*j`，三维 `size=i*j*k`）。
3. 调用 `InitArray` 创建数组。
4. 进入循环菜单：
    - 1：插入数据（调用 `PushDataInArray`）
    - 2：删除指定位置（调用 `DeleteDataInArray`）
    - 3：弹出末尾（调用 `PopDataInArray`）
    - 4：打印数组（调用 `PrintArray`）
    - 5：退出（调用 `DestroyArray()`，但实际未释放内存）

**输入处理**  
使用 `fgets` + `strtol` 安全读取整数，支持默认值（一维长度直接回车取默认值）。

**中文乱码解决**  
在 `main` 开头调用 `SetConsoleOutputCP(CP_UTF8)`（Windows）修复输出乱码。

---

## 5. 已知问题与改进建议

1. **内存管理**  
   `DestroyArray` 未实现，导致内存泄漏。需改为 `void DestroyArray(ArrayHard* Array)`，释放 `data` 和结构体。

2. **删除操作**  
   `DeleteDataInArray` 仅置零而不移动后续元素，会导致数组中出现“空洞”，破坏了连续存储的性质。若需真正删除，应左移后续元素或仅支持栈式弹出。

3. **多维索引**  
   目前未实现多维下标到一维下标的映射，`dims` 仅作记录，未用于寻址。

4. **打印冗余**  
   `PrintArray` 中每次循环都重复输出 `"This a cur Arrar :"`，应改为只在开头输出一次。

5. **错误提示**  
   部分错误使用 `printf` 输出，可改为日志或返回值传递。

---

## 6. 总结

本项目实现了一个基础的一维动态数组，并通过维度参数模拟了“多维”的概念，底层仍是一维存储。函数设计简洁，但存在内存泄漏、删除逻辑不完整等问题，适合作为学习数据结构和 C 语言内存管理的入门练习。测试程序功能较完整，提供了友好的交互界面。

下一步打算加上多维索引映射，并完善 `DestroyArray`，让这个模块真正可用。




