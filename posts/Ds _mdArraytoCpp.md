---
title: C语言多维数组拓展——Cpp的封装继承多态
date: 2026-09-02
tags: [CPP, 数据结构, 面向对象, 总结]
---

之前用 C 语言写过一个支持一维/二维/三维逻辑抽象的动态数组模块（底层是一段连续 `int` 内存）。今天把它用 **C++ 的面向对象**（封装 + 继承 + 多态）＋**模板**重新写了一遍：不再绑死 `int`，靠模板做到真正的泛型；用抽象基类 + 派生类的多态，把"数组"抽象成一个可扩展的类体系。这篇记录 C++ 版的现状与遗留问题。

## 1. 项目概述

文件构成（都在 `StringMatch/h/` 下）：

- `BaseArray.h` — 抽象基类，定义所有数组类型的公共接口（多态的入口）
- `Array1D.h` — 一维数组，**模板泛化，功能最完整**
- `Array2D.h` — 二维数组，**未完成**（只写了构造/析构，纯虚函数还没实现）
- `Array3D.h` — 三维数组，**未完成**（且构造处有一处分配 bug，见第 5 节）
- `main`（测试程序，暂未完成）

一句话：C 版是"结构体 + 一堆函数"；C++ 版是"类 + 继承 + 多态 + 模板"，骨架已经立起来，但 2D/3D 还没填完。

## 2. 抽象基类 `BaseArray`

```cpp
class BaseArray {
public:
    virtual ~BaseArray(){};
    virtual int GetLength() const = 0;
    virtual bool IsEmpty() const = 0;
    virtual void Clear() = 0;
    virtual void PrintArray() const = 0;
};
```

- 用 4 个**纯虚函数**定义统一的"数组接口"：取长度、判空、清空、打印。
- **虚析构**保证通过基类指针 `delete` 派生对象时能正确调用到派生类的析构。
- 派生类各自实现这些接口——这就是**多态**：以后写同一份逻辑就可以操作不同维度的数组。

## 3. `Array1D` —— 模板泛化的一维数组（最完整）

### 3.1 类结构

```cpp
template <typename T>
class Array1D : public BaseArray {
private:
    T *DataArae;           // 数据区
    int TotalSize;         // 容量
    int CurDataUnitNumber; // 当前有效元素个数
public:
    Array1D(int To = 50);
    ~Array1D() override;
    // 拷贝构造 / 赋值运算符（Rule of Three）
    ...
};
```

注意一个小笔误：这里成员叫 `DataArae`，而 2D/3D 用的是 `DataArea`（A–r–e–a 被写成了 A–r–a–e），建议统一。

### 3.2 构造 / 析构 / 拷贝

- **构造** `Array1D(int To=50)`：`new T[To]`，并把每个元素初始化为 `T()`（类型的默认值）。
- **析构** `~Array1D()`：`delete [] DataArae`（RAII，自动回收，不用像 C 版那样手动 `Destroy`）。
- **拷贝构造 + 赋值运算符**：都实现了深拷贝，避免默认浅拷贝带来的悬垂指针 / 双重释放。

### 3.3 实现的基类接口（override）

- `GetLength()` — 返回当前元素个数。**小缺点**：const 查询函数里还 `cout << "Length:"` 打了行字（副作用）。
- `IsEmpty()` — `CurDataUnitNumber == 0`。
- `Clear()` — 有效范围全部重置为 `T()`，个数归 0。
- `PrintArray()` — 空则打印 "Array Was Empty"，否则逐行 `[i]: value`。

### 3.4 增删改查

- `PushDataInArray(const T&)` — 末尾追加，满了打印 "Array Overflow"。
- `PopDataInArray(T&)` — 弹出末尾。
- `InsertDataInArray(int index, const T&)` — 允许在 `[0, CurDataUnitNumber]` 插入，把 index 之后元素后移。
- `DeleteDataInArray(int index, T&)` — 删除并**左移**后续元素、个数减 1（修复了 C 版"只置零留空洞"的问题）。
- `GetDataInArray` / `SetDataInArray` — 按下标读 / 写。

