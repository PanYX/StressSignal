export const INDICATOR_CATEGORIES = [
  "equity_vol",
  "systemic_stress",
  "composite",
  "tail_risk",
  "sentiment",
  "fear_greed",
  "global_risk",
] as const;
export type IndicatorCategory = (typeof INDICATOR_CATEGORIES)[number];

export const INDICATOR_FREQUENCIES = ["daily", "weekly"] as const;
export type IndicatorFrequency = (typeof INDICATOR_FREQUENCIES)[number];

export const INDICATOR_UNITS = ["index", "percent"] as const;
export type IndicatorUnit = (typeof INDICATOR_UNITS)[number];

export const SOURCE_POLICIES = ["public_ok", "review_required", "licensed_only"] as const;
export type SourcePolicy = (typeof SOURCE_POLICIES)[number];

export const INDICATOR_STATUSES = ["active", "planned", "licensed_only"] as const;
export type IndicatorStatus = (typeof INDICATOR_STATUSES)[number];

export const SOURCE_PROVIDERS = [
  "fred",
  "chicagofed",
  "cboe",
  "ice",
  "aaii",
  "naaim",
  "edgmap",
  "stoxx",
  "nse",
  "nikkei",
  "hkex",
  "internal",
] as const;
export type SourceProvider = (typeof SOURCE_PROVIDERS)[number];

export const SOURCE_FETCH_MODES = [
  "api_json",
  "csv",
  "json",
  "next_rsc",
  "xlsx",
  "public_table",
  "ajax_json",
  "embedded_json",
  "manual",
  "licensed_api",
] as const;
export type SourceFetchMode = (typeof SOURCE_FETCH_MODES)[number];

export type IndicatorSourceRole =
  | "vix"
  | "vixv"
  | "vvix"
  | "skew"
  | "aaii_bullish"
  | "aaii_bearish"
  | "aaii_neutral"
  | "naaim_exposure"
  | "put_call"
  | "hy_oas"
  | "breadth"
  | "momentum"
  | "regional_vol"
  | "primary_leg"
  | "secondary_leg";

export type IndicatorSourceConfig = {
  provider: SourceProvider;
  externalId: string;
  sourceUrl: string;
  fetchMode: SourceFetchMode;
  isPrimary: boolean;
  licenseNote: string;
  active: boolean;
  role?: IndicatorSourceRole;
};

export type IndicatorInterpretation = {
  overview: string;
  readHint: string;
  caveat: string;
};

export type IndicatorConfig = {
  slug: IndicatorSlug;
  name: string;
  category: IndicatorCategory;
  frequency: IndicatorFrequency;
  unit: IndicatorUnit;
  status: IndicatorStatus;
  sourcePolicy: SourcePolicy;
  description: string;
  interpretation: IndicatorInterpretation;
  sources: readonly IndicatorSourceConfig[];
};

export const MVP_INDICATOR_SLUGS = [
  "vix",
  "vix-term-proxy",
  "vxn",
  "rvx",
  "vxd",
  "stlfsi4",
  "nfci",
  "anfci",
  "vvix",
  "skew",
  "vvix-vix-ratio",
  "aaii-bullish",
  "aaii-bearish",
  "aaii-neutral",
  "aaii-bull-bear-spread",
  "naaim-exposure",
  "naaim-exposure-ma4",
  "put-call-ratio",
  "hy-oas",
  "momentum-proxy",
  "fear-greed-internal",
  "vstoxx",
  "india-vix",
  "nikkei-225-vi",
  "vhsi",
  "global-vol-composite",
] as const;
export type IndicatorSlug = (typeof MVP_INDICATOR_SLUGS)[number];

