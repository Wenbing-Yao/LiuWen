
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

## Notes

1. Use  \`\`\`, but not `~~~` in the **code block**
2. Footnotes `[^xxx]` not supported
3. Use `*` instead of `_` for **bold** and **italic**
4. Definition has not been supported until now
5. Emoji has not been supported until now
6. Highlight `==Highlighted Text==` is not supported