### 3.5 与 C 版的语义差异（重要）

| | C 版 | C++ 版 `Array1D` |
| --- | --- | --- |
| 空数组 | `CurDataUnit = -1`（存"最后一个元素的下标"） | `CurDataUnitNumber = 0`（存"元素个数"） |
| 元素类型 | 只有 `int` | 模板 `T`，任意类型 |

这一改动让"判空 / 打印 / 插入位置"的边界理解都更直观（个数而非下标）。

## 4. `Array2D` —— 未完成

```cpp
template<typename T>
class Array2D : public BaseArray {
    T *DataArea;
    int rows, cols, TotelData, CurDataUnitNumber;
public:
    Array2D(int R, int C);
    ~Array2D() override;
};
```

- 已经分配好 `R*C` 的一维连续内存并初始化，`rows/cols` 也记录下来了。
- **问题**：目前只实现了构造和析构，**4 个纯虚函数（GetLength/IsEmpty/Clear/PrintArray）一个都没写** → `Array2D` 仍是抽象类，**无法实例化**。
- 待办：二维下标 `(i,j)` → 一维偏移的映射、增删改查，以及基类接口。

## 5. `Array3D` —— 未完成 + 分配 bug

```cpp
template<typename T>
class Array3D : public BaseArray {
    T* DataArea;
    int Rows, Cols, Height, Totals, CurDataUnitNumber;
public:
    Array3D(int R,int C,int H):DataArea(new T(R*C*H)), ...  // ← bug
    ~Array3D() override { delete [] DataArea; };
};
```

**分配 bug**：`new T(R*C*H)` 用了**圆括号**，这是在"new 一个单对象并把初值设为 `R*C*H`"，而**不是**分配数组；应该是 `new T[R*C*H]`（方括号）。当前写法会和析构的 `delete []` 不配对，属未定义行为 / 内存错误。改法：

```cpp
Array3D(int R, int C, int H)
    : DataArea(new T[R*C*H]), Rows(R), Cols(C), Height(H),
      Totals(R*C*H), CurDataUnitNumber(0) { ... }
```

同样缺纯虚实现，仍是抽象类。

## 6. C 版 vs C++ 版一览

| 维度 | C 版（`ArrayHard` + `Array.c`） | C++ 版（`BaseArray` 体系） |
| --- | --- | --- |
| 组织方式 | 结构体 + 一堆自由函数 | 类 + 继承 + 多态 |
| 泛型 | 只能 `int` | 模板 `<typename T>` |
| 空数组语义 | `CurDataUnit=-1`（下标） | `CurDataUnitNumber=0`（个数） |
| 多维 | switch 分支映射（已做） | 2D/3D 尚未实现 |
| 内存管理 | 手动 `Init` / `DestroyArray` | RAII：构造 / 析构 / 拷贝 |
| 删除 | C 版有"留空洞"历史问题 | `DeleteDataInArray` 左移修复 |

## 7. 已知问题与下一步

1. `Array1D` 成员名 `DataArae` 拼写错误，建议统一成 `DataArea`。
2. `Array1D::GetLength()` 里混了打印副作用，const 查询函数应只返回。
3. `Array2D` 未实现纯虚 → 抽象类，无法实例化。
4. `Array3D` 的 `new T(R*C*H)` 圆括号分配 bug，需改成 `new T[R*C*H]`。
5. 2D/3D 的多维下标 → 一维偏移映射（C 版做过的 `Tool_GetAndEffectiveIndex` 可参考）。
6. 交互式测试程序（main）还没写。

## 8. 总结

C++ 版成功地把"数组"升级成了一个**可扩展的类体系**：`BaseArray` 定接口，`Array1D` 用模板和完整实现证明了这条路走得通，深拷贝和左移删除这些在 C 版纠结过的点，在 C++ 里都更顺手了。2D/3D 的骨架已经搭好，剩下主要是补纯虚实现、修 `Array3D` 那处分配 bug，再补多维索引映射——下一轮把它填完。
