
## 基本语法

参考：[基本语法](https://www.markdownguide.org/basic-syntax/)

## Markdown 扩展语法帮助

除了基本的 `markdown` 语法外，此编辑器支持一下一些扩展语法。

### 图片扩展

```markdown
![图片加载时显示名称](/path/to/image-url "图片标题"){attr="value"}
```

编辑器支持图片属性扩展，示例：

#### 示例 0

```markdown
![图标](./logo.ico "Logo 图片示例 0"){style="width:100%; max-width: 100px;"}
```

![图标](./logo.ico "Logo 图片示例 0"){style="width:100%; max-width: 100px;"}


#### 示例 1

```markdown
![图标](./logo.ico "Logo 图片示例 1"){style="max-width: 200px; border-radius: 20px;"}
```

![图标](./logo.ico "Logo 图片示例 1"){style="max-width: 200px; border-radius: 20px;"}

### 公式

**块级公式**

```latex
$$
\begin{align}
f(n) &= \sum_{i=1}^{n} \lfloor \sqrt{2} * i \rfloor\\
f(10^{300}) &= \text{ ?}
\end{align}
$$
```

$$
\begin{align}
f(n) &= \sum_{i=1}^{n} \lfloor \sqrt{2} * i \rfloor\\
f(10^{300}) &= \text{ ?}
\end{align}
$$

**内联公式**
```latex
$ f(x) = \cfrac{\sum{x^2}}{\sum{x^2}} $
```

$ f(x) = \cfrac{\sum_i{x^2}}{\sum_i{x^i + x^i}} $

## 用于演练场的互动问题扩展

### 简单问答扩展

#### 基本语法

```text
:~~ QA-SIMPLE ~~
:
:问题描述？？？？？？？？？？？？？
:问题描述？？？？？？？？？？？？？
:问题描述？？？？？？？？？？？？？
:
:--
:
:答案答案答案
:
:~~~~
```

问答扩展以`:`开头，首行以`:~~ xxxx ~~`开头，其中`xxxx`为问题类型，此处为`QA-SIMPLE`表示简答题。后续几行直到*提问*与*答案*分隔符`:--` 为提问问题主体。分隔符`:--`到结束符`:~~~~`为问题的答案。

#### 举例

**代码**:

```text
:~~ QA-SIMPLE ~~
:
:学术中最常用的机器学习框架是什么？
:
:--
:
:pytorch
:
:~~~~
```

<hr>

**效果**:

:~~ QA-SIMPLE ~~
:
:学术中最常用的机器学习框架是什么？
:
:--
:
:pytorch
:
:~~~~

### 选择题扩展

#### 基本语法

```text
:~~ QA-SELECTION ~~
:
:问题描述??????????????????????
:问题描述??????????????????????
:问题描述??????????????????????
:
:--
:
:[Y] 选择一一一一一一一一一一一一一一一一一一一一一一一一一一一一
:[N] 选择二二二二二二二二二二二二二二二二二二二二二二二二二二二二
:[N] 选择三三三三三三三三三三三三三三三三三三三三三三三三三三三三
:[Y] 选择MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM
:
:~~~~
```

选择题扩展整体结构与简单问答基本一致，其中问答类型变更为`QA-SELECTION`；而答案部分由多个选项构成。每个选项的语法为`[x] desc`，其中`x`表示答案是否正确`Y`表示正确，`N`表示错误，后面的`desc`为选项描述。

#### 举例

**代码**:

```text
:~~ QA-SELECTION ~~
:
:把下面除了第二个选项都选上
:
:--
:
:[Y] 选择一
:[N] 选择二
:[Y] 选择三
:[Y] 选择四
:
:~~~~
```

<hr>

**效果**:

:~~ QA-SELECTION ~~
:
:把下面除了第二个选项都选上
:
:--
:
:[Y] 选择一
:[N] 选择二
:[Y] 选择三
:[Y] 选择四
:
:~~~~

### 用于执行少量代码的扩展

此扩展用于支持可以单独运行的、在几秒钟时间内可以运行完毕的`python`代码片段。

#### 基本语法

```text
:~~ QA-CODE_EXECUTION ~~
:
:问题描述
:
:--
:
:```python
:
:# 在此编码
:
:```
:
:~~~~
```

结构与之前的问答结构一致，需将问答类型改为`QA-CODE_EXECUTION`；答案部分为基本的markdown代码形式。

#### 举例

**代码**:

```text
:~~ QA-CODE_EXECUTION ~~
:
:写一个输出`Hello world!`的代码
:
:--
:
:```python
:
:def hello():
:    """定义函数"""
:    print('Hello world!')
:
:# 调用
:hello()
:
:```
:
:~~~~
```

<hr>

**效果**:

:~~ QA-CODE_EXECUTION ~~
:
:写一个输出`Hello world!`的代码
:
:--
:
:```python
:
:def hello():
:    """定义函数"""
:    print('Hello world!')
:
:# 调用
:hello()
:
:```
:
:~~~~

## 注意事项

1. 块级代码使用 \`\`\`, 不要使用 `~~~`
2. 不支持 Footnotes 语法`[^xxx]`
3. 建议加粗、斜体使用 `*` 而非下划线 `_`
4. 暂不支持定义列表
5. 暂不支持 Emoji
6. 暂不支持高亮：`==高亮文字==`
