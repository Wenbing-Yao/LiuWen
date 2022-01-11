
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

## 注意事项

1. 块级代码使用 \`\`\`, 不要使用 `~~~`
2. 不支持 Footnotes 语法`[^xxx]`
3. 建议加粗、斜体使用 `*` 而非下划线 `_`
4. 暂不支持定义列表
5. 暂不支持 Emoji
6. 暂不支持高亮：`==高亮文字==`
