# Codex 实施指令：市场风险仪表盘（Next.js）

你要实现的项目，是一个以 **统一风险仪表盘** 为核心的市场风险站点。  
主文档：`market-risk-dashboard-prd-tdd-nextjs.md`

请严格按下面顺序落地，不要跳步，不要先接高风险授权数据。

---

## 0. 实施原则

1. 使用 **Next.js 16.x + App Router + TypeScript**
2. 默认使用 **Server Components**
3. 公共 API 与内部同步任务使用 **Route Handlers**
4. 数据先入库再展示，页面不得直接请求第三方源
5. 首版只接入：
   - VIXCLS
   - VXVCLS
   - VXNCLS
   - RVXCLS
   - VXDCLS
   - STLFSI4
   - NFCI
   - ANFCI（推荐）
6. 首版不要接：
   - MOVE
   - High Yield OAS
   - Put/Call Ratio
   - VVIX
   - SKEW
7. 所有展示页都要显示：
   - 数据来源
   - 数据更新时间
   - 数据频率
   - 风险提示
8. 所有对外页面必须有 metadata
9. 所有内部 sync 接口必须用 `CRON_SECRET` 校验
10. 代码必须可运行，不要只生成壳子

---

## 1. 初始化项目

### 目标
完成一个可运行的 Next.js 应用骨架，包含基础布局和空页面。

### 要做的事
- 初始化 Next.js 16.x + TypeScript + Tailwind CSS
- 安装并配置 shadcn/ui
- 创建以下页面：
  - `/`
  - `/indicators`
  - `/indicators/[slug]`
  - `/articles`
  - `/articles/[slug]`
  - `/how-to-read`
  - `/data-sources`
  - `/about`
  - `/privacy`
  - `/terms`
- 创建：
  - `app/layout.tsx`
  - `app/error.tsx`
  - `app/not-found.tsx`
  - `app/sitemap.ts`
  - `app/robots.ts`
  - `app/opengraph-image.tsx`

### 完成标准
- 所有页面都能访问
- Tailwind 正常工作
- 有 header / footer / container layout

---

## 2. 建立数据层

### 技术要求
- 使用 PostgreSQL
- 使用 Drizzle ORM
- 建立：
  - `indicators`
  - `indicator_sources`
  - `observations`
  - `indicator_snapshots`
  - `sync_runs`
  - `daily_commentaries`

### 要做的事
- 编写 `lib/db/schema.ts`
- 编写 `lib/db/client.ts`
- 编写 migration
- 编写 `scripts/seed-indicators.ts`
- 初始化首版指标配置：
  - vix
  - vix-term-proxy
  - vxn
  - rvx
  - vxd
  - stlfsi4
  - nfci
  - anfci

### 完成标准
- 本地数据库可迁移
- 可成功 seed 指标主数据

---

## 3. 接入 FRED adapter

### 要做的事
- 编写 `lib/adapters/fred.ts`
- 封装 FRED `series/observations` 请求
- 支持传入 series_id、api_key、file_type=json
- 用 Zod 校验 response
- 转成统一 observation 结构

### 需要支持的 series_id
- VIXCLS
- VXVCLS
- VXNCLS
- RVXCLS
- VXDCLS
- STLFSI4
- NFCI
- ANFCI

### 完成标准
- 能独立跑一个 adapter 测试并返回结构化数据
- 出错时有清晰报错

---

## 4. 编写同步任务

### 要做的事
创建以下 Route Handlers：
- `POST /api/internal/sync/fred`
- `POST /api/internal/compute-snapshots`
- `POST /api/internal/revalidate`

### 逻辑要求
#### `/api/internal/sync/fred`
- 校验 `Authorization: Bearer ${CRON_SECRET}`
- 拉取所有首版 series
- upsert observations
- 写入 `sync_runs`

#### `/api/internal/compute-snapshots`
- 读取每个指标最近数据
- 计算：
  - latest_value
  - latest_date
  - change_1d
  - change_5d
  - change_20d
  - pct_rank_1y
  - zscore_1y
  - state_label
- 写入 `indicator_snapshots`

#### `/api/internal/revalidate`
- 按 tag 调用 `revalidateTag`

### 完成标准
- 可以通过 curl 或 Postman 触发
- 可以看到 `observations` 和 `indicator_snapshots` 真正有数据

---

