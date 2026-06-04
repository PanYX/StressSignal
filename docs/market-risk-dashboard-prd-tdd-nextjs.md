# 市场风险仪表盘项目立项与实施方案（Next.js）

版本：1.0  
日期：2026-05-28  
适用对象：产品、设计、研发、运营、Codex

---

## 1. 立项结论

建议立项，项目按 **“统一风险仪表盘 + 单指标详情页 + 方法论说明页 + 内容页”** 四层结构推进。

这个项目不是再做一个“只显示 VIX 数字”的小工具，而是做一个 **帮助用户理解风险是否正在跨资产扩散** 的市场风险站点。站点的核心价值不是“告诉用户今天恐慌不恐慌”，而是把权益波动、系统性金融压力、解读方法和背景内容放在一个地方，帮助用户建立稳定的观察框架。

**一句话定位：**  
给金融爱好者看的市场风险仪表盘，用统一页面把 VIX、期限结构、跨市场波动、金融压力与解读逻辑组织起来，让用户知道“现在是正常波动，还是风险开始共振”。

**本项目推荐采用：**
- 前端框架：Next.js 16.x + App Router + TypeScript
- 渲染模式：Server Components 为主，图表模块局部 Client Components
- 数据存储：Managed PostgreSQL + Drizzle ORM
- 部署：Vercel
- 定时同步：Vercel Cron（生产建议 Pro）或外部定时器打内网接口
- 内容系统：文件型 MDX
- 首版原则：**先做可公开、可持续、可解释的版本，不先碰高授权风险数据**

---

## 2. 背景与机会

### 2.1 用户问题

很多用户第一次接触市场风险指标时，会习惯性只看 VIX，然后把 VIX 高低直接理解成“市场危险”或“市场安全”。这会有两个问题：

1. 单看 VIX 很容易被短期消息带偏。  
2. 真正值得关注的，通常不是某一个指标抬头，而是多个市场的风险是否开始一起升温。

### 2.2 市场机会

现有公开工具常见两种形态：

1. **纯数据页**：数字很多，但不知道怎么读。  
2. **纯内容页**：解释很多，但没有数据联动。

本项目的机会点在于把工具和内容结合起来：

- 用统一风险仪表盘承接“现在怎么看”
- 用详情页解决“这个指标到底是什么”
- 用方法论页解决“几个图应该怎么一起看”
- 用文章页解决“为什么这次的市场环境不一样”

### 2.3 立项边界判断

本项目不是券商终端，不追求 tick 级实时性；  
本项目也不是投顾服务，不做买卖建议；  
本项目更像是一个 **市场风险观察工具 + 教育型内容站**。

---

## 3. 产品愿景、定位与原则

### 3.1 产品愿景

做一个让金融爱好者、交易型用户、内容创作者都愿意打开的“风险观察首页”。

### 3.2 目标用户

#### A. 金融爱好者
- 想知道今天市场是不是“真紧张”
- 不想只看社交媒体情绪
- 需要一个能长期复用的观察框架

#### B. 交易/资产配置用户
- 想快速判断风险是在权益市场、债市还是系统层面
- 需要风险代理指标来辅助仓位判断
- 需要历史区间、分位数、交叉验证

#### C. 财经内容创作者
- 需要可引用的图表和解释
- 需要清晰的数据来源与更新时间
- 需要能快速写解读的模板

### 3.3 产品原则

1. **解释优先于堆指标**  
   不做“指标越多越专业”的错觉，先保证每个指标有用、有解释。

2. **统一页面优先于分散页面**  
   先把首页的联合解读能力做好，再做更多子页面。

3. **公开可用优先于高风险抓取**  
   首版只接入稳定、公开、可维护的数据源；对授权不明或明确限制再分发的数据，放到后续 licensed 版本。

4. **内容价值优先于薄工具页**  
   每个核心页面都必须有解释、数据来源、更新时间、免责声明和延伸阅读。

---

## 4. 项目目标、成功指标与非目标

### 4.1 项目目标

**产品目标**
- 提供一个统一的市场风险总览页面
- 提供核心指标的详情页和方法论页
- 让用户能看懂“单指标信号”和“多指标共振”
- 为后续内容页、SEO 和商业化打基础

**技术目标**
- 建立稳定的数据同步、存储、缓存和展示链路
- 用 Next.js App Router 实现 SSR/ISR 友好的内容与数据站点
- 建立可扩展的指标配置与数据适配器机制
- 让 Codex 能按文档直接开始实现

### 4.2 成功指标（项目内指标）

不设置对外增长承诺，内部验收只看以下维度：

- 首页可在一次访问中回答“当前风险状态是什么”
- 每个指标页具备：定义、数据源、更新时间、图表、区间说明、常见误读
- 数据同步失败可监控、可重试、可追踪
- 至少具备一套自动生成的日度/周度解读文案模板
- SEO 基础设施完整：metadata、OG、sitemap、robots、结构化数据
- 站点在没有广告时也成立；广告只作为后续增强项

### 4.3 非目标

首版不做以下内容：