export const MVP_INDICATOR_CONFIGS: readonly IndicatorConfig[] = [
  {
    slug: "vix",
    name: "VIX",
    category: "equity_vol",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "public_ok",
    description:
      "VIX 反映标普 500 期权市场对未来 30 天波动率的定价，是权益端短期风险溢价的代表指标。",
    interpretation: {
      overview:
        "VIX 抬升说明短端权益波动被重新定价，但它不是“马上下跌”的直接信号。",
      readHint:
        "我会把它和 VXV、VXN/RVX 以及 STLFSI4/NFCI 一起看：只涨 VIX，通常先按权益端短期波动处理。",
      caveat:
        "事件驱动、财报、议息和假期流动性都会让 VIX 短暂失真，单日跳动不应过度解读。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "VIXCLS",
        sourceUrl: "https://fred.stlouisfed.org/series/VIXCLS",
        fetchMode: "api_json",
        isPrimary: true,
        licenseNote:
          "Public macro series from FRED. Re-distribution policy: public_ok.",
        active: true,
      },
    ],
  },
  {
    slug: "vix-term-proxy",
    name: "VIX/VXV Term Proxy",
    category: "composite",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "public_ok",
    description:
      "用 VIX 与 3 个月波动率 VXV 观察期限结构，判断近期风险溢价是否比中期更贵。",
    interpretation: {
      overview:
        "VIX/VXV 上行说明短端波动率相对中期更贵，市场更在意眼前事件。",
      readHint:
        "当比值接近或超过 1，我会优先排查近期事件风险，而不是只看 VIX 的绝对点位。",
      caveat:
        "期限结构对流动性和节假日很敏感，最好观察连续几天而不是只看一个点。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "VIXCLS",
        sourceUrl: "https://fred.stlouisfed.org/series/VIXCLS",
        fetchMode: "api_json",
        isPrimary: true,
        role: "vix",
        licenseNote:
          "Primary composite leg for VIX/VXV ratio. Public macro series from FRED.",
        active: true,
      },
      {
        provider: "fred",
        externalId: "VXVCLS",
        sourceUrl: "https://fred.stlouisfed.org/series/VXVCLS",
        fetchMode: "api_json",
        isPrimary: false,
        role: "vixv",
        licenseNote:
          "Secondary composite leg for VIX/VXV ratio. Public macro series from FRED.",
        active: true,
      },
    ],
  },
  {
    slug: "vxn",
    name: "VXN",
    category: "equity_vol",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "public_ok",
    description:
      "VXN 观察纳斯达克 100 的隐含波动率，是科技与成长股风险偏好的温度计。",
    interpretation: {
      overview:
        "VXN 上行通常代表科技/成长板块的风险溢价变贵。",
      readHint:
        "如果 VXN 先于 VIX 抬头，风险可能仍集中在科技权重；若 VIX、RVX 同步上行，扩散性更强。",
      caveat:
        "纳指权重集中，个别大型科技股和利率预期会放大这个指标的短期波动。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "VXNCLS",
        sourceUrl: "https://fred.stlouisfed.org/series/VXNCLS",
        fetchMode: "api_json",
        isPrimary: true,
        licenseNote:
          "Public macro series from FRED. Re-distribution policy: public_ok.",
        active: true,
      },
    ],
  },
  {
    slug: "rvx",
    name: "RVX",
    category: "equity_vol",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "public_ok",
    description:
      "RVX 观察 Russell 2000 小盘股隐含波动率，更容易反映融资环境和风险偏好收缩。",
    interpretation: {
      overview:
        "RVX 抬升通常说明小盘股承压，市场开始减少对高 beta 资产的容忍。",
      readHint:
        "如果 RVX 与 VIX/VXN 一起走高，我会把它看成权益端风险偏好在扩散。",
      caveat:
        "小盘股本身更敏感，RVX 噪音高于宽基波动率，适合看趋势和相对变化。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "RVXCLS",
        sourceUrl: "https://fred.stlouisfed.org/series/RVXCLS",
        fetchMode: "api_json",
        isPrimary: true,
        licenseNote:
          "Public macro series from FRED. Re-distribution policy: public_ok.",
        active: true,
      },
    ],
  },
  {
    slug: "vxd",
    name: "VXD",
    category: "equity_vol",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "public_ok",
    description:
      "VXD 观察道琼斯成分股的隐含波动率，补充判断大型传统行业的风险定价。",
    interpretation: {
      overview:
        "VXD 能补上科技和小盘之外的视角：大型传统行业是否也开始重估波动。",
      readHint:
        "我会把 VXD 和 VIX/VXN/RVX 横向比较，用来判断风险集中在哪类股票。",
      caveat:
        "道指成分和权重特殊，不能把它当成整个股票市场的唯一代表。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "VXDCLS",
        sourceUrl: "https://fred.stlouisfed.org/series/VXDCLS",
        fetchMode: "api_json",
        isPrimary: true,
        licenseNote:
          "Public macro series from FRED. Re-distribution policy: public_ok.",
        active: true,
      },
    ],
  },
  {
    slug: "stlfsi4",
    name: "STLFSI4",
    category: "systemic_stress",
    frequency: "weekly",
    unit: "index",
    status: "active",
    sourcePolicy: "public_ok",
    description:
      "STLFSI4 是圣路易斯联储金融压力指标，用来观察信用、利率和流动性压力是否走强。",
    interpretation: {
      overview:
        "STLFSI4 上行时，我会更认真地看系统层面的压力，而不是只看股市波动。",
      readHint:
        "如果它和 NFCI 同时上行，并且 VIX 也抬头，风险共振的可信度会明显提高。",
      caveat:
        "这是周度/宏观压力指标，反应不一定像 VIX 那样快，但一旦趋势成立更值得重视。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "STLFSI4",
        sourceUrl: "https://fred.stlouisfed.org/series/STLFSI4",
        fetchMode: "api_json",
        isPrimary: true,
        licenseNote:
          "Public macro series from FRED. Re-distribution policy: public_ok.",
        active: true,
      },
    ],
  },
  {
    slug: "nfci",
    name: "NFCI",
    category: "systemic_stress",
    frequency: "weekly",
    unit: "index",
    status: "active",
    sourcePolicy: "public_ok",
    description:
      "NFCI 是芝加哥联储金融条件指标，用于观察金融系统整体松紧程度。",
    interpretation: {
      overview:
        "NFCI 转强说明金融条件收紧，信用和流动性压力可能正在抬头。",
      readHint:
        "如果 NFCI 与 STLFSI4 都高于正常区间，我会把风险判断从权益波动升级到系统压力观察。",
      caveat:
        "NFCI 是周度指标，适合看区间和趋势，不适合做日内判断。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "NFCI",
        sourceUrl: "https://fred.stlouisfed.org/series/NFCI",
        fetchMode: "api_json",
        isPrimary: true,
        licenseNote:
          "Public macro series from FRED. Re-distribution policy: public_ok.",
        active: true,
      },
    ],
  },
  {
    slug: "anfci",
    name: "ANFCI",
    category: "systemic_stress",
    frequency: "weekly",
    unit: "index",
    status: "active",
    sourcePolicy: "public_ok",
    description:
      "ANFCI 是调整后的 NFCI，用来剥离部分经济周期影响，辅助观察金融条件本身。",
    interpretation: {
      overview:
        "ANFCI 更适合帮助判断：压力来自金融条件本身，还是经济背景变化。",
      readHint:
        "我会把 ANFCI 与 NFCI、STLFSI4 放在一起看，用来交叉验证系统压力叙事。",
      caveat:
        "它是 NFCI 的配套视角，不应单独拿来下结论。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "ANFCI",
        sourceUrl: "https://fred.stlouisfed.org/series/ANFCI",
        fetchMode: "api_json",
        isPrimary: true,
        licenseNote:
          "Public macro series from FRED. Re-distribution policy: public_ok.",
        active: true,
      },
    ],
  },
  {
    slug: "vvix",
    name: "VVIX",
    category: "tail_risk",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "VVIX 观察 VIX 自身的隐含波动率，用来判断市场是否在重新定价“波动率的波动”。",
    interpretation: {
      overview:
        "VVIX 抬升时，说明市场不只是在买标普波动，也在给波动率本身的不确定性加价。",
      readHint:
        "我会把 VVIX 和 VIX、SKEW 一起看：VIX 平静但 VVIX 偏高时，要警惕表面稳定下的防守需求。",
      caveat:
        "VVIX 对期权结构和短期事件很敏感，最好结合 1Y 分位和连续变化，而不是只看绝对点位。",
    },
    sources: [
      {
        provider: "cboe",
        externalId: "VVIX",
        sourceUrl:
          "https://cdn.cboe.com/api/global/us_indices/daily_prices/VVIX_History.csv",
        fetchMode: "csv",
        isPrimary: true,
        role: "vvix",
        licenseNote:
          "Cboe public CSV endpoint discovered for historical index levels. Display policy remains review_required until redistribution review is completed.",
        active: true,
      },
    ],
  },
  {
    slug: "skew",
    name: "SKEW",
    category: "tail_risk",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "SKEW 用来观察标普 500 收益分布尾部偏度，常被用作极端下跌保护需求的参考。",
    interpretation: {
      overview:
        "SKEW 偏高时，更像是市场在给极端尾部保护加价，而不一定表现为 VIX 立刻升高。",
      readHint:
        "如果 SKEW 和 VVIX 同时升温，我会把它看成“水下防守需求”正在增强。",
      caveat:
        "SKEW 的高低不能和 VIX 直接横比，应该用自己的历史分位来读。",
    },
    sources: [
      {
        provider: "cboe",
        externalId: "SKEW",
        sourceUrl:
          "https://cdn.cboe.com/api/global/us_indices/daily_prices/SKEW_History.csv",
        fetchMode: "csv",
        isPrimary: true,
        role: "skew",
        licenseNote:
          "Cboe public CSV endpoint discovered for historical index levels. Display policy remains review_required until redistribution review is completed.",
        active: true,
      },
    ],
  },
  {
    slug: "vvix-vix-ratio",
    name: "VVIX/VIX Ratio",
    category: "tail_risk",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "用 VVIX 与 VIX 的比值观察波动率本身是否比表面 VIX 更紧张。",
    interpretation: {
      overview:
        "比值上行说明市场对波动率自身的定价升温快于 VIX，适合捕捉表面平静背后的波动不确定性。",
      readHint:
        "我会把它放在尾部风险页中间读：先看 VVIX/SKEW，再用比值确认防守需求是否更偏隐性。",
      caveat:
        "这是派生比值，不是官方单独指数；用于联读，不适合单独作为风险结论。",
    },
    sources: [
      {
        provider: "cboe",
        externalId: "VVIX",
        sourceUrl:
          "https://cdn.cboe.com/api/global/us_indices/daily_prices/VVIX_History.csv",
        fetchMode: "csv",
        isPrimary: true,
        role: "vvix",
        licenseNote:
          "Primary leg for VVIX/VIX ratio from Cboe public CSV endpoint.",
        active: true,
      },
      {
        provider: "fred",
        externalId: "VIXCLS",
        sourceUrl: "https://fred.stlouisfed.org/series/VIXCLS",
        fetchMode: "api_json",
        isPrimary: false,
        role: "vix",
        licenseNote:
          "Secondary leg for VVIX/VIX ratio. Public macro series from FRED.",
        active: true,
      },
    ],
  },
  {
    slug: "aaii-bullish",
    name: "AAII Bullish",
    category: "sentiment",
    frequency: "weekly",
    unit: "percent",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "AAII Bullish 反映散户投资者对未来 6 个月市场走势偏乐观的比例。",
    interpretation: {
      overview:
        "多头比例上升代表主观情绪变暖，但它回答的是“大家怎么想”，不是仓位实际怎么摆。",
      readHint:
        "我会把 Bullish、Bearish 和 NAAIM 放在一起看，用来区分嘴上乐观和真实仓位。",
      caveat:
        "调查数据是周度样本，适合看情绪温度和方向，不适合做短线触发器。",
    },
    sources: [
      {
        provider: "edgmap",
        externalId: "AAII_BULLISH",
        sourceUrl:
          "https://edgmap.com/macrochart/aaii",
        fetchMode: "embedded_json",
        isPrimary: true,
        role: "aaii_bullish",
        licenseNote:
          "AAII bullish sentiment is fetched from EDGMAP's public embedded JSON mirror of AAII survey data; display policy remains review_required.",
        active: true,
      },
    ],
  },
  {
    slug: "aaii-bearish",
    name: "AAII Bearish",
    category: "sentiment",
    frequency: "weekly",
    unit: "percent",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "AAII Bearish 反映散户投资者对未来 6 个月市场走势偏悲观的比例。",
    interpretation: {
      overview:
        "空头比例上升说明主观担忧升温，但要和 NAAIM 仓位一起确认是否真的降风险。",
      readHint:
        "如果 Bearish 高而 NAAIM 也降，情绪和仓位更一致；如果 Bearish 高但仓位仍满，要小心“嘴上怕”。",
      caveat:
        "调查口径受样本和当周新闻影响，最好看 4 周趋势而不是单周变化。",
    },
    sources: [
      {
        provider: "edgmap",
        externalId: "AAII_BEARISH",
        sourceUrl:
          "https://edgmap.com/macrochart/aaii",
        fetchMode: "embedded_json",
        isPrimary: true,
        role: "aaii_bearish",
        licenseNote:
          "AAII bearish sentiment is fetched from EDGMAP's public embedded JSON mirror of AAII survey data; display policy remains review_required.",
        active: true,
      },
    ],
  },
  {
    slug: "aaii-neutral",
    name: "AAII Neutral",
    category: "sentiment",
    frequency: "weekly",
    unit: "percent",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "AAII Neutral 反映散户投资者对未来 6 个月走势保持中性的比例。",
    interpretation: {
      overview:
        "中性比例高时，市场未必乐观或悲观，更多是等待确认。",
      readHint:
        "Neutral 上升常用来判断情绪是否从极端回到观望，适合和 Bull-Bear Spread 一起读。",
      caveat:
        "中性比例不是风险低的同义词，只说明主观方向感不强。",
    },
    sources: [
      {
        provider: "edgmap",
        externalId: "AAII_NEUTRAL",
        sourceUrl:
          "https://edgmap.com/macrochart/aaii",
        fetchMode: "embedded_json",
        isPrimary: true,
        role: "aaii_neutral",
        licenseNote:
          "AAII neutral sentiment is fetched from EDGMAP's public embedded JSON mirror of AAII survey data; display policy remains review_required.",
        active: true,
      },
    ],
  },
  {
    slug: "aaii-bull-bear-spread",
    name: "AAII Bull-Bear Spread",
    category: "sentiment",
    frequency: "weekly",
    unit: "percent",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "Bull-Bear Spread 用 AAII 多头比例减去空头比例，观察散户情绪净乐观程度。",
    interpretation: {
      overview:
        "Spread 越高，散户净乐观越强；越低，净悲观越强。",
      readHint:
        "我不会单看 Spread 下结论，而是和 NAAIM Exposure 联读：一个看嘴上怎么看，一个看钱怎么放。",
      caveat:
        "这是周度调查派生指标，高低应看自身分位，避免用固定阈值机械判断。",
    },
    sources: [
      {
        provider: "edgmap",
        externalId: "AAII_BULLISH",
        sourceUrl: "https://edgmap.com/macrochart/aaii",
        fetchMode: "embedded_json",
        isPrimary: true,
        role: "aaii_bullish",
        licenseNote:
          "Primary leg for AAII Bull-Bear Spread, fetched from EDGMAP's public embedded JSON mirror of AAII survey data.",
        active: true,
      },
      {
        provider: "edgmap",
        externalId: "AAII_BEARISH",
        sourceUrl: "https://edgmap.com/macrochart/aaii",
        fetchMode: "embedded_json",
        isPrimary: false,
        role: "aaii_bearish",
        licenseNote:
          "Secondary leg for AAII Bull-Bear Spread, fetched from EDGMAP's public embedded JSON mirror of AAII survey data.",
        active: true,
      },
    ],
  },
  {
    slug: "naaim-exposure",
    name: "NAAIM Exposure",
    category: "sentiment",
    frequency: "weekly",
    unit: "percent",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "NAAIM Exposure 观察主动风险管理人近两周对客户账户的美股敞口变化。",
    interpretation: {
      overview:
        "NAAIM 更接近真实仓位温度计，能补足 AAII 这种主观调查的盲点。",
      readHint:
        "如果 AAII 很谨慎但 NAAIM 仍高，说明口头担忧和实际仓位可能并不一致。",
      caveat:
        "这是周度敞口调查，样本和极端仓位会影响读数，适合看趋势和 4 周均线。",
    },
    sources: [
      {
        provider: "naaim",
        externalId: "NAAIM_EXPOSURE",
        sourceUrl:
          "https://www.naaim.org/programs/naaim-exposure-index/",
        fetchMode: "public_table",
        isPrimary: true,
        role: "naaim_exposure",
        licenseNote:
          "NAAIM's delayed public table is used after current data moved behind subscription access; public display policy remains review_required.",
        active: true,
      },
    ],
  },
  {
    slug: "naaim-exposure-ma4",
    name: "NAAIM Exposure 4W MA",
    category: "sentiment",
    frequency: "weekly",
    unit: "percent",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "NAAIM Exposure 的 4 周均线，用来过滤单周仓位噪音。",
    interpretation: {
      overview:
        "4 周均线能帮助判断主动管理人仓位是短暂波动，还是正在持续降风险或加风险。",
      readHint:
        "我会先看当前 NAAIM，再看 4 周均线是否确认方向。",
      caveat:
        "均线更稳但也更慢，不能用它捕捉突发拐点。",
    },
    sources: [
      {
        provider: "naaim",
        externalId: "NAAIM_EXPOSURE",
        sourceUrl: "https://www.naaim.org/programs/naaim-exposure-index/",
        fetchMode: "public_table",
        isPrimary: true,
        role: "naaim_exposure",
        licenseNote:
          "Primary leg for the NAAIM 4-week moving average, fetched from NAAIM's delayed public table.",
        active: true,
      },
    ],
  },
  {
    slug: "put-call-ratio",
    name: "Cboe Put/Call Ratio",
    category: "fear_greed",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "Cboe Put/Call Ratio 用来观察期权市场保护需求，是自研 Fear & Greed 的情绪因子之一。",
    interpretation: {
      overview:
        "Put/Call 偏高通常代表保护需求更强；偏低则更像风险偏好充足。",
      readHint:
        "我会把它转成自身 1Y 分位后再放进 composite，避免把不同市场阶段的绝对值硬比较。",
      caveat:
        "Cboe 日度统计的历史自动化仍需复核，当前先作为可接入因子配置。",
    },
    sources: [
      {
        provider: "cboe",
        externalId: "CBOE_PUT_CALL_DAILY",
        sourceUrl:
          "https://www.cboe.com/markets/us/options/market-statistics/daily/",
        fetchMode: "next_rsc",
        isPrimary: true,
        role: "put_call",
        licenseNote:
          "Cboe daily market statistics are fetched from the public page data stream; public display policy remains review_required.",
        active: true,
      },
    ],
  },
  {
    slug: "hy-oas",
    name: "High Yield OAS",
    category: "fear_greed",
    frequency: "daily",
    unit: "percent",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "High Yield OAS 观察高收益信用利差，是 Fear & Greed 中“信用压力”的防守因子。",
    interpretation: {
      overview:
        "HY OAS 扩大说明信用风险补偿变贵，通常偏恐惧；收窄则偏风险偏好改善。",
      readHint:
        "在 Fear & Greed 中我会用反向分位：利差越宽，贪婪分越低。",
      caveat:
        "该序列公开可核验，但底层版权与再分发边界需要复核，因此页面会保留 review_required 策略。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "BAMLH0A0HYM2",
        sourceUrl: "https://fred.stlouisfed.org/series/BAMLH0A0HYM2",
        fetchMode: "api_json",
        isPrimary: true,
        role: "hy_oas",
        licenseNote:
          "ICE BofA High Yield OAS via FRED. Display policy remains review_required pending redistribution review.",
        active: true,
      },
    ],
  },
  {
    slug: "momentum-proxy",
    name: "S&P 500 Momentum Proxy",
    category: "fear_greed",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "用 S&P 500 日度序列计算动量状态，是自研 Fear & Greed 的趋势因子。",
    interpretation: {
      overview:
        "动量走强通常代表风险偏好改善；动量转弱则说明价格趋势开始拖累情绪。",
      readHint:
        "我会把动量因子标准化成分位后进入 composite，而不是直接拿指数点位做判断。",
      caveat:
        "价格指数受成分和分红口径影响，适合作为趋势代理，不适合解释全部风险偏好。",
    },
    sources: [
      {
        provider: "fred",
        externalId: "SP500",
        sourceUrl: "https://fred.stlouisfed.org/series/SP500",
        fetchMode: "api_json",
        isPrimary: true,
        role: "momentum",
        licenseNote:
          "S&P 500 index level via FRED, used only as a normalized momentum proxy.",
        active: true,
      },
    ],
  },
  {
    slug: "fear-greed-internal",
    name: "Fear & Greed Composite",
    category: "fear_greed",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "自研 Fear & Greed Composite，把波动、期权保护、信用利差、权益扩散和动量统一转成分位后合成。",
    interpretation: {
      overview:
        "分数越高越偏风险偏好改善，越低越偏防守或恐惧。",
      readHint:
        "我会先看 composite，再拆开看是哪一类因子拖累：VIX、Put/Call、信用、扩散还是动量。",
      caveat:
        "该分数是内部方法，不绑定外部成品指数；因子缺失时应先读分项，不强行给综合结论。",
    },
    sources: [
      {
        provider: "internal",
        externalId: "FEAR_GREED_INTERNAL",
        sourceUrl: "/data-sources",
        fetchMode: "manual",
        isPrimary: true,
        licenseNote:
          "Internal percentile composite. Component data sources keep their own display policies.",
        active: true,
      },
    ],
  },
  {
    slug: "vstoxx",
    name: "VSTOXX",
    category: "global_risk",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "VSTOXX 观察 EURO STOXX 50 期权市场对欧洲本地波动的定价。",
    interpretation: {
      overview:
        "VSTOXX 升温说明欧洲权益波动风险正在变贵，可用于判断风险是否从美国扩散到欧洲。",
      readHint:
        "不要拿点位直接和 VIX、VHSI 横比；先看它自己的 1Y 分位和 20D 变化。",
      caveat:
        "公开页面与延迟数据适合日更观察，盘中展示需要单独确认数据授权。",
    },
    sources: [
      {
        provider: "stoxx",
        externalId: "V2TX",
        sourceUrl: "https://stoxx.com/index/v2tx/",
        fetchMode: "ajax_json",
        isPrimary: true,
        role: "regional_vol",
        licenseNote:
          "STOXX VSTOXX index is fetched from the public page JSON endpoint; display policy remains review_required.",
        active: true,
      },
    ],
  },
  {
    slug: "india-vix",
    name: "India VIX",
    category: "global_risk",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "India VIX 观察 NIFTY 期权隐含波动，用于判断印度市场本地风险是否升温。",
    interpretation: {
      overview:
        "India VIX 升温说明印度本地权益波动预期上行，适合和其他区域本地 VIX 联读。",
      readHint:
        "先看 1Y 分位和 20D 变化，不直接和欧洲、日本、香港的点位横比。",
      caveat:
        "第一阶段按日更/延迟数据口径处理，盘中链路需要数据授权确认。",
    },
    sources: [
      {
        provider: "nse",
        externalId: "INDIA_VIX",
        sourceUrl:
          "https://www.nseindia.com/reports-indices-historical-vix",
        fetchMode: "json",
        isPrimary: true,
        role: "regional_vol",
        licenseNote:
          "NSE India VIX is fetched from the public historical VIX JSON endpoint; display policy remains review_required.",
        active: true,
      },
    ],
  },
  {
    slug: "nikkei-225-vi",
    name: "Nikkei 225 VI",
    category: "global_risk",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "Nikkei 225 VI 观察日经 225 期权市场对日本股市未来波动的预期。",
    interpretation: {
      overview:
        "Nikkei 225 VI 升温说明日本市场本地波动风险被重新定价。",
      readHint:
        "把它和 VSTOXX、India VIX、VHSI 一起转成分位，观察区域风险是否同步。",
      caveat:
        "公开页面适合收盘级别观察，自动化历史源需要进一步复核。",
    },
    sources: [
      {
        provider: "nikkei",
        externalId: "NIKKEI_225_VI",
        sourceUrl:
          "https://indexes.nikkei.co.jp/en/nkave/index/profile?idx=nk225vi",
        fetchMode: "csv",
        isPrimary: true,
        role: "regional_vol",
        licenseNote:
          "Nikkei 225 VI is fetched from the public daily CSV linked from the index page; display policy remains review_required.",
        active: true,
      },
    ],
  },
  {
    slug: "vhsi",
    name: "VHSI",
    category: "global_risk",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "VHSI 观察恒指期权隐含的香港市场未来 30 天波动预期。",
    interpretation: {
      overview:
        "VHSI 升温说明香港市场本地风险偏好正在收缩。",
      readHint:
        "我会把 VHSI 放进全球热力图里读，看它是不是亚洲风险升温的领头项。",
      caveat:
        "公开延迟数据适合日更观察，盘中和历史自动化需要单独确认来源许可。",
    },
    sources: [
      {
        provider: "hkex",
        externalId: "VHSI",
        sourceUrl: "https://www.hsi.com.hk/eng/indexes/all-indexes/volatilityindex",
        fetchMode: "json",
        isPrimary: true,
        role: "regional_vol",
        licenseNote:
          "Hang Seng VHSI is fetched from the public HSI chart JSON endpoint; display policy remains review_required.",
        active: true,
      },
    ],
  },
  {
    slug: "global-vol-composite",
    name: "Global Vol Composite",
    category: "global_risk",
    frequency: "daily",
    unit: "index",
    status: "active",
    sourcePolicy: "review_required",
    description:
      "Global Vol Composite 把欧洲、印度、日本、香港本地波动指数转成分位后合成，观察风险是否跨市场同步。",
    interpretation: {
      overview:
        "分数越高，说明多个区域的本地波动指数越接近自己的历史高位。",
      readHint:
        "我会先找 global vol leader，再看其他区域是否跟随，区分区域性紧张和全球共振。",
      caveat:
        "该分数不横比原始点位，只比较各自历史分位；底层来源缺失时不强行给结论。",
    },
    sources: [
      {
        provider: "internal",
        externalId: "GLOBAL_VOL_COMPOSITE",
        sourceUrl: "/data-sources",
        fetchMode: "manual",
        isPrimary: true,
        licenseNote:
          "Internal percentile composite across reviewed regional volatility indicators.",
        active: true,
      },
    ],
  },
] as const;

export const INDICATOR_CONFIG_BY_SLUG = new Map<
  IndicatorSlug,
  IndicatorConfig
>(MVP_INDICATOR_CONFIGS.map((indicator) => [indicator.slug, indicator]));

export function getIndicatorConfig(slug: string): IndicatorConfig | undefined {
  return INDICATOR_CONFIG_BY_SLUG.get(slug as IndicatorSlug);
}
