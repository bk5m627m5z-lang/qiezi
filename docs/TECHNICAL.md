# 神秘命运占卜 —— 技术文档

## 技术栈

- **HTML5** — 语义化标签，viewport 移动端适配
- **CSS3** — Flexbox、Grid、CSS 动画（@keyframes）、渐变、伪元素
- **原生 JavaScript (ES5)** — 无框架、无构建工具依赖，直接运行在浏览器中

## 项目文件结构

```
qiezi/
├── index.html          # 入口页面：10个 page div + loading + stars
├── css/
│   └── style.css       # 样式：18个分组，共约 350 行
├── js/
│   └── app.js          # 逻辑：10个功能模块，共约 280 行
├── docs/
│   ├── PRODUCT.md      # 产品文档
│   └── TECHNICAL.md    # 技术文档（本文件）
└── README.md           # 项目说明
```

## 架构说明

### SPA 模式（单页应用）

项目不使用路由库或多 HTML 文件，而是通过 CSS class 切换实现"页面"切换：

- 所有"页面"是 10 个 `<div class="page">` 同时在 DOM 中
- 默认 `display: none`，只有带 `.active` class 的页面显示（`display: flex`）
- `goToPage(n)` 函数：清除所有 `.active` → 给目标 div 加 `.active`
- 第10页（结果页）使用 `MutationObserver` 监听 `.active` 状态变化，一旦激活自动触发 `showFinalResult()`

### 数据流

```
用户输入 → userData 全局对象 → 结果计算函数 → DOM 渲染
```

`userData` 是整个应用的核心状态对象，结构如下：

```javascript
{
    name: '张三',          // 第2步输入
    zodiac: '天蝎座',      // 第3步选择
    zodiacEmoji: '♏',
    answers: ['A','B','C','D'],  // 第4-7步收集
    tarotCard: { name: '恋人', emoji: '💕', type: '爱情运势' },  // 第8步
    rune: 'ᚠ'             // 第9步
}
```

### 生命周期

1. **页面加载** → `createStars()` 生成星空
2. **用户逐页操作** → 数据逐步填充到 `userData`
3. **进入第10页** → `MutationObserver` 触发 `showFinalResult()`
4. **结果渲染** → `calculatePersonality()` + `generateFortune()` + `generateTarotResult()` 计算后写入 DOM
5. **分享/重置** → `shareResult()` 或 `restart()` 重置状态回到第1页

## 关键函数速查

### 页面导航
| 函数 | 说明 |
|------|------|
| `goToPage(n)` | 切换到第 n 页 |

### 用户输入
| 函数 | 说明 |
|------|------|
| `saveName()` | 保存姓名，空值校验 + 抖动反馈 |
| `selectZodiac(el, name, emoji)` | 选择星座 |
| `confirmZodiac()` | 确认星座，未选择时 alert |

### 答题流程
| 函数 | 说明 |
|------|------|
| `selectOption(el, value)` | 选中选项，清除同级其他选中 |
| `nextQuestion(nextPage)` | 记录答案并跳转 |
| `finishPersonality()` | 最后一题提交，显示 loading 后跳塔罗牌 |

### 互动元素
| 函数 | 说明 |
|------|------|
| `flipCard(el, name, emoji, type)` | 翻开塔罗牌，其他牌变暗 |
| `selectRune(el, rune)` | 选择符文，显示含义面板 |
| `createParticles(event)` | 水晶球点击粒子特效 |

### 结果计算
| 函数 | 返回值 | 说明 |
|------|--------|------|
| `calculatePersonality()` | `{title, desc}` | 按 A/B/C/D 出现次数判定性格 |
| `generateFortune()` | `{love, career, wealth, health}` | 基础分60 + 星座加权 + 随机值 |
| `generateTarotResult()` | `{title, content}` | 根据选中塔罗牌返回解读 |
| `showFinalResult()` | void | 汇总所有数据并渲染到第10页 |

### 工具函数
| 函数 | 说明 |
|------|------|
| `createStars()` | 生成 100 颗随机星星 |
| `showLoading(text, duration, callback)` | 全屏 loading 遮罩 |
| `shakeElement(el)` | 抖动动画反馈 |
| `shareResult()` | Web Share API / 剪贴板复制 |
| `restart()` | 重置所有状态回首页 |

## 运势计算逻辑

```
单项运势分 = MIN(98, 60 + 该星座在此项的加成 + random(0~19))
```

- 基础分 60，确保最低运势不低
- 星座加成：每个星座在 2 个维度有 5-20 分的额外加成
- 随机波动 0-19 分，保证每次结果略有不同
- 上限 98，不会出现 100%

## 兼容性说明

- 使用 ES5 语法（`var`、`function`），兼容 IE9+
- CSS 使用标准属性，动画兼容 Android 4.4+ / iOS 9+
- Web Share API 仅在不支持时回退到剪贴板复制
- `MutationObserver` 兼容 IE11+