- 不做用户账户体系
- 不做交易信号订阅
- 不做实时分钟级行情
- 不做复杂自定义 watchlist
- 不做量化回测器
- 不做高级会员系统
- 不做所有全球市场指标一口气接入

---

## 5. 产品范围与版本规划

## 5.1 MVP（必须做）

### 页面
- 首页仪表盘 `/`
- 指标列表页 `/indicators`
- 单指标详情页 `/indicators/[slug]`
- 方法论说明页 `/how-to-read`
- 数据来源页 `/data-sources`
- 文章列表页 `/articles`
- 文章详情页 `/articles/[slug]`
- 关于页 `/about`
- 隐私政策 `/privacy`
- 使用条款 `/terms`

### 指标
- VIX
- VIX 3M（VXV）与 VIX/VXV 期限结构代理
- VXN
- RVX
- VXD
- STLFSI4
- NFCI
- ANFCI（可选但推荐）
- 站内综合风险分数（自研）

### 能力
- 日/周数据抓取与落库
- 最新值、近 1 日/5 日/20 日变化
- 1 年分位数、Z-Score
- 自动解读模块
- 文章系统（MDX）
- 方法论与指标解释文案

## 5.2 V1.1（建议后做）

- VIX9D
- VVIX
- SKEW
- Put/Call Ratio
- AAII Sentiment
- NAAIM Exposure Index
- 比较页 `/compare`
- 周报页 `/weekly`
- 社交分享图自动生成

## 5.3 V2（需要授权或更强运维后再做）

- MOVE Index
- High Yield OAS（公开展示前必须做授权审查）
- 全球市场模块（VSTOXX、India VIX、Nikkei 225 VI、VHSI）
- 用户收藏、自定义仪表盘
- 会员深度内容或 API 服务

---

## 6. 信息架构与路由设计

| 路由 | 页面类型 | 作用 | 是否 MVP |
| --- | --- | --- | --- |
| `/` | 首页仪表盘 | 统一看当前风险状态 | 是 |
| `/indicators` | 列表页 | 浏览全部指标 | 是 |
| `/indicators/vix` | 指标详情 | VIX 定义、图表、解读 | 是 |
| `/indicators/vix-term-proxy` | 指标详情 | VIX / VXV 或 VIX-VXV 期限代理 | 是 |
| `/indicators/vxn` | 指标详情 | 科技股波动 | 是 |
| `/indicators/rvx` | 指标详情 | 小盘股波动 | 是 |
| `/indicators/vxd` | 指标详情 | 道指波动 | 是 |
| `/indicators/stlfsi4` | 指标详情 | 圣路易斯联储金融压力 | 是 |
| `/indicators/nfci` | 指标详情 | Chicago Fed 金融条件 | 是 |
| `/how-to-read` | 方法论页 | 教用户如何联读多个图表 | 是 |
| `/data-sources` | 数据页 | 数据来源、频率、授权说明 | 是 |
| `/articles` | 内容页 | 文章列表 | 是 |
| `/articles/[slug]` | 内容页 | 深度文章 | 是 |
| `/compare` | 工具页 | 多指标对比 | 否（V1.1） |
| `/weekly` | 内容页 | 自动周报/周观察 | 否（V1.1） |
| `/about` | 静态页 | 产品介绍 | 是 |
| `/privacy` | 静态页 | 隐私政策 | 是 |
| `/terms` | 静态页 | 使用条款 | 是 |

---

## 7. 核心页面 PRD

## 7.1 首页仪表盘 `/`

### 页面目标
让用户在 10 秒内得到三个答案：
1. 当前整体风险状态如何  
2. 风险主要来自哪一类市场  
3. 这是不是系统性共振

### 页面结构

#### A. Hero 区
- 标题：市场风险仪表盘
- 副标题：把权益波动、金融压力和方法论放到一张首页里
- 数据更新时间
- 风险状态标签：平静 / 观察 / 升温 / 明显承压 / 风险共振

#### B. 综合风险温度
- 一个 0–100 的综合分数卡
- 一个简洁文字说明
- 一个“这分数是怎么来的”跳转到方法论页

#### C. 核心指标卡片
每张卡展示：
- 指标名
- 最新值
- 1D / 5D / 20D 变化
- 1Y 分位数
- 状态标签
- 跳转详情页

#### D. 联合解读模块
用一段人话解释目前的组合状态，例如：
- VIX 升，但 STLFSI4/NFCI 仍低于 0，说明更像权益市场短期波动
- VIX 和小盘/科技波动一起抬升，风险偏好下降更明显
- 风险分数上升主要来自权益端而不是系统端

#### E. 图表区
MVP 推荐 4 块：
- VIX + VXV（期限结构代理）
- VIX / VXN / RVX / VXD 对比
- STLFSI4 与 NFCI
- 综合风险分数时间序列

#### F. 说明区
- 这不是投资建议
- 数据延迟和来源说明
- 去看“如何阅读这个页面”

### 首页验收标准
- 无需滚动或少量滚动即可理解当前状态
- 每块信息都能跳到更深的解释页面
- 首页不能只剩数字，必须有说明文案
- 页面首屏必须有更新时间与数据来源入口