## 5. 建立查询层与计算层

### 要做的事
- `lib/db/queries.ts`
- `lib/indicators/compute.ts`
- `lib/indicators/configs.ts`
- `lib/indicators/labels.ts`
- `lib/commentary/rules.ts`
- `lib/commentary/templates.ts`

### 必须支持的能力
- 获取首页 summary
- 获取单指标快照
- 获取单指标历史序列（3M / 1Y / 5Y / MAX）
- 计算 VIX/VXV 期限代理
- 计算综合风险分数
- 输出 deterministic commentary

### Commentary 规则至少包含
- 仅权益端升温
- 权益端全面升温
- 系统性压力升温
- 期限结构倒向短端风险

---

## 6. 实现公开 API

### 要做的事
创建：
- `GET /api/v1/summary`
- `GET /api/v1/indicators`
- `GET /api/v1/indicators/[slug]`
- `GET /api/v1/indicators/[slug]/observations`
- `GET /api/v1/commentary`

### 响应要求
- 统一 JSON 结构
- 类型安全
- 错误响应明确
- 所有 response 都包含 `asOf` 或 `updatedAt`

---

## 7. 实现首页仪表盘

### 页面必须包含
- 风险分数总览
- 主要驱动标签
- 核心指标卡片
- 联合解读模块
- 图表区（至少 4 块）
- 数据说明与 CTA

### 图表建议
- VIX + VXV
- VIX / VXN / RVX / VXD
- STLFSI4 + NFCI
- 综合风险分数

### 约束
- 首屏主数据必须服务端拿到
- 图表可以用 Client Component
- 但整个首页不能因为图表而 CSR

---

## 8. 实现指标详情页

### 页面必须包含
- 指标标题与定义
- 最新值与变化
- 主图表
- 如何解读
- 常见误区
- 联读建议
- 数据源与更新时间

### 要求
- 为每个首版指标生成页面
- 页面文案允许从配置层读取静态内容
- 时间范围切换用客户端组件，但数据首屏服务端输出

---

## 9. 接入 MDX 内容系统

### 要做的事
- 建立 `content/articles` 目录
- 支持 frontmatter
- 创建文章列表页和文章详情页
- 预置至少 6 篇文章占位文件

### 必须有的文章
- what-is-vix
- why-not-just-vix
- how-to-read-market-risk-dashboard
- vix-vs-vix3m
- vix-vxn-rvx-differences
- stlfsi-vs-nfci

---

## 10. 实现方法论页与数据来源页

### `/how-to-read`
要写成一个真正可读的方法论页面，不要只是一段空文案。

### `/data-sources`
要用表格展示：
- 指标
- source
- 获取方式
- 更新频率
- 公开展示备注

并明确写出：
- 首版未公开接入需要额外授权的数据
- 高风险数据后续再做 licensed 模式

---

## 11. SEO 与质量补齐

### 要做的事
- 每个页面配置 metadata
- 动态 OG image
- sitemap
- robots
- canonical
- breadcrumb structured data
- article structured data
- dataset structured data（至少指标页和数据来源页）

### 质量要求
- 有 `loading.tsx` 或等效 loading UI
- 有 `error.tsx`
- 有空状态
- 有 source badge / freshness badge / disclaimer block

---

## 12. 测试

### 最少要有
#### Unit tests
- 分位数计算
- z-score
- 风险分数
- commentary rules
- fred adapter parser

#### Integration tests
- sync -> upsert -> snapshot

#### E2E
- 首页可打开
- 指标页可打开
- 文章页可打开
- 数据来源页可打开
- 无 secret 时内部接口拒绝访问

---

## 13. 交付标准

你交付的项目必须满足：

1. 本地能跑
2. 数据库迁移能跑
3. seed 能跑
4. sync 能跑
5. 首页有真实数据
6. 指标页有真实数据
7. 方法论页和数据来源页不是空壳
8. 文章系统可用
9. 代码结构清晰
10. 没有把高授权风险数据硬塞进 MVP

---

## 14. 最后提醒

- 不要把首版做成“数据很多，但没有解释”的壳。
- 不要把首版做成“只有文章，没有工具”的博客。
- 不要为了好看先接 MOVE / HY OAS 这类授权风险数据。
- 先把 **统一首页 + 首版指标 + 方法论 + 内容承接** 做扎实。