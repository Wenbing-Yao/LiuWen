
## Basic Syntax

Ref：[Basic Syntax](https://www.markdownguide.org/basic-syntax/)

## Markdown Extensions

In addition to the basic `markdown` syntax, the editor supports the following extensions.

### Image Extension

```markdown
![Alt Text](/path/to/image-url "Image Captain"){attr="value"}
```

Examples:

#### Example 0

```markdown
![logo](./logo.ico "Logo Example 0"){style="width:100%; max-width: 100px;"}
```

![logo](./logo.ico "Logo Example 0"){style="width:100%; max-width: 100px;"}


#### Example 1

```markdown
![logo](./logo.ico "Logo Example 1"){style="max-width: 200px; border-radius: 20px;"}
```

![logo](./logo.ico "Logo Example 1"){style="max-width: 200px; border-radius: 20px;"}

### Formula

**Block Formula**

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

**Inline Formula**
```latex
$ f(x) = \cfrac{\sum{x^2}}{\sum{x^2}} $
```

$ f(x) = \cfrac{\sum_i{x^2}}{\sum_i{x^i + x^i}} $

## Question/Answer Extensions for Playground

### Simple QA Extension

#### Basic Syntax

```text
:~~ QA-SIMPLE ~~
:
:Qustion description here
:
:--
:
:The answer Here
:
:~~~~
```

1. All lines of code start with `:`.
2. The code block starts with `:~~ QA-SIMPLE ~~`, ends with `:~~~~`.
3. The question part and the answer part are seperated with `:--`.

#### Example

**Code**

```text
:~~ QA-SIMPLE ~~
:
:What's the most popular machine learning framework？
:
:--
:
:pytorch
:
:~~~~
```

<hr>

**Rendered**

:~~ QA-SIMPLE ~~
:
:What's the most popular machine learning framework？
:
:--
:
:pytorch
:
:~~~~

### Selection QA Extension

#### Basic Syntax

```text
:~~ QA-SELECTION ~~
:
:Qustion description here
:
:--
:
:[Y] Choice 1
:[N] Choice 2
:[Y] Choice 3
:[Y] Choice 4
:
:~~~~
```

1. All lines of code start with `:`.
2. The code block starts with `:~~ QA-SELECTION ~~`, ends with `:~~~~`.
3. The question part and the answer part are seperated with `:--`.
4. The choice format is `[x] description`，in which `x` is `Y` or `N` （`Y` for correct choices and `N` for wrong choices）

#### Example

**Code**

```text
:~~ QA-SELECTION ~~
:
:Make all the choices checked except the second one.
:
:--
:
:[Y] Choice 1
:[N] Choice 2
:[Y] Choice 3
:[Y] Choice 4
:
:~~~~
```

<hr>

**Rendered**

:~~ QA-SELECTION ~~
:
:Make all the choices checked except the second one.
:
:--
:
:[Y] Choice 1
:[N] Choice 2
:[Y] Choice 3
:[Y] Choice 4
:
:~~~~


### Code Snipets Execution QA Extension

#### Basic Syntax

```text
:~~ QA-CODE_EXECUTION ~~
:
:Qustion description here
:
:--
:
:```python
:
:# Coding here
:
:```
:
:~~~~
```

1. All lines of code start with `:`.
2. The code block starts with `:~~ QA-CODE_EXECUTION ~~`, ends with `:~~~~`.
3. The question part and the answer part are seperated with `:--`.
4. The answer part is the code block of markdown format and only python is supported.

#### Example

**Code**

```text
:~~ QA-CODE_EXECUTION ~~
:
:Write the code which outputs `Hello world!`.
:
:--
:
:```python
:
:def hello():
:    """function definition"""
:    print('Hello world!')
:
:# function call
:hello()
:
:```
:
:~~~~
```

<hr>

**Rendered**

:~~ QA-CODE_EXECUTION ~~
:
:Write the code which outputs `Hello world!`.
:
:--
:
:```python
:
:def hello():
:    """function definition"""
:    print('Hello world!')
:
:# function call
:hello()
:
:```
:
:~~~~

## Notes

1. Use  \`\`\`, but not `~~~` in the **code block**
2. Footnotes `[^xxx]` not supported
3. Use `*` instead of `_` for **bold** and **italic**
4. Definition has not been supported until now
5. Emoji has not been supported until now
6. Highlight `==Highlighted Text==` is not supported