---

## 7.2 指标详情页 `/indicators/[slug]`

### 页面目标
回答“这个指标是什么、怎么看、有什么边界”。

### 页面结构
1. 指标简介  
2. 最新值与关键变化  
3. 主图（1 年默认，可切 3M / 1Y / 5Y / Max）  
4. 历史分位与状态说明  
5. 如何解读  
6. 常见误解  
7. 与哪些指标联读  
8. 数据源、更新时间、频率、授权说明  
9. 相关文章

### 示例：VIX 页必须回答的问题
- VIX 是什么
- 为什么不是“恐慌指数”四个字就能解释完
- 它和 VXV、VXN、RVX 的关系是什么
- VIX 高是否一定意味着马上下跌
- 为什么还要结合 STLFSI4 / NFCI 一起看

### 详情页验收标准
- 指标定义不超过两段就能让普通投资者理解
- 图表下方必须有解读文案，不允许只有图
- 必须展示数据源、更新时间、数据频率、商用备注

---

## 7.3 方法论页 `/how-to-read`

这是本项目必须有的一页，也是和“纯数据搬运页”拉开差距的关键页。

### 页面目标
用金融爱好者口吻告诉用户：这几个图要怎么一起看。

### 建议标题
**如何阅读这套市场风险仪表盘**

### 建议正文结构
1. 为什么不要只看一个 VIX  
2. 权益波动看什么  
3. 系统性压力看什么  
4. 什么叫“共振”  
5. 什么叫“表面平静但尾部风险变贵”  
6. 哪些情况值得提高警惕  
7. 哪些情况只是短期噪音

### 示例文案口吻
> 我自己看这套仪表盘时，不会把某一个数字当答案。  
> VIX 更像权益市场的体感温度，STLFSI4 和 NFCI 更像全身检查。  
> 单项升温不一定是系统性风险，但如果好几条线一起抬头，就值得认真一点。

> 如果只是 VIX 升了，而金融压力指数还在正常区间，我通常会把它先理解成“权益市场在重新给短期波动定价”，而不是直接下结论说系统性风险来了。

---

## 7.4 数据来源页 `/data-sources`

### 页面目标
公开透明，帮助用户与搜索引擎理解本站不是“黑箱”。

### 每条数据源必须展示
- 指标名
- Source Name
- 原始机构
- 获取方式（API / CSV / 手工维护 / 后续授权）
- 更新频率
- 最近更新时间
- 公开展示是否有额外授权风险
- 备注

---

## 7.5 文章页 `/articles/[slug]`

### 内容定位
不是新闻快讯，而是 evergreen 内容 + 周期解读。

### 首批文章建议
- 什么是 VIX：它到底测的是什么
- 为什么单看 VIX 容易误判
- VIX 与 VXV：期限结构怎么读
- VIX、VXN、RVX 分别在说什么
- STLFSI4 与 NFCI 有什么不同
- 风险升温时我会看哪几张图

### 文章模板
- 导语
- 本文结论
- 图表引用
- 方法解释
- 延伸阅读
- 数据来源
- 风险提示

---

## 8. 指标体系与数据来源策略

## 8.1 首版推荐的数据策略

首版不追求“指标越全越好”，而要追求 **数据合法性、稳定性、可维护性、可解释性**。

### 原则
1. 优先使用官方或官方镜像的稳定公开接口  
2. 能走 API 就不抓页面  
3. 明确要求预先批准或限制再分发的数据，不放进首版公开站  
4. 不因为“网上能看到”就默认可以公开商用再分发  

## 8.2 数据源矩阵

| 指标 | 首版建议 | 数据源 | 获取方式 | 更新频率 | 公开展示建议 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| VIX | MVP | FRED / CBOE | FRED API | 日频 | 可做 | 需注明来源 |
| VXV (VIX 3M) | MVP | FRED / CBOE | FRED API | 日频 | 可做 | 用作期限结构代理 |
| VXN | MVP | FRED / CBOE | FRED API | 日频 | 可做 | 科技股波动代理 |
| RVX | MVP | FRED / CBOE | FRED API | 日频 | 可做 | 小盘股波动代理 |
| VXD | MVP | FRED / CBOE | FRED API | 日频 | 可做 | 道指波动代理 |
| STLFSI4 | MVP | FRED | FRED API | 周频 | 可做 | 系统性压力核心指标 |
| NFCI | MVP | FRED / Chicago Fed | FRED API | 周频 | 可做 | 金融条件核心指标 |
| ANFCI | MVP（推荐） | FRED / Chicago Fed | FRED API | 周频 | 可做 | 金融条件相对经济条件的调整版本 |
| VIX9D | V1.1 | Cboe | 需页面/API审查 | 高频/日频 | 先不公开做 | 授权和抓取方式先审查 |
| VVIX | V1.1 | Cboe | 需页面/API审查 | 高频/日频 | 先不公开做 | 后续增强 |
| SKEW | V1.1 | Cboe | 需页面/API审查 | 高频/日频 | 先不公开做 | 后续增强 |
| Put/Call Ratio | V1.1 | Cboe | 页面抓取或授权数据 | 日频 | 审查后做 | 抓取稳定性和再分发需评估 |
| MOVE | V2 | ICE | Licensed API/Data Files | 日频/盘中 | 拿授权再做 | 不建议首版硬接 |
| High Yield OAS | V2 | ICE / FRED | FRED 可见但有再分发限制 | 日频 | 授权后再公开 | 明确有版权/预先批准风险 |
| AAII Sentiment | V1.1 | AAII | 手工/自动抓取需审查 | 周频 | 后做 | 更适合内容增强 |
| NAAIM Exposure | V1.1 | NAAIM | 手工/自动抓取需审查 | 周频 | 后做 | 更适合内容增强 |

## 8.3 首版明确不做的原因

### MOVE
MOVE 是非常好的利率波动指标，但公开、稳定、低风险地自动化接入并不简单。它更适合 licensed 版本，而不是 MVP。

### High Yield OAS
ICE BofA 的相关序列在 FRED 上可以查看，但系列说明里对再分发和公开使用有严格限制。  
**公开产品首版不应默认把这类数据拿来展示。**

### Put/Call Ratio / VVIX / SKEW
这些都很有价值，但首版如果要做得稳，应该先把 FRED 和 Chicago Fed 这类 API 化、节奏稳定的数据链路做扎实，再做页面抓取类适配器。

---

## 9. 自研综合风险分数与解读引擎

## 9.1 风险分数目标

不是做“神秘黑箱指数”，而是给首页一个更易读的总览层。

### 设计原则
- 分数仅用于导航，不替代原始指标
- 每个分数组成都能解释
- 页面上必须允许用户点进查看“分数怎么来的”

## 9.2 分数构成（MVP 版）

推荐用 0–100 分表达，基于 252 个交易日或 52 个周数据窗口计算标准化分位数。

### 建议公式

```text
risk_score =
  0.30 * pct_rank(VIX)
+ 0.15 * pct_rank(VIX / VXV)
+ 0.15 * pct_rank(max(VXN, RVX) - VIX)
+ 0.20 * pct_rank(STLFSI4)
+ 0.20 * pct_rank(NFCI)
```

### 档位定义
- 0–30：相对平静
- 30–50：中性观察
- 50–70：风险升温
- 70–85：明显承压
- 85–100：风险共振

## 9.3 规则解读引擎（MVP）

站内需要一个 deterministic 的解读模块，而不是一开始就完全依赖 LLM。

### 规则样例
- 若 `VIX_pct > 80` 且 `STLFSI4 < 0` 且 `NFCI < 0`  
  => 输出“权益市场短期波动升温，但系统性压力未同步走高”

- 若 `VIX_pct > 75` 且 `VXN_pct > 75` 且 `RVX_pct > 75`  
  => 输出“风险偏好在权益端扩散，科技与小盘同步承压”

- 若 `STLFSI4 > 0` 且 `NFCI > 0`  
  => 输出“系统性金融压力高于历史平均，需提升警惕”

- 若 `VIX / VXV > 1`  
  => 输出“短端波动率高于 3 个月波动率，近期事件风险溢价上升”

## 9.4 文案口吻要求

- 像一个长期看市场的人
- 不神神叨叨
- 不下交易指令
- 少用“暴涨暴跌、崩盘、抄底、梭哈”之类词
- 用“我会怎么读这组数据”式表达

### 示例
> 我现在对这组指标的感觉是：风险主要在权益端升温，但还不像系统性压力全面扩散。  
> VIX 在抬头，说明短期波动定价回来了；但 STLFSI4 和 NFCI 还没有同步转强，所以我更愿意把这理解成“市场在重新给短期风险定价”，而不是金融系统层面的全面紧张。

---

## 10. 内容、SEO 与站点可信度设计

## 10.1 内容策略

工具站要能过长期审视，不能做成薄页。  
所以每个核心入口都必须带说明内容。

### 必须存在的内容型页面
- How to Read 页面
- Data Sources 页面
- About 页面
- Privacy 页面
- Terms 页面
- 至少 6 篇核心文章

### 每个指标页必须有
- 定义
- 如何解读
- 与其他指标联读
- 常见误区
- 数据源与更新时间
- 风险提示

## 10.2 SEO 结构

### Metadata
每个页面都要有：
- 动态 `title`
- 动态 `description`
- canonical
- OG image
- Twitter image
- structured data

### 结构化数据建议
- `WebSite`
- `Organization`
- `BreadcrumbList`
- `Dataset`（数据源页/指标页）
- `Article`（文章页）

### 站点基础文件
- sitemap.xml
- robots.txt
- opengraph-image
- twitter-image
- favicon / apple-touch-icon

## 10.3 页面命名策略

建议以搜索友好和用户理解为先：
- `/indicators/vix`
- `/indicators/vix-vs-vix3m`
- `/articles/what-is-vix`
- `/articles/how-to-read-market-risk-dashboard`

---

## 11. 商业化、广告与合规预案

## 11.1 商业化原则

这个站点的商业化要排在“可信度”之后，而不是之前。  
如果首版就做成一堆跳转广告、弹窗和插屏，品牌会直接受损。

### 建议节奏
1. 首版先不放广告，先把内容结构和数据可信度做好  
2. 内容页成熟后，再尝试低干扰广告位  
3. 工具页尽量少打扰，内容页比工具页更适合承接广告  

## 11.2 广告形式建议

推荐优先级：
- Banner
- Native
- Contextual

谨慎或尽量避免：
- Popunder
- Push
- 全屏插屏
- 强干扰浮层

## 11.3 上线前必须具备的政策页

- About
- Privacy
- Terms
- Contact（可选但推荐）
- Cookie / Consent（面向欧盟或英国用户时需要）

## 11.4 数据合规原则

### 必须写进项目规范
- 不抓取明确禁止再分发的数据做公开页
- 所有数据卡片必须展示 source 和 last updated
- Data Sources 页面必须公开写清来源
- 对授权不明的数据，先内测、后公开
- 对带“pre-approval required”的序列，默认不进入公开 MVP

---

## 12. 技术方案总览（Next.js）

## 12.1 技术选型

### 核心栈
- 框架：Next.js 16.x
- 路由：App Router
- 语言：TypeScript
- UI：Tailwind CSS + shadcn/ui
- 图表：Recharts（MVP）
- 数据库：Managed PostgreSQL
- ORM：Drizzle ORM
- 校验：Zod
- 内容：MDX
- 测试：Vitest + Playwright
- 部署：Vercel
- 监控：Sentry（推荐）
- 分析：Plausible 或 PostHog（可选）

## 12.2 技术原则

1. **Server-first**
   - 页面数据默认在服务器获取
   - 首屏不要依赖客户端二次请求

2. **Route Handlers 管公共 API**
   - 公共 JSON API 走 `app/api/.../route.ts`
   - 内部 sync/revalidate 也走 Route Handlers

3. **Client Components 只用于交互图表**
   - 页面壳和数据装配尽量留在 Server Components
   - 图表、切换器、比较控件再下沉到 Client Components

4. **数据适配器统一封装**
   - 不允许页面直接 fetch 第三方源
   - 所有外部请求必须进 adapter 层，先校验再落库

---

## 13. 系统架构设计

## 13.1 架构概览

```text
[FRED / Chicago Fed / 未来授权源]
          ↓
   Data Adapters（抓取与解析）
          ↓
   Sync Jobs（Route Handler + Cron）
          ↓
     PostgreSQL（原始观察值 + 快照）
          ↓
  Data Access Layer（聚合、分位、变化）
          ↓
 Next.js Server Components / Route Handlers
          ↓
    Web UI（Dashboard / Indicators / Articles）
```

## 13.2 模块拆分

### A. Web App
- 页面渲染
- SEO
- UI 组件
- 内容页
- JSON API

### B. Ingestion Layer
- FRED adapter
- Chicago Fed adapter
- Cboe adapter（先占位）
- licensed sources adapter（后续）

### C. Compute Layer
- 计算变化率
- 计算分位数和 z-score
- 计算综合风险分数
- 生成解读文案

### D. Content Layer
- MDX 文章
- 方法论页
- 数据源说明页

---

## 14. 数据库设计

## 14.1 表设计

### `indicators`
指标主表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| slug | text unique | 例如 `vix` |
| name | text | 展示名 |
| category | text | `equity_vol`, `systemic_stress` 等 |
| description | text | 简短说明 |
| unit | text | `index`, `percent` |
| frequency | text | `daily`, `weekly` |
| status | text | `active`, `planned`, `licensed_only` |
| source_policy | text | `public_ok`, `review_required`, `licensed_only` |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### `indicator_sources`
指标与外部源映射表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| indicator_id | uuid | 外键 |
| provider | text | `fred`, `chicagofed`, `cboe`, `ice` |
| external_id | text | 如 `VIXCLS` |
| fetch_mode | text | `api_json`, `csv`, `manual`, `licensed_api` |
| source_url | text | 原始链接 |
| is_primary | boolean | 是否主源 |
| license_note | text | 授权说明 |
| active | boolean | 是否启用 |

### `observations`
原始时间序列表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| indicator_id | uuid | 外键 |
| observation_date | date | 观测日期 |
| value | numeric | 数值 |
| raw_payload | jsonb | 原始记录 |
| source_provider | text | 来源 |
| source_external_id | text | 外部 series id |
| fetched_at | timestamptz | 抓取时间 |
| unique(indicator_id, observation_date) | - | 去重约束 |

### `indicator_snapshots`
页面直接读取的快照表，避免每次现场计算。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| indicator_id | uuid | 主键/外键 |
| latest_value | numeric | 最新值 |
| latest_date | date | 最新日期 |
| change_1d | numeric | 1日变化 |
| change_5d | numeric | 5日变化 |
| change_20d | numeric | 20日变化 |
| pct_rank_1y | numeric | 1年分位数 |
| zscore_1y | numeric | 1年z-score |
| state_label | text | 平静/升温等 |
| updated_at | timestamptz | 快照生成时间 |

### `sync_runs`
同步任务日志。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| provider | text | 来源提供方 |
| job_name | text | 任务名 |
| status | text | `success`, `failed`, `partial` |
| started_at | timestamptz | 开始时间 |
| finished_at | timestamptz | 结束时间 |
| records_upserted | int | 写入数 |
| error_message | text | 错误摘要 |
| meta | jsonb | 附加信息 |

### `daily_commentaries`
每日/每周生成的总结文本。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | uuid | 主键 |
| as_of_date | date | 生效日期 |
| scope | text | `daily`, `weekly` |
| headline | text | 标题 |
| summary | text | 摘要 |
| body_md | text | 正文 |
| model | text | `rules_v1` 或未来 `llm_v1` |
| inputs_json | jsonb | 输入快照 |
| created_at | timestamptz | 创建时间 |

---

## 14.2 指标配置模型（建议代码化）

建议在代码中保留一份强类型配置，作为页面与同步逻辑的共享来源。

```ts
export type IndicatorConfig = {
  slug: string
  name: string
  category: 'equity_vol' | 'systemic_stress' | 'composite'
  frequency: 'daily' | 'weekly'
  unit: 'index' | 'percent'
  sourcePolicy: 'public_ok' | 'review_required' | 'licensed_only'
  primarySource: {
    provider: 'fred' | 'chicagofed' | 'cboe' | 'ice'
    externalId: string
    sourceUrl: string
    fetchMode: 'api_json' | 'csv' | 'manual' | 'licensed_api'
  }
}
```

---

## 15. 数据采集与同步设计

## 15.1 首版数据接入方式

### FRED adapter
适用于：
- VIXCLS
- VXVCLS
- VXNCLS
- RVXCLS
- VXDCLS
- STLFSI4
- NFCI
- ANFCI

### 请求规范
统一使用：
- HTTPS GET
- JSON 格式
- series/observations endpoint
- Zod 校验 response shape
- upsert 到 `observations`

### 示例 URL 模式
```text
https://api.stlouisfed.org/fred/series/observations?series_id=VIXCLS&api_key=YOUR_KEY&file_type=json
```

## 15.2 同步任务设计

### 内部路由
- `POST /api/internal/sync/fred`
- `POST /api/internal/sync/chicagofed`
- `POST /api/internal/compute-snapshots`
- `POST /api/internal/revalidate`

### 执行顺序
1. 拉取新数据
2. upsert observations
3. 计算 snapshots
4. 生成 commentary
5. 触发 cache revalidation

## 15.3 定时任务策略

### 生产建议
- 使用 Vercel Pro 的 Cron
- 每个美股交易日盘后同步一次日频数据
- 每周三在 NFCI 更新后再跑一次周频同步
- 设置一条手动可触发的重跑入口

### 兼容方案
如果不想绑定 Vercel Pro：
- GitHub Actions / 外部 scheduler 调用内部 sync endpoint
- endpoint 使用 `CRON_SECRET` 验证

---

## 16. 缓存与重验证策略

## 16.1 页面层策略

- 首页与指标页：服务器渲染
- 数据由数据库读取，不直接读第三方接口
- 快照层作为主要读取源
- 图表历史序列按时间窗口查询

## 16.2 Next.js 缓存策略

### 使用原则
- 页面尽量读本地数据库
- 数据同步成功后，使用 tag 级别重验证
- 避免客户端重复请求同一份首屏数据

### 建议 tag
- `summary`
- `indicator:vix`
- `indicator:vxn`
- `indicator:rvx`
- `indicator:vxd`
- `indicator:stlfsi4`
- `indicator:nfci`
- `articles`
- `data-sources`

---

## 17. API 设计（公开 API + 内部 API）

## 17.1 公开 API

### `GET /api/v1/summary`
返回首页概览所需信息。

```json
{
  "asOf": "2026-05-27",
  "riskScore": 61,
  "stateLabel": "风险升温",
  "headline": "权益端波动升温，系统性压力仍未共振",
  "topDrivers": ["vix", "vxn", "rvx"],
  "cards": [
    {
      "slug": "vix",
      "name": "VIX",
      "latestValue": 16.29,
      "change1d": -0.72,
      "pctRank1y": 0.61,
      "stateLabel": "观察"
    }
  ]
}
```

### `GET /api/v1/indicators`
返回指标列表。

### `GET /api/v1/indicators/:slug`
返回单指标元信息与快照。

### `GET /api/v1/indicators/:slug/observations?range=1y`
返回历史时间序列。

### `GET /api/v1/commentary?scope=daily`
返回最新自动解读。

## 17.2 内部 API

### `POST /api/internal/sync/fred`
- Header: `Authorization: Bearer ${CRON_SECRET}`
- 功能：拉取全部 FRED 系列

### `POST /api/internal/compute-snapshots`
- 功能：重算快照和风险分数

### `POST /api/internal/revalidate`
- 功能：按 tag 重建缓存

---

## 18. 前端组件设计

## 18.1 通用组件

- `PageHeader`
- `MetricCard`
- `Sparkline`
- `TimeRangeTabs`
- `ChartPanel`
- `SourceBadge`
- `FreshnessBadge`
- `StateBadge`
- `CommentaryBlock`
- `EmptyState`
- `DisclaimerBlock`

## 18.2 首页专属组件

- `RiskScoreGauge`
- `DriverPills`
- `DashboardGrid`
- `HowToReadCta`
- `MethodologyPreview`

## 18.3 指标页专属组件

- `IndicatorHero`
- `IndicatorDefinition`
- `IndicatorChart`
- `IndicatorStats`
- `InterpretationGuide`
- `MisreadWarnings`
- `ReadWithTheseIndicators`

---

## 19. 代码目录结构建议

```text
app/
  (site)/
    page.tsx
    indicators/
      page.tsx
      [slug]/
        page.tsx
    articles/
      page.tsx
      [slug]/
        page.tsx
    how-to-read/
      page.tsx
    data-sources/
      page.tsx
    about/
      page.tsx
    privacy/
      page.tsx
    terms/
      page.tsx
  api/
    v1/
      summary/route.ts
      indicators/route.ts
      indicators/[slug]/route.ts
      indicators/[slug]/observations/route.ts
      commentary/route.ts
    internal/
      sync/fred/route.ts
      sync/chicagofed/route.ts
      compute-snapshots/route.ts
      revalidate/route.ts
  sitemap.ts
  robots.ts
  opengraph-image.tsx
  icon.tsx
  error.tsx
  not-found.tsx
  layout.tsx

components/
  cards/
  charts/
  layout/
  indicators/
  commentary/
  shared/

content/
  articles/
  pages/

lib/
  db/
    client.ts
    schema.ts
    queries.ts
  indicators/
    configs.ts
    compute.ts
    labels.ts
  adapters/
    fred.ts
    chicagofed.ts
    cboe.ts
  commentary/
    rules.ts
    templates.ts
  seo/
    metadata.ts
    structured-data.ts
  utils/
    dates.ts
    numbers.ts
    arrays.ts
    env.ts

scripts/
  seed-indicators.ts
  backfill-fred.ts
  recompute-snapshots.ts

tests/
  unit/
  integration/
  e2e/
```

---

## 20. 工程约束（给 Codex 的明确规则）

1. 默认使用 Server Components。  
2. 只在图表、筛选器、tabs 这类需要交互的地方使用 Client Components。  
3. 页面不得直接请求第三方数据源，统一走 adapter。  
4. 数据先落库，页面只读库。  
5. 不在首版公开页面使用 `licensed_only` 或 `review_required` 且未经确认的数据。  
6. 所有对外展示的指标都必须附带：
   - 数据来源
   - 更新时间
   - 更新频率
   - 免责声明  
7. 所有 API response 必须用 Zod 做出站校验或静态类型约束。  
8. 所有内部 cron/sync 接口必须做 secret 校验。  
9. 所有页面必须有 metadata。  
10. 所有文章必须可静态生成。  
11. 首页首屏不得依赖客户端 `useEffect` 才拿到主数据。  
12. 图表库不能把整个页面变成 CSR。  

---

## 21. 测试与可观测性

## 21.1 必测内容

### 单元测试
- 分位数计算
- z-score 计算
- 风险分数计算
- 解读规则输出
- adapter 解析器

### 集成测试
- FRED adapter -> DB upsert
- compute snapshots
- summary API response shape

### E2E
- 首页首屏可见综合风险卡
- 指标页可正常切换时间范围
- 数据来源页可访问
- 文章页 metadata 正确
- 内部 sync 接口在无 secret 时拒绝访问

## 21.2 监控建议
- Sentry：捕获 route handler / page runtime error
- DB query logging：仅开发和 staging 开启
- Sync 日志：落 `sync_runs`
- 可选埋点：Plausible 或 PostHog

---

## 22. 上线前检查清单

### 产品
- 首页信息结构清晰
- 每个指标都有解释
- 方法论页可读
- Data Sources 页完整

### 工程
- 所有环境变量齐全
- Cron 能跑
- 手动 sync 能跑
- 缓存重建可用
- 错误页和空状态可用

### SEO
- metadata 完整
- OG 图可生成
- sitemap 正常
- robots 正常
- canonical 正常

### 合规
- 隐私政策存在
- 使用条款存在
- 数据授权风险已标注
- 首版未公开接入高风险再分发数据

---

## 23. 环境变量建议

```bash
NEXT_PUBLIC_SITE_URL=
DATABASE_URL=
FRED_API_KEY=
CRON_SECRET=
SENTRY_DSN=
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
POSTHOG_KEY=
```

可选：
```bash
BASIC_AUTH_USER=
BASIC_AUTH_PASSWORD=
```

---

## 24. 给 Codex 的实施顺序

## Milestone A：脚手架与基础页面
- 初始化 Next.js 16 App Router + TS + Tailwind + shadcn/ui
- 建立全局 layout、header、footer
- 建立首页、指标页、文章页、方法论页、数据来源页空壳
- 配置 metadata、sitemap、robots、OG

## Milestone B：数据库与配置
- 建立 Drizzle schema
- 写 `seed-indicators.ts`
- 写 indicator configs
- 完成查询层和 mock data fallback

## Milestone C：FRED 数据链路
- 写 FRED adapter
- 写 sync route
- 写 observations upsert
- 写 snapshots compute
- 写 summary API

## Milestone D：首页与详情页
- 首页卡片、图表、评论模块接真实数据
- 指标页接真实数据
- 方法论页与数据来源页补全
- 文章系统接入 MDX

## Milestone E：质量与收尾
- 增加 tests
- 增加 error/loading/not-found
- 增加 logs 和 sync_runs
- 加免责声明与 source badge
- 完成部署文档

## Milestone F：后续增强
- 加比较页
- 加 AAII/NAAIM
- 审查 Cboe/ICE 数据接入
- 增加 licensed 模式

---

## 25. 验收标准（Definition of Done）

### 产品完成定义
- 用户打开首页后，能在一屏内知道当前风险状态和主要驱动
- 单个指标页能解释指标本身，也能告诉用户如何与其他指标联读
- 站内至少有一页“如何读这套图”的方法论页
- 数据来源透明公开

### 技术完成定义
- 所有 MVP 指标都能自动同步
- 数据入库后能生成快照和解读
- 首页和详情页都从数据库取数
- API 和页面可在生产环境稳定运行
- 有基本测试和监控

### 质量完成定义
- 页面不出现“只有图没有解释”
- 页面不出现“只有数字没有来源”
- 站点不依赖不明授权的数据上线公开版本

---

## 26. 建议的首批站内文案

### 首页 Hero
**市场风险仪表盘**  
别只盯一个 VIX。把权益波动、期限结构和系统性压力放到一起看，才更接近真实的市场温度。

### 首页说明
我更关心的从来不是“某个指标今天高不高”，而是风险到底在什么地方升温：  
是股票市场自己在抖，还是系统层面的压力也在跟上。  
这套页面就是拿来回答这个问题的。

### 方法论页引导
如果你平时也喜欢盯图表，这一页会很实用。  
我们不是把几个指标堆在一起，而是把“这些指标什么时候该一起读、什么时候不要过度解读”讲明白。

---

## 27. 推荐的首版技术决策（供团队快速拍板）

### 必须拍板
- 使用 Next.js App Router
- 使用 TypeScript
- 使用 Server Components 为主
- 使用 PostgreSQL
- 使用 Drizzle ORM
- 使用 FRED 作为首版主数据源
- 使用 Vercel 作为部署平台
- 使用 MDX 管内容

### 可以后置
- 是否加会员
- 是否接入 Sentry
- 是否引入 PostHog / Plausible
- 是否在首版就放广告
- 是否做 compare 页面
- 是否做周报自动发布

---

## 28. 官方参考与数据源清单

### Next.js / Vercel
1. Next.js App Router  
   https://nextjs.org/docs/app

2. Next.js Route Handlers  
   https://nextjs.org/docs/app/getting-started/route-handlers

3. Next.js Metadata and OG images  
   https://nextjs.org/docs/app/getting-started/metadata-and-og-images

4. Next.js revalidateTag  
   https://nextjs.org/docs/app/api-reference/functions/revalidateTag

5. Next.js 16  
   https://nextjs.org/blog/next-16

6. Vercel Cron Quickstart  
   https://vercel.com/docs/cron-jobs/quickstart

7. Vercel Cron Usage & Pricing  
   https://vercel.com/docs/cron-jobs/usage-and-pricing

### 数据源
8. FRED API Overview  
   https://fred.stlouisfed.org/docs/api/fred/

9. FRED series/observations  
   https://fred.stlouisfed.org/docs/api/fred/series_observations.html

10. VIX (VIXCLS)  
    https://fred.stlouisfed.org/series/VIXCLS

11. VXV (VXVCLS)  
    https://fred.stlouisfed.org/series/VXVCLS

12. VXN (VXNCLS)  
    https://fred.stlouisfed.org/series/VXNCLS

13. RVX (RVXCLS)  
    https://fred.stlouisfed.org/series/RVXCLS

14. VXD (VXDCLS)  
    https://fred.stlouisfed.org/series/VXDCLS

15. STLFSI4  
    https://fred.stlouisfed.org/series/STLFSI4

16. NFCI  
    https://fred.stlouisfed.org/series/NFCI

17. ANFCI  
    https://fred.stlouisfed.org/series/ANFCI

18. Cboe VIX Term Structure  
    https://www.cboe.com/tradable-products/vix/term-structure/

19. ICE MOVE Index  
    https://developer.ice.com/fixed-income-data-services/catalog/ice-data-indices-move-index

20. Chicago Fed NFCI current data  
    https://www.chicagofed.org/research/data/nfci/current-data

---

## 29. 最终建议

这个项目首版最重要的不是“把所有听起来厉害的指标都接上”，而是先把一条可靠的产品逻辑跑通：

**统一风险首页 → 单指标详情 → 方法论说明 → 内容页承接 → 后续再扩更多数据源。**

只要这条链路成立，这个站就不是一次性工具，而是一个可以持续长大的资产。