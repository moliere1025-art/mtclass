import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coursePath = path.join(root, "src/data/course.json");
const searchPath = path.join(root, "public/search-index.json");
const summaryPath = path.join(root, "src/data/extraction-summary.json");
const course = JSON.parse(await fs.readFile(coursePath, "utf8"));

const pad = (number) => String(number).padStart(2, "0");

function replaceChapterNumber(value, from, to) {
  if (typeof value !== "string") return value;
  return value
    .replace(new RegExp(`第\\s*${from}\\s*章`, "g"), `第 ${to} 章`)
    .replace(new RegExp(`表\\s*${from}-`, "g"), `表 ${to}-`)
    .replace(new RegExp(`图\\s*${from}-`, "g"), `图 ${to}-`)
    .replace(new RegExp(`(^|[^0-9])${from}\\.(?=\\d)`, "g"), `$1${to}.`);
}

function renumberChapter(chapter, from, to) {
  chapter.number = to;
  chapter.slug = pad(to);
  chapter.phase = 7;
  chapter.marker = `第 ${to} 章`;
  chapter.blocks = chapter.blocks.map((block) => {
    const next = { ...block };
    if (typeof next.id === "string" && next.id.startsWith(`c${from}-`)) {
      next.id = `c${to}-${next.id.slice(`c${from}-`.length)}`;
    }
    next.text = replaceChapterNumber(next.text, from, to);
    next.caption = replaceChapterNumber(next.caption, from, to);
    next.alt = replaceChapterNumber(next.alt, from, to);
    if (next.items) next.items = next.items.map((item) => replaceChapterNumber(item, from, to));
    if (next.rows) next.rows = next.rows.map((row) => row.map((cell) => replaceChapterNumber(cell, from, to)));
    return next;
  });
  return chapter;
}

function makeChapter(number, title, intro, sections) {
  const blocks = intro.map((text) => ({ type: "paragraph", text }));
  let blockCounter = blocks.length;
  const add = (block) => {
    blocks.push(block);
    blockCounter += 1;
  };

  sections.forEach((section, sectionIndex) => {
    add({
      type: "heading",
      level: 2,
      id: `c${number}-s${String(sectionIndex + 1).padStart(2, "0")}`,
      text: `${number}.${sectionIndex + 1} ${section.title}`
    });
    for (const item of section.blocks) {
      if (item.type === "paragraph") add({ type: "paragraph", text: item.text });
      if (item.type === "heading") add({ type: "heading", level: 3, text: item.text });
      if (item.type === "list") add({ type: "list", ordered: Boolean(item.ordered), items: item.items });
      if (item.type === "table") add({ type: "table", id: item.id, rows: item.rows });
      if (item.type === "caption") add({ type: "caption", text: item.text });
    }
  });

  return {
    number,
    slug: pad(number),
    phase: 6,
    marker: `第 ${number} 章`,
    title,
    blocks
  };
}

const p = (text) => ({ type: "paragraph", text });
const list = (items, ordered = false) => ({ type: "list", items, ordered });
const table = (id, rows) => ({ type: "table", id, rows });
const caption = (text) => ({ type: "caption", text });

const advancedChapters = [
  makeChapter(
    22,
    "高级结构诊断：标签、SOT 与非标准区间",
    [
      "成熟的 Wyckoff 分析不是给每一段价格贴上名称，而是在信息不完整时维护一组可以被后续事实升级、降级或撤销的结构假设。本章把标签、结构失败、Shortening of the Thrust 与非时间图表放进同一套诊断框架。",
      "本章面向已经熟悉 SC、Spring、SOS、UTAD 与 SOW 的交易员。重点不是复习定义，而是解决实盘中最棘手的情况：边界倾斜、Phase A 不标准、结构中途变形、量能受时段影响，以及多个周期给出竞争解释。",
      "学习结果是形成一份可交接的结构记录：另一位交易员应能看见你采用的边界、比较基准、主情景、替代情景、下一裁决点和失效条件，而不必接受你的主观故事。"
    ],
    [
      {
        title: "标签是版本化假设，不是市场事实",
        blocks: [
          p("事件名称只负责压缩信息。Potential Spring 表示价格在支撑外发生了拒绝候选；只有后续 Test、SOS、区间外接受或反向失效出现后，事件状态才能继续迁移。把最终标签提前写回历史，会让训练、回测和交易日志同时产生前视偏差。"),
          p("课堂表达应坚持“观察—解释—裁决”三层：先说价格做了什么，再说它与哪种结构功能相容，最后说明什么新事实会使判断改变。讲师可以使用经典 Schematic 帮助记忆，但不能把形状相似当作因果证明。"),
          list([
            "观察：边界、推进距离、成交活动、停留时间、收盘保存与回测路径。",
            "解释：Accumulation、Distribution、Continuation 或仍不可分类。",
            "裁决：等待、试探、确认、降级、反向或放弃。"
          ])
        ]
      },
      {
        title: "价格优先，成交量必须先做同口径比较",
        blocks: [
          p("价格是已经成交后的结果，但它不是“包含一切”的无条件真相；跳空、交易中断、价差扩张和跨场所碎片化都会改变可见路径。专业做法不是在价格与成交量之间二选一，而是先确认数据制度，再判断哪一项证据在当前市场更可靠。"),
          p("日内成交量具有强烈时段季节性。开盘、数据发布、午间、收盘和合约换月不能放在同一基准上比较。低量测试只有在相近时段、相近波动和相同交易时段定义下才有解释力；否则所谓 No Supply 或 No Demand 可能只是参与者尚未到场。"),
          p("对 OTC 外汇、暗池占比较高的股票和跨交易所数字资产，屏幕成交量只覆盖部分市场。此时价格保存、跨场所一致性和后续结果的权重应高于单一数据源的绝对量。")
        ]
      },
      {
        title: "Tick、Volume 与 Range 图表改变的是采样方式",
        blocks: [
          p("Tick 图按成交笔数收柱，Volume 图按成交数量收柱，Range 图按价格移动幅度收柱。它们可以弱化静默时段并提高活跃阶段的分辨率，但并没有减少市场本身的噪声；它们只是把时间轴上的不均匀活动重新采样。"),
          p("同一市场在不同数据商、成交合并规则和历史回补方式下，Tick 与 Volume 柱可能不同。Range 图还受到最小变动单位、跳价和平台收柱算法影响。使用这些图表做研究时，应保存参数、数据源和重建规则，并避免把在某一种采样下出现的形状直接推广到另一种采样。"),
          table("table-20", [
            ["图表", "触发新柱", "保留的信息", "主要风险"],
            ["Time", "固定时间", "时段与事件节奏", "活跃度差异被压进同样宽度"],
            ["Tick", "成交笔数", "交易频率", "忽略每笔成交规模且依赖数据商合并规则"],
            ["Volume", "累计成交量", "活动数量", "时间季节性被隐藏，柱持续时间不固定"],
            ["Range", "固定价格幅度", "波动推进", "成交与时间信息被压缩，跳价处理依平台而异"]
          ]),
          caption("表 22-1　非时间图表是采样选择，不是更接近“真实市场”的天然优势。")
        ]
      },
      {
        title: "结构失败与失败结构必须分开",
        blocks: [
          p("结构失败描述的是局部运动没有完成原有节奏，例如上行通道中的回撤未触及下轨便提前转强；失败结构描述的是原本占优的 Accumulation 或 Distribution 情景在关键裁决点被反向接受推翻。前者是证据，后者是结构级重分类。"),
          p("局部结构失败不能单独触发交易。它需要与位置、对手方推进效率和后续主动性共同出现。未触及下边界可能来自流动性真空，也可能只是暂时缺少卖单；只有价格随后突破、保存并在回测中维持，强势解释才得到提升。"),
          list([
            "先固定原结构的有效边界和预期路径。",
            "记录未完成路径的幅度、时间和成交活动差异。",
            "等待反向推进取得实际结果，而不是仅凭“没走到”判断。",
            "若价格重新恢复旧节奏，撤销结构失败假设。"
          ], true)
        ]
      },
      {
        title: "Shortening of the Thrust 要测量，不要凭视觉命名",
        blocks: [
          p("SOT 指同方向连续推进的净距离缩短，常与趋势效率下降相容。它不是反转信号，也不要求每一波都严格递减。专业记录至少同时观察推进距离、推进耗时、成交活动、回撤深度和新高或新低后的保存程度。"),
          p("固定比较锚点十分重要。若分析师不断调整波段起点，几乎任何图都能被画成 SOT。先用统一转折规则定义波段，再比较最近三次以上推进；若价格距离缩短但耗时也显著缩短，效率未必下降。若推进缩短、努力上升且结果无法保存，衰竭或吸收解释才更有分量。"),
          p("SOT 的交易价值来自后续状态改变：反向 Change of Character、边界突破和回测保存。没有这些结果时，它只负责提醒团队降低趋势延续的先验权重。")
        ]
      },
      {
        title: "倾斜结构与线条只服务于行为比较",
        blocks: [
          p("上倾或下倾区间并不自动等于强势或弱势。倾斜可能来自持续方向性订单，也可能来自波动率扩张、基差变化或样本窗口选择。线条应覆盖大部分关键转折并保持稳定，不能为了包含每个影线不断移动。"),
          p("有效的通道分析至少需要说明锚点、是否使用收盘或极值、允许的越界容差和重新绘制条件。一次触线不提供意义；多次接近边界时推进效率如何变化，才是结构诊断的核心。"),
          p("当价格形态过于不规则，最专业的处理往往是退回到水平参考：最后一次高成交平衡区、可验证的摆动高低点、前一日或前一周价值区，以及已经被市场测试过的突破水平。")
        ]
      },
      {
        title: "从零分析图表：先高框架，再定义交易区",
        blocks: [
          p("自上而下分析先回答市场处于平衡还是失衡、最近一次被接受的价值区在哪里、哪一侧推进更有效，再下降到决策周期寻找结构。自下而上分析可以用于发现微观转折，但必须回到更高周期确认该转折位于什么位置。"),
          p("交易区不是画得越多越专业。每个区域都应说明来源、时点和用途：结构边界用于裁决，成交分布节点用于定位，执行区域用于触发，风险边界用于撤销交易。若一个水平没有对应的决策，它不应占据图表。"),
          table("table-21", [
            ["层级", "核心问题", "输出"],
            ["背景", "平衡、趋势还是状态转换", "市场状态与主导结构"],
            ["位置", "价格接近哪一处可验证边界", "交易区与不可交易中部"],
            ["情景", "接受或拒绝分别意味着什么", "主情景、替代情景、下一裁决点"],
            ["执行", "什么行为允许下单", "触发、订单、失效与仓位"]
          ]),
          caption("表 22-2　层级越低，结论越具体；低层证据不能擅自改写高层背景。")
        ]
      },
      {
        title: "不清楚时，由“控制器”而不是偏好决定",
        blocks: [
          p("当 Accumulation 与 Distribution 证据接近时，不必强迫选边。控制器是能让两种解释产生不同可观察结果的价格区或事件，例如区间外接受、关键 HVN 的穿越、最后一轮供应测试，或高框架结构边界。"),
          p("在控制器被触发前，团队可以降低仓位、只做区间内策略或保持空仓。被触发后仍需等待结果保存；单次穿越只改变问题，不能自动给出答案。"),
          p("课堂训练应使用截断图。学生在每个时点写下当前最小充分解释，再随着新数据更新。评分依据是更新是否一致，而不是最后是否猜中方向。")
        ]
      },
      {
        title: "案例：上倾区间中的 SOT 与反向接受",
        blocks: [
          p("某指数连续三次上攻分别推进 86、49 和 21 点，耗时却从 70 分钟增加到 155 分钟；第三次上攻成交量高于第二次，但收盘重新回到前高下方。此时可以记录“上行效率下降与潜在供应吸收”，但不能直接标注 Distribution。"),
          p("随后价格回撤未到通道下轨便反弹，只取得 12 点结果，之后以宽幅下跌穿越最近平衡区并在其下停留。局部“未触及下轨”的强势解释被后续结果否定，结构级权重转向 Distribution 或 Redistribution。"),
          p("可执行计划不是在第三个高点预测顶部，而是把最近平衡区下沿设为控制器：下方接受后等待回测失败；若价格重新站回平衡区并恢复上行效率，则撤销空头情景。")
        ]
      },
      {
        title: "本章小结",
        blocks: [
          p("高级结构分析的核心是固定比较规则并允许重分类。标签、线条、SOT、非时间图表和结构失败都只是压缩证据的工具；真正能够改变仓位的是价格在关键位置取得并保存了什么结果。")
        ]
      }
    ]
  ),
  makeChapter(
    23,
    "拍卖、订单与流动性：从价值发现到价格冲击",
    [
      "Auction Market Theory 为 Wyckoff 提供了一种现代语言：市场在交易被充分促成的平衡状态与价格快速寻找新对手盘的失衡状态之间转换。但“价值”不是可直接观察的真理，而是由指定数据、时间窗口和参与者集合估计出的暂时接受区。",
      "职业交易员需要把图表叙述接回订单匹配机制。本章从 Bid、Ask、Spread、队列与订单类型出发，区分成交、流动性、主动性和价格冲击，避免把“有买方”或“有卖方”当作价格移动的解释。",
      "目标不是把微观结构变成万能信号，而是明确哪些机制能够解释价格结果、哪些数据只能提供局部视角，以及不同市场应怎样调整证据权重。"
    ],
    [
      {
        title: "平衡与失衡是市场状态，不是价值判断",
        blocks: [
          p("平衡状态表现为双向成交能够持续发生、价格在一段区域内反复旋转；失衡状态表现为一侧订单以较低阻力取得连续价格结果。平衡并不意味着风险低，失衡也不意味着市场无效率。两者只是描述当前拍卖如何组织。"),
          p("所谓“公平价值”应在课堂上改称“当前接受区”。机构、做市商、套保者和投机者拥有不同期限与目标，不存在所有人共同认同的单一价值。价格、停留时间与成交量可以帮助估计接受，但不能证明内在价值。"),
          p("Wyckoff 的 Phase A—E 可以与拍卖状态对应：趋势停止、平衡形成、边界测试、区间外发现与新区域接受。对应关系用于解释功能，不要求每次发展都遵循固定顺序。")
        ]
      },
      {
        title: "价格、时间与成交量承担不同职责",
        blocks: [
          p("价格负责发现：它测试更高或更低水平是否存在对手盘。时间负责显示该区域能否持续交易。成交量显示指定数据覆盖下发生了多少交换。三者同时出现时，可以提高“新区域正在被接受”的置信度，但任何一项都不能单独完成证明。"),
          p("快速穿越可能代表流动性稀薄，也可能代表强主动订单；长时间停留可能代表接受，也可能是等待事件。课堂讲解应把“相容于”与“证明”分开，并要求学生写出至少一个竞争解释。")
        ]
      },
      {
        title: "Bid、Ask 与成交分类",
        blocks: [
          p("Best Bid 是当前最高可见买价，Best Ask 是当前最低可见卖价，两者之差为报价价差。市场买单通常与 Ask 队列成交，市场卖单通常与 Bid 队列成交；每笔成交仍同时包含买方与卖方，所谓买量和卖量只是对主动方的分类。"),
          p("报价更新、隐藏订单、跨场所路由和逐笔数据合并会使分类出现误差。Footprint 或 Delta 应注明数据源、场所覆盖和分类算法。若平台只提供经纪商 Tick Volume，就不能把它等同于集中交易所的真实合约数量。"),
          p("价格移动不仅取决于主动单数量，还取决于对手方队列的深度、补单速度和撤单行为。同样规模的主动买入，在薄 Ask 与厚 Ask 上产生的冲击完全不同。")
        ]
      },
      {
        title: "流动性不是成交量的同义词",
        blocks: [
          p("成交量描述已经完成的交易；流动性描述在可接受成本下完成未来交易的能力。高成交量市场可能在事件时刻出现极薄深度，低成交量市场也可能在小规模订单下保持稳定。专业分析至少区分价差、深度、韧性与价格冲击。"),
          table("table-22", [
            ["维度", "问题", "可观察代理"],
            ["价差", "立即成交要跨越多少价格", "Quoted / Effective Spread"],
            ["深度", "近端队列能承受多少数量", "多档可见数量与队列斜率"],
            ["韧性", "冲击后流动性多快恢复", "补单速度与价差恢复时间"],
            ["价格冲击", "订单规模改变价格多少", "短期冲击、滑点与实施差额"],
            ["成交量", "已经交换多少", "合约、股数或名义金额"]
          ]),
          caption("表 23-1　成交量是流动性研究的一项输入，不是流动性的完整定义。")
        ]
      },
      {
        title: "订单类型决定暴露在哪一种风险",
        blocks: [
          p("Market Order 优先成交但承担价格不确定性；Limit Order 控制价格但承担不成交和逆向选择；Stop Order 在触发后转换为市场或限价指令，承担跳空与触发质量风险。不存在适用于所有 Wyckoff 触发的唯一订单类型。"),
          p("Iceberg、Reserve、Pegged、Post-only、IOC/FOK 和条件单会改变可见盘口与执行结果。教学重点应放在订单目标：需要确认动量、需要控制滑点，还是需要在队列中提供流动性。订单选择必须与标的深度、波动、账户规模和时效共同决定。"),
          list([
            "价格风险：成交价偏离决策价。",
            "不成交风险：限价订单错过有效移动。",
            "逆向选择：成交后市场立即向不利方向移动。",
            "信息泄露：大单或重复子单暴露交易意图。",
            "队列风险：排队位置和撤单使预期成交率失真。"
          ])
        ]
      },
      {
        title: "Initiative、Absorption 与 Exhaustion 是机制假设",
        blocks: [
          p("Initiative 表示主动订单取得了方向性结果；Absorption 表示大量主动订单被对手方承接而价格推进受限；Exhaustion 表示原方向主动性衰减。三者常共同参与转折，但屏幕数据通常无法直接识别参与者身份与持仓目的。"),
          p("吸收需要“努力存在、结果受限、随后反向结果出现”三层证据。只有大量成交而没有反向推进，可能只是双方都愿意交易；只有低成交的停止，可能是衰竭而非吸收。讲师应避免把高量自动解释为机构承接。"),
          p("极端价位的撤单也能让价格快速移动，因此主动单不是价格变化的唯一来源。更准确的说法是：价格变化来自主动订单与可用流动性共同作用，以及队列在成交前后的更新。")
        ]
      },
      {
        title: "现代参与者不是一个统一的 Composite Operator",
        blocks: [
          p("做市、套利、指数复制、期权对冲、趋势跟随、风险平价、执行算法、HFT、主观宏观和零售订单在同一市场叠加。它们可能在某一时段产生同方向结果，却并不共享意图。Composite Operator 适合作为大规模头寸受流动性约束的教学模型，不宜被描述成真实存在的单一操盘者。"),
          p("算法交易改变了反应速度、订单拆分和场所选择，高频交易改变了队列竞争和短期流动性供给，但都没有取消供需约束。它们也可能在波动上升时同时撤出流动性，使历史平均滑点失效。"),
          p("暗池与 OTC 交易降低了屏幕数据的完整性。价格仍可在公开市场完成发现，但公开成交量未必覆盖全部风险转移；分析师应说明数据缺口，而不是用不可见交易为任何图表故事背书。")
        ]
      },
      {
        title: "市场反转的可检验三步",
        blocks: [
          p("“衰竭—吸收—反向主动性”是一套有用的转折框架，但三步可能重叠、缺失或只在更低周期可见。实盘使用时先确定位置，再寻找原方向效率下降、对手方承接与反向价格结果。"),
          list([
            "原方向是否仍能以相近努力取得相近结果？",
            "关键边界是否出现大量成交而无法继续推进？",
            "反方向是否完成突破、保存和回测？",
            "若没有反向结果，是否只能记录为停止而非反转？"
          ], true)
        ]
      },
      {
        title: "跨市场数据映射",
        blocks: [
          table("table-23", [
            ["市场", "主要成交数据", "关键缺口", "教学权重"],
            ["集中期货", "逐笔成交、盘口、持仓量", "合约换月、组合单与冰山", "可细读订单流，但先处理交易时段与展期"],
            ["交易所股票", "多场所成交与报价", "暗池、碎片化、开收盘竞价", "使用合并行情并标注场所覆盖"],
            ["OTC 外汇", "经纪商报价与 Tick", "无统一成交量与盘口", "价格结构高于单源成交量"],
            ["数字资产", "交易所逐笔与盘口", "场所分散、刷量与跨币种", "优先高质量场所并做跨场所核对"]
          ]),
          caption("表 23-2　同一术语在不同市场中必须映射到不同数据制度。")
        ]
      },
      {
        title: "本章小结",
        blocks: [
          p("拍卖理论帮助交易员描述平衡与失衡，微观结构帮助解释订单怎样形成价格结果。专业表达要避免把成交量等同于流动性、把主动单等同于方向真相，或把屏幕数据当作完整市场。所有机制解释最终都要接受后续价格与执行结果的检验。")
        ]
      }
    ]
  ),
  makeChapter(
    24,
    "Volume Profile：分布、价值区与基准",
    [
      "Volume Profile 把指定样本内的成交量按价格分桶，回答“成交主要发生在哪里”。它补充了垂直成交量回答的“成交何时发生”，但不会自动告诉交易员谁在累积、谁在派发，也不会给出不依赖参数的客观价值。",
      "本章保留 PDF 对 VAH、VAL、VPOC、HVN、LVN、VWAP、Session 与 Composite Profile 的核心框架，同时纠正常见统计误读。每个水平都必须附带聚合窗口、交易时段、价格分桶、合约处理和数据覆盖。",
      "学生完成本章后，应能在另一台平台上复建同一 Profile，解释差异来自何处，并把节点转换成待验证的交易区域，而不是机械支撑阻力。"
    ],
    [
      {
        title: "Volume Profile 是描述性分布，不是方向指标",
        blocks: [
          p("Profile 的横向长度表示指定价格桶内的成交量。它对样本窗口极度敏感：从哪一根开始、是否包含突破、使用 RTH 还是 ETH、价格桶大小以及合约是否拼接，都会改变分布。"),
          p("“客观”只意味着输入和算法固定后可以重复计算，不意味着参数选择没有判断。专业报告必须把参数作为结果的一部分保存。未记录构建合同的 VPOC、VAH 或 VAL 不能进入回测、执行或团队交接。")
        ]
      },
      {
        title: "先定义 Profile 构建合同",
        blocks: [
          list([
            "标的与场所：合约代码、交易所、数据商和是否合并场所。",
            "时间窗口：Session、固定结构、单一推动波或 Composite 日期范围。",
            "交易时段：RTH、ETH、24/7，以及节假日和半日市处理。",
            "价格分桶：每 Tick、多个 Tick、自动 Row Size 或价格百分比。",
            "数量口径：合约、股数、名义金额或 Tick Volume。",
            "连续合约：换月、回调、拼接和成交量归属规则。"
          ]),
          p("同一个区间若把突破腿包含在 Profile 内，POC 可能向突破方向迁移；若目标是寻找区间内部的回测水平，通常应保存一份不含突破腿的结构 Profile，并另建一份包含新成交的 Developing Profile。两者回答不同问题。")
        ]
      },
      {
        title: "VPOC、VAH 与 VAL 的算法边界",
        blocks: [
          p("VPOC 是样本内成交量最大的价格桶。若多个价格桶并列，平台可能选择最靠近中点、最高价、最低价或首次出现者。VAH 与 VAL 通常从 POC 附近向外累加成交量，直到覆盖预设比例；扩展顺序与并列处理也会导致平台差异。"),
          p("Value Area 常用 70%，有些材料借用正态分布第一标准差使用 68.2%。这只是构建约定，不代表成交量服从正态分布，也不代表价格有 68.2% 或 70% 的概率留在其中。课程应把比例写入 Profile 合同，而不是当作统计定律。"),
          p("VAH 与 VAL 是分布边界估计，不是天然支撑阻力。价格未来如何反应取决于新订单、当前波动、事件和更近的价值建立。节点只有在价格再次到达时才开始提供交易信息。")
        ]
      },
      {
        title: "VWAP 是成交量加权均值，不是成交量中位数",
        blocks: [
          p("VWAP 等于价格与成交量乘积之和除以总成交量。它使加权价格偏差的代数和为零，但不保证 VWAP 上下各有一半成交量；“上下成交量相等”描述的是加权中位数，不是均值。"),
          p("机构常用 VWAP 评估执行质量，但基准本身会被交易时段、起点和自身订单影响。Session VWAP、Weekly VWAP 与 Anchored VWAP 回答不同问题。价格位于 VWAP 上方只说明相对该窗口的均价位置，不自动证明买方控制。"),
          p("标准差带同样依赖加权方法和窗口。趋势状态下价格可以长时间停留在带外；把偏离带机械解释为超买超卖，会与拍卖状态冲突。")
        ]
      },
      {
        title: "HVN 与 LVN 描述接受密度",
        blocks: [
          p("HVN 是局部高成交区，常与持续双向交易相容；LVN 是局部低成交区，常与快速穿越或拒绝相容。它们是区域而不是单一价格，具体识别还依赖平滑与分桶。"),
          p("未来访问 HVN 可能减速并重新平衡，也可能在新信息下快速穿越；访问 LVN 可能 V 形拒绝，也可能因深度不足加速通过。课程不使用“HVN 必然吸引、LVN 必然反弹”的语言，而是把两种反应都写入情景。"),
          p("节点的新鲜度需要研究。近期结构通常比多年以前的节点更能代表当前参与者成本，但“市场记忆衰减”不是固定公式，应按标的、周期和制度变化验证。")
        ]
      },
      {
        title: "Finished 与 Unfinished Auction 的适用边界",
        blocks: [
          p("Profile 极端成交逐步缩小，可描述为尾部或完成式拍卖；极端仍有明显成交截断，可描述为 Poor High / Poor Low 或未完成候选。它们提示未来可能重访，但不是必须回补的市场债务。"),
          p("Market Profile 用 TPO 计数定义 Single Print 或 Poor Extreme，Volume Profile 使用成交分布，两者不能直接互换。不同 Tick Size、涨跌停和收盘截断也会制造“未完成”外观。只有结合下一次访问的接受或拒绝，极端结构才获得交易意义。")
        ]
      },
      {
        title: "Fixed、Session 与 Composite Profile",
        blocks: [
          table("table-24", [
            ["类型", "主要问题", "推荐用途", "常见误用"],
            ["Fixed Range", "某段结构内部在哪里成交", "区间、推动腿、事件窗口", "事后挑选最漂亮的起止点"],
            ["Session", "当日价值怎样发展", "日内偏向、前日参考、开盘关系", "混用 RTH 与 ETH 或忽略半日市"],
            ["Composite", "多个平衡期的长期分布", "宏观节点、目标与结构背景", "把制度变化前后的样本强行合并"],
            ["Developing", "分布正在怎样迁移", "盘中接受与失败监控", "把未完成分布当作固定水平"]
          ]),
          caption("表 24-1　Profile 类型由决策问题选择，而不是图表可用空间选择。")
        ]
      },
      {
        title: "Volume Profile 与 Market Profile",
        blocks: [
          p("Volume Profile 按成交量聚合，Market Profile 按 Time Price Opportunity 聚合。前者强调交换数量，后者强调价格出现和停留。大量成交可以在很短时间发生，因此 Volume POC 与 Time POC 不必一致。"),
          p("TPO 接受也不是绝对客观：字母周期、Session 定义、Initial Balance 长度与合并规则都需要设定。选择哪一种工具取决于交易问题。若研究执行与成交密度，Volume Profile 更直接；若研究时段发展和价格停留，Market Profile 提供不同信息。")
        ]
      },
      {
        title: "D、P 与 b 形只描述已经形成的分布",
        blocks: [
          p("D 形通常对应较对称的平衡；P 形和 b 形常见于单边移动后形成新的高成交区。但相同轮廓可以由完全不同的时间顺序生成：先趋势后平衡，与先平衡后突破，在静态 Profile 上可能看起来相似。"),
          p("轮廓分类是状态描述，不是下一交易日方向预测。真正可交易的信息来自价值区如何迁移、价格是否在分布外被接受、前一平衡区是否继续提供支持，以及 Wyckoff 结构中的供需测试。")
        ]
      },
      {
        title: "Profile 复建与审计清单",
        blocks: [
          list([
            "截图之外保存原始参数与数据版本。",
            "在同一 Session 与 Row Size 下跨平台复建并记录差异。",
            "分别保留结构 Profile 和 Developing Profile。",
            "把 POC、VAH、VAL 记录为区域并包含计算时间。",
            "每次水平变化都更新场景，不回写历史位置。",
            "回测同时计入滑点、开盘缺口和水平发布时点。"
          ], true),
          p("课堂练习应让学生用同一段行情分别构建 RTH、ETH 和 Composite Profile，再解释为什么水平不同、哪一套与当前决策匹配。能够说明差异，比找到“最有效”的单一 POC 更重要。")
        ]
      },
      {
        title: "本章小结",
        blocks: [
          p("Volume Profile 把成交量从时间轴重新组织到价格轴。它的专业价值来自可复建的参数、对分布边界的谨慎解释，以及与结构位置和后续反应结合；不是来自把 POC、Value Area 或节点神化为确定性水平。")
        ]
      }
    ]
  ),
  makeChapter(
    25,
    "价值区策略：接受、迁移与仓位管理",
    [
      "Profile 水平只有进入情景后才具有操作意义。本章把 Range、Reversion、Continuation 与 Failed Reversion 四类 Value Area 原则改写成条件式决策，并加入价值迁移、VPOC 变化、VWAP、HVN/LVN 与仓位管理。",
      "所有策略先判断市场处于平衡还是失衡，再确定当前价格相对哪一个 Profile。前日 Session、当前 Session、结构 Fixed Range 与长期 Composite 可以同时存在，但每一层只能回答其职责范围内的问题。",
      "本章不提供机械胜率。任何“80% Rule”、Naked POC 回访概率或 VPOC 磁吸效应，都必须在具体市场、时段和执行成本下重新研究。"
    ],
    [
      {
        title: "先选参考 Profile，再谈价格位置",
        blocks: [
          p("价格在 VAH 上方没有独立意义，必须说明是哪一个 Value Area。它可能高于前日价值、仍处于周度价值中部，也可能正位于 Composite HVN 内。不同层级冲突时，高层决定可承担的方向风险，低层决定执行时机。"),
          p("日内交易通常从前一完整 Session 和当前 Developing Profile 开始；波段交易可使用周度、月度或结构 Profile。参考窗口一旦进入计划，在交易结束前不得为了配合观点随意重画。")
        ]
      },
      {
        title: "四类 Value Area 情景",
        blocks: [
          table("table-25", [
            ["情景", "必要状态", "确认", "否定 / 转换"],
            ["Range", "价格在价值区内且无持续失衡", "两端拒绝并回到内部", "一端外部接受后转 Continuation"],
            ["Reversion", "价格从外部重新进入旧价值区", "回测边界保持，向 POC 或对侧推进", "在边界或 POC 再次被强拒绝"],
            ["Continuation", "价格离开价值区并在外部建立交易", "回测边界不再回到旧区中部", "快速重返价值区并保存"],
            ["Failed Reversion", "重返价值区后在 POC/HVN 受阻", "重新穿出原边界并延续", "穿越 POC 并继续向对侧接受"]
          ]),
          caption("表 25-1　四类原则是状态转换，不是看到水平即可下单的 Setup。"),
          p("所谓 Market Profile 80% Rule 的不同版本，对开盘位置、重返时间和目标定义并不一致。课程只把它作为“重新进入旧价值后，内部旋转概率上升”的研究假设，禁止脱离样本验证引用固定胜率。")
        ]
      },
      {
        title: "偏向来自价值关系与价格保存",
        blocks: [
          p("价格、VWAP 和 VPOC 的相对位置可以描述当前分布，但不能单独定义控制权。更稳健的偏向来自三层联合：价格位于哪一价值区，价值区本身向哪里迁移，以及突破后的价格是否被保留。"),
          p("价格在 VWAP 与 VPOC 上方、且二者上移，说明买方情景具备一致性；若价格上方但价值不跟随，可能只是价格发现尚未获得接受。反过来，VPOC 上移后价格迅速跌回旧价值，说明迁移结果被拒绝。")
        ]
      },
      {
        title: "用价值区迁移评估趋势健康",
        blocks: [
          p("健康上行通常伴随 Session Value Area 和 POC 逐步抬高，且回撤不能在旧价值区深处长期停留；健康下行相反。重叠 Value Area 增多、迁移速度下降或价值开始逆向移动，提示趋势进入平衡或状态转换。"),
          p("价值迁移落后于价格并不必然看空。趋势行情中价格负责发现，新成交需要时间建立；关键是推进之后是否出现新的双向交易，还是价格只能靠低流动性短暂悬空。"),
          p("课堂应使用“价值序列”而不是单日 Profile：至少比较三个连续窗口的 VAH、VAL、POC、宽度、重叠率和收盘位置。")
        ]
      },
      {
        title: "VPOC Migration 的延续与反转协议",
        blocks: [
          p("Developing VPOC 的迁移只证明新的价格桶暂时取得最高成交量。延续情景要求迁移后价格迅速取得同向结果、价值区跟随，并在回测时保存；反转情景要求迁移后无法继续、耗时增加，随后出现反向 Change of Character。"),
          list([
            "延续：迁移—短暂停留—同向推进—回测保持。",
            "反转：迁移—长时间无进展—反向突破—旧 POC 或 Value Edge 回测失败。",
            "未决：迁移后价格围绕 POC 旋转，不建立方向仓位。"
          ]),
          p("不要用固定分钟数定义“快”或“慢”。相对于当前标的、时段和前几次推进的基准做比较，才能跨波动环境使用。")
        ]
      },
      {
        title: "Confluence 不是线条数量竞赛",
        blocks: [
          p("结构边界、VAH/VAL、VWAP、VPOC 和旧摆动点重合，可以减少定义交易区的歧义；但若这些水平来自高度相关的同一数据窗口，它们不是独立证据。三条相近的成交量基准不能自动把低质量情景变成高质量情景。"),
          p("优先级通常为：高框架结构与失效、当前拍卖状态、近期价值区、执行层订单流。若水平冲突，先问哪一个水平一旦被接受会真正改变结构，而不是选择图上看起来最密集的区域。")
        ]
      },
      {
        title: "Entry、Stop 与 Target 的 Profile 校准",
        blocks: [
          p("Entry 区域可以来自 Value Edge、LVN、VWAP 或结构 POC，但必须等待与方向一致的触发。Stop 应放在交易假设被否定的位置，并加入跳空、点差和市场冲击缓冲；不能仅因为某个 LVN 曾发生拒绝就把止损藏在其后。"),
          p("Target 可以使用前方 HVN、未测试 POC、旧价值区或结构边界分层管理。HVN 是可能减速和重新平衡的区域，不是保证到达的磁铁。到达第一个管理点后，应根据价格是否继续被接受来决定减仓、持有或退出。"),
          p("Profile 可能在盘中变化。订单生成时应保存当时的水平，交易管理使用新的 Developing 信息，但不能事后用最终 POC 证明原入场合理。")
        ]
      },
      {
        title: "Naked POC 与 DVPOC 必须经过本地验证",
        blocks: [
          p("Naked VPOC 指前一窗口最终 POC 尚未被价格再次交易；DVPOC 指发展过程中曾经成为 POC 的价格。二者都代表历史高成交，但“未来几日高概率回访”不是跨市场定律。"),
          p("验证时应明确回访期限、触及容差、隔夜缺口、同一日多水平、交易时段和交易成本，并与随机水平或其他高成交区比较。若只统计最终被触及的样本而忽略长期未触及水平，会产生生存偏差。")
        ]
      },
      {
        title: "案例：前日价值区上方开盘",
        blocks: [
          p("ES 在前日 VAH 上方开盘，同时位于周度 Value Area 中部。开盘后 25 分钟无法建立新的 Session Value，价格重新进入前日 VAH。此时不能因为“高于前日价值”继续持有单向多头偏见。"),
          p("主情景转为 Reversion：等待 VAH 内侧回测，第一管理点为前日 POC；替代情景是 POC 附近出现拒绝并重新站上 VAH，转为 Failed Reversion。若价格在前日 POC 下方持续建立成交，目标才扩展到 VAL。"),
          p("这个案例的教学重点不是选择多空，而是把每个状态转换对应到新的订单、失效与仓位上。")
        ]
      },
      {
        title: "本章小结",
        blocks: [
          p("Value Area 策略的优势来自清晰的状态机：范围内旋转、外部发现、重新进入、外部接受和失败转换。Profile 提供位置，Wyckoff 提供结构语境，价格保存负责裁决；三者缺一时，交易条件应相应降低。")
        ]
      }
    ]
  ),
  makeChapter(
    26,
    "Footprint、Delta 与失衡：订单流的验证框架",
    [
      "Order Flow 把一根 K 线内部的成交按价格与主动方展开，适合在已经选定的交易区确认执行，而不适合替代高框架结构。它提高的是定位与时机精度，不是方向确定性。",
      "本章讲解 Bid × Ask Footprint、对角失衡、Delta、吸收、主动性、转折与延续模式，同时把数据分类、平台参数、隐藏流动性和跨场所缺口放在同等重要的位置。",
      "专业目标是建立“位置—行为—结果”协议：只有订单流行为出现在预先定义的位置，并由价格取得预期结果，才进入交易计划。"
    ],
    [
      {
        title: "订单流只在关键位置打开",
        blocks: [
          p("连续盯住 Footprint 会产生大量看似重要的失衡。有效流程先由高框架结构和 Profile 定位，再在候选区域观察微观成交。若价格位于区间中部、离风险边界过远，即使出现漂亮的 Delta 反转，也不构成高质量交易。"),
          p("进入订单流层之前，计划应已经包含方向假设、交易区、最大等待时间、触发类型和结构失效。Order Flow 只能确认、延迟或取消入场，不能在盘中发明一个与原背景无关的情景。")
        ]
      },
      {
        title: "Bid × Ask 是主动方分类，不是买卖人数",
        blocks: [
          p("Ask 成交通常被归类为主动买入，Bid 成交通常被归类为主动卖出。Delta 等于主动买入量减主动卖出量。每笔成交仍有双方，正 Delta 只说明在当前分类下更多数量跨越了 Ask。"),
          p("逐笔数据可能被聚合，报价可能在成交前后更新，交易可能发生在中间价或场外。不同平台对 Unclassified Trades、Spread Trades 和 Bundled Prints 的处理不同。交易团队应先对齐数据源，再比较 Delta 数字。")
        ]
      },
      {
        title: "对角失衡是一种平台约定",
        blocks: [
          p("许多 Footprint 平台把某价位的 Bid 与高一档价位的 Ask 对角比较，以接近相邻队列上的主动成交竞争。也有平台使用水平比较、替代 Tick 或自定义梯度。讲师应先展示软件算法，再解释行为，避免把对角读取说成市场唯一正确结构。"),
          p("当 Tick Size 较大、价格跳档或盘口稀疏时，对角比较可能夸大失衡。失衡区域应与柱范围、收盘位置、总成交量和随后价格移动共同判断。")
        ]
      },
      {
        title: "失衡阈值必须按标的和时段校准",
        blocks: [
          p("200%、300% 或 400% 只是显示阈值，不是机构参与的自然分界。低基数下从 1 到 4 合约也会产生 400%，因此需要最小成交量、相对分位数或时段标准化。"),
          p("校准流程应使用滚动样本，分别统计开盘、午间、收盘和事件窗口的失衡频率、后续价格结果与交易成本。阈值越低，信号越多但噪声越高；阈值越高，可能只留下事件型成交。"),
          table("table-26", [
            ["参数", "作用", "需记录的偏差"],
            ["Imbalance Ratio", "主动成交比例门槛", "低基数放大"],
            ["Minimum Volume", "过滤极小打印", "跨时段不稳定"],
            ["Stacked Levels", "要求连续多档失衡", "Tick Size 与分桶依赖"],
            ["Bar Type", "决定事件被怎样聚合", "时间、Range、Volume 结果不同"],
            ["Session Filter", "统一季节性基准", "隔夜与事件样本减少"]
          ]),
          caption("表 26-1　订单流参数必须版本化，否则历史图与实时信号不可比较。")
        ]
      },
      {
        title: "Absorption、Exhaustion 与 Initiative",
        blocks: [
          p("Absorption 候选表现为大量主动成交无法继续推动价格，并可能伴随同一价位反复补单；Exhaustion 候选表现为原方向主动成交与推进同时衰减；Initiative 表现为主动成交与价格结果一致。"),
          p("三者都需要后续验证。负 Delta 后上涨与卖方被吸收相容，也可能只是卖出结束后的低流动性反弹；正 Delta 后不涨与买方被吸收相容，也可能是成交发生在已知阻力的正常双向交换。"),
          list([
            "努力：相对成交量、Delta、失衡与重复打印。",
            "即时结果：柱内推进、收盘位置与极端是否保存。",
            "后续结果：下一轮主动性、突破、回测和时间消耗。",
            "失效：价格重新取得原方向结果并接受。"
          ])
        ]
      },
      {
        title: "转折模式：承接之后必须有反向结果",
        blocks: [
          p("看涨转折可由卖方主动打入 Bid、价格不再下行，随后主动买入推动 Ask 并完成向上位移构成；看跌转折相反。模式可以出现在一根柱、相邻多根柱或更长的微型平衡中。"),
          p("承接不是入场本身。入场至少等待反向 Initiative 或结构触发，因为被动承接者可能只是做市库存，随后撤单或对冲。若反向柱有高 Delta 却无法突破微观边界，同样不能确认转折。"),
          p("把 Footprint 转折与 Wyckoff 语言对应时，应写成“Spring 测试区域出现卖方吸收候选与买方主动性”，而不是“Footprint 证明这是 Spring”。")
        ]
      },
      {
        title: "延续模式：Control 与 Test",
        blocks: [
          p("Control 区域是主动成交取得显著位移并留下可识别失衡的价格带；Test 是价格回访该区域时，对手方无法取得同等结果，原方向主动性重新出现。"),
          p("Control 可能与推动腿 VPOC、柱内高成交区或 Stacked Imbalance 重合。回访时若成交下降但价格轻易穿越，不能解释为低量测试；低活动只有在原方向重新取得结果时才表示对手方不足。"),
          p("延续入场还要检查前方距离。若最近目标或高框架边界过近，即使 Control Test 完整，交易的执行后收益风险比也可能不足。")
        ]
      },
      {
        title: "Delta Divergence 是问题，不是答案",
        blocks: [
          p("价格创新高而 Cumulative Delta 未创新高，可能来自被动卖方吸收，也可能来自跨场所缺失、分类误差、冰山、期权对冲或价格在薄盘口中移动。价格与 Delta 背离只说明成交主动性与价格结果不同步。"),
          p("使用背离时应固定重置点、交易时段和数据源，并要求结构位置与后续反向结果。若分析师不断选择最有利的起点，任何行情都能制造 Cumulative Delta 背离。"),
          p("当价格与 Delta 冲突，优先检查数据，再判断“谁取得结果”。大量主动买入无法上涨通常比正 Delta 数值本身更有信息，但仍需后续价格确认。")
        ]
      },
      {
        title: "Order Book、Tape 与 Footprint 的边界",
        blocks: [
          table("table-27", [
            ["工具", "看见什么", "主要盲点", "适合职责"],
            ["Order Book / DOM", "当前可见挂单与队列", "撤单、隐藏单、跨场所与 Spoofing", "执行深度与短期流动性"],
            ["Tape", "逐笔成交顺序与规模", "聚合、场外打印和身份不可见", "速度、重复成交与事件确认"],
            ["Footprint", "柱内按价成交与主动方", "聚合规则、分类误差与参数依赖", "交易区内的触发与失败"],
            ["Delta", "分类后的净主动成交", "不含被动深度和撤单", "努力—结果比较"]
          ]),
          caption("表 26-2　工具越微观，覆盖越局部；没有一项能直接读取参与者意图。")
        ]
      },
      {
        title: "订单流执行协议",
        blocks: [
          list([
            "背景有效：高框架方向与状态没有被否定。",
            "位置有效：价格进入预先记录的结构或 Profile 区域。",
            "行为有效：出现校准后的吸收、主动性或 Control Test。",
            "结果有效：价格完成位移、收盘保存或微观回测。",
            "风险有效：止损、滑点和前方目标满足账户标准。",
            "时效有效：触发在规定窗口内出现，否则取消。"
          ], true),
          p("协议的价值在于允许“没有交易”。如果只有位置没有反向结果，继续等待；如果只有订单流没有结构位置，忽略；如果结构与触发完整但流动性恶化超出模型，取消订单。")
        ]
      },
      {
        title: "本章小结",
        blocks: [
          p("Footprint、Delta 和失衡是执行显微镜。它们提高对成交过程的分辨率，却同时放大数据与参数风险。把它们限制在关键位置，并要求价格结果确认，才能与 Wyckoff 的证据纪律一致。")
        ]
      }
    ]
  ),
  makeChapter(
    27,
    "Wyckoff 2.0：上下文、位置、触发与管理",
    [
      "Wyckoff 2.0 不是把更多指标叠在同一张图上，而是明确工具分工：Wyckoff 负责上下文与结构，Volume Profile 负责成交位置，Order Flow 负责执行层确认，风险系统负责决定是否允许交易。",
      "本章把全套课程压缩为一个可在交易台执行的流程。每一步都有输入、输出和否决权；任何工具都不能越级替代上一层未完成的判断。",
      "课程采用条件式情景而非方向预测。学生最终应能在价格没有按预案发展时快速降级、重新分类或保持空仓，而不是不断增加解释来保护原观点。"
    ],
    [
      {
        title: "三层决策架构",
        blocks: [
          table("table-28", [
            ["层", "职责", "主要工具", "不得越权"],
            ["Context", "定义平衡、趋势、结构与路径", "Wyckoff、波段、相对强弱", "不能用一分钟 Delta 改写周线结构"],
            ["Location", "确定值得等待的区域", "Value Area、POC、HVN/LVN、VWAP", "不能把水平当作自动触发"],
            ["Trigger", "确认当前成交与价格结果", "Price Action、Footprint、Tape", "不能在错误位置创造交易理由"],
            ["Risk", "把观点转成可生存头寸", "止损、仓位、成本、组合限额", "不能因分析自信绕过限额"]
          ]),
          caption("表 27-1　每一层都能否决交易，但不能替代上一层。")
        ]
      },
      {
        title: "Context：区间与趋势采用不同策略族",
        blocks: [
          p("区间背景优先观察边界拒绝、重新进入与内部旋转；趋势背景优先观察价值迁移、推动—回撤效率与延续测试。若趋势开始出现 Value Area 重叠、SOT 和反向接受，状态应从 Trend 降级为 Transition，而不是立刻预测反转。"),
          p("结构分类保持主情景与替代情景。主情景占更高权重，不代表获得更大仓位；仓位还取决于触发质量、失效距离、流动性和组合暴露。")
        ]
      },
      {
        title: "Location：把水平组织成决策区域",
        blocks: [
          p("高质量区域通常由一个结构理由和一个成交分布理由构成，例如 LPS 回测区与旧 VAH 重合，或 LPSY 区与推动腿 POC 重合。多个同源 Profile 水平只算一个数据家族。"),
          p("区域应包含进入条件、允许的穿越深度和超时规则。价格到达并不等于触发；如果在区域内持续建立反向价值，原有水平可能已从拒绝区转换为接受区。")
        ]
      },
      {
        title: "One-move 与 Two-move 情景",
        blocks: [
          p("One-move 情景用于价格已经处在有利一侧，只需回到交易区并出现触发。Two-move 情景用于价格尚未取得关键位置，必须先完成定位或突破，再等待回测。后者减少预测，但可能牺牲价格。"),
          p("每份计划只预测下一段可验证运动。看到 Potential Spring 时，可以等待测试向下进入区域；只有区域内出现向上结果后，才规划向 Creek 的下一段。一次性假设“先回踩再上涨到目标”会把两个不确定事件合并。"),
          list([
            "如果价格在 Creek 上方接受，则等待回测寻找多头触发。",
            "如果突破后快速重返区间，则取消多头，评估 Upthrust / Failed Breakout。",
            "如果价格停留在边界附近而无结果，则保持未决，不扩大解释。"
          ])
        ]
      },
      {
        title: "Trigger Ladder：从价格行为到订单流",
        blocks: [
          p("触发可以按信息与价格成本分层：边界收回最早但噪声高；Test 与显著 K 线增加确认；SOS/SOW 后的 LPS/LPSY 价格更差但结构信息更多；Footprint 可在相同区域内改善时机。"),
          p("订单流不是最高等级，而是更低时间分辨率。若它与高框架价格结果冲突，先检查数据和时点，再降低微观证据权重。"),
          table("table-29", [
            ["触发", "信息优势", "主要代价", "适用"],
            ["事件收回", "早、失效近", "假收回多", "成熟边界与小规模试探"],
            ["Test", "验证对手方减少", "可能错过 V 形移动", "区间终局与回测"],
            ["SOS/SOW + LPS/LPSY", "结构证明较完整", "入场较远", "趋势型持有"],
            ["Order Flow", "执行时点精细", "数据与参数风险", "流动性好且有预定义位置"]
          ]),
          caption("表 27-2　确认不是越多越好，而是用可接受价格购买需要的信息。")
        ]
      },
      {
        title: "订单选择由执行目标决定",
        blocks: [
          p("Stop Order 可以要求价格继续推进后才成交，适合动量确认；Market Order 适合触发已经完成且流动性可接受的场景；Limit Order 适合有明确价格上限并接受不成交的场景。课程不采用“永远不用限价单”之类绝对规则。"),
          p("选择订单前先估算 Spread、Depth、Slippage、Queue 与事件风险。触发 K 线很宽时，追价 Stop 可能把结构正确的交易变成负期望；此时应缩小仓位、等待回测或放弃，而不是降低止损质量。")
        ]
      },
      {
        title: "Stop Loss 与 Position Size",
        blocks: [
          p("结构失效说明分析何时错误，交易止损说明账户愿意承受多少路径。两者应尽量一致，但若结构失效距离过大，正确动作是缩小仓位或不交易，而不是把止损移到没有行为意义的近处。"),
          p("Profile 水平可以提供缓冲与路径信息：旧 LVN 可能快速穿越，Value Edge 可能发生双向测试，POC 附近可能旋转。止损需要覆盖正常拍卖噪声和预期滑点，并在跳空市场按压力价格计算。"),
          p("仓位以压力损失而非理想止损价计算。集中期货计入合约乘数与滑点，股票计入开盘跳空与借券，数字资产计入场所和清算风险。")
        ]
      },
      {
        title: "Take Profit 与路径管理",
        blocks: [
          p("目标按路径分层：最近结构边界或 POC 是第一管理点，前方 HVN 或旧价值区是再平衡候选，更高框架 Cause 只提供潜在尺度。目标不是一次性承诺，而是预先定义价格到达后如何更新。"),
          p("若价格进入 HVN 后停滞，允许减仓；若快速穿越 LVN 并在下一价值区接受，允许延长；若未到目标便出现反向接受，按行为退出。所有管理动作在交易前定义，避免只用盈利大小决定。")
        ]
      },
      {
        title: "价格没有给入场，不是执行错误",
        blocks: [
          p("市场按预期移动但没有到达区域或没有触发，只能记录为未成交机会。追价会把原先有边界的交易变成新的、未经评估的交易。正确流程是重新寻找下一处结构与 Profile 区域，或接受本轮没有仓位。"),
          p("复盘要区分分析正确、情景正确、触发缺失、订单未成交和执行错误。只有最后两类可能需要修改执行模型；不能因为错过一笔盈利就放宽所有未来触发。")
        ]
      },
      {
        title: "完整案例实验：从平衡到外部接受",
        blocks: [
          p("某期货在周度上行背景中形成三日区间。Fixed Profile 显示 POC 位于中部偏上，第三日 VAL 抬高；价格在区间下沿形成 Potential Spring，但 Footprint 出现显著负 Delta 后仍未向上位移。此时只有位置，没有触发。"),
          p("随后价格以宽幅 SOS 穿越 Creek，在上方建立 40 分钟新价值。计划转为 Two-move 完成后的回测：旧 VAH 与 Creek 重合区域等待买方 Initiative。回测成交下降、未进入旧区中部，Footprint 出现 Ask Stacked Imbalance 并收在区域上方，触发成立。"),
          p("止损位于旧价值区重新接受的位置，而不是单根 Footprint 极值；仓位按事件滑点压力缩小。第一管理点为上方 Composite HVN。若价格在 HVN 建立新价值则继续持有，若快速跌回突破区则退出。"),
          p("替代情景始终存在：若回测在旧价值区内建立成交，SOS 可能只是失败突破，取消多头并等待重新分类。")
        ]
      },
      {
        title: "交易台清单与模型卡",
        blocks: [
          list([
            "数据：场所、Session、合约、Profile 与 Footprint 参数是否正确。",
            "背景：状态、结构、主情景与替代情景。",
            "位置：区域来源、层级、有效时间与控制器。",
            "触发：可观察行为、结果与超时。",
            "风险：结构失效、订单、压力滑点、仓位与组合暴露。",
            "管理：第一管理点、目标、再分类和未成交处理。",
            "审计：截图、时点数据、参数版本与事后反事实。"
          ], true),
          p("本阶段内容在 Rubén Villahermosa 的《Wyckoff 2.0: Structures, Volume Profile and Order Flow》框架基础上重构，并结合现代市场微观结构、执行与模型治理要求修订。延伸阅读包括 J. Peter Steidlmayer 的 Market Profile 研究、James Dalton 的 Auction Market 实务，以及交易所关于订单类型与行情数据的技术文档。")
        ]
      },
      {
        title: "本章小结",
        blocks: [
          p("Wyckoff 2.0 的完整闭环是：用结构定义上下文，用 Profile 选择位置，用价格与订单流确认触发，再用风险和组合规则决定是否行动。复杂工具不会消除不确定性；它们的价值是让不确定性被分层、记录和管理。")
        ]
      }
    ]
  )
];

const legacyChapters = course.chapters.filter((chapter) => chapter.number <= 21);
const renamedGovernance = course.chapters
  .filter((chapter) => chapter.number >= 22)
  .map((chapter) => renumberChapter(chapter, chapter.number, chapter.number + 6));

const finalReferences = renamedGovernance.find((chapter) => chapter.number === 30)?.blocks;
if (finalReferences) {
  const referenceHeadingIndex = finalReferences.findIndex(
    (block) => block.type === "heading" && block.text?.includes("主要参考文献")
  );
  const referenceList = finalReferences.slice(referenceHeadingIndex + 1).find((block) => block.type === "list");
  if (referenceList) {
    referenceList.items.push(
      "Rubén Villahermosa Chaves, Wyckoff 2.0: Structures, Volume Profile and Order Flow, 2021.",
      "J. Peter Steidlmayer and Steven Hawkins, Steidlmayer on Markets, Wiley.",
      "James F. Dalton, Eric T. Jones and Robert B. Dalton, Mind Over Markets, Wiley."
    );
  }
}

course.meta = {
  ...course.meta,
  edition: "Version 6.0 · Professional Student Edition",
  sourcePages: 549
};

course.phases = [
  ...course.phases.filter((phase) => phase.number <= 5),
  {
    number: 6,
    roman: "VI",
    slug: "06",
    title: "拍卖、成交量剖面与订单流",
    english: "AUCTION & FLOW",
    chapters: [22, 23, 24, 25, 26, 27],
    statement: "让结构、成交位置与执行层证据形成同一条可复建的决策链。",
    chapterCount: 6
  },
  {
    number: 7,
    roman: "VII",
    slug: "07",
    title: "现代市场、研究与治理",
    english: "GOVERNANCE",
    chapters: [28, 29, 30],
    statement: "让方法可映射、可研究、可复核，也能在组合与制度约束下被否证。",
    chapterCount: 3
  }
];

course.chapters = [...legacyChapters, ...advancedChapters, ...renamedGovernance];

const executionInterlude = course.interludes.find((item) => item.beforeChapter === 19);
if (executionInterlude) {
  executionInterlude.blocks = [
    { type: "eyebrow", text: "EXECUTION" },
    { type: "heading", text: "从结构证据到可执行交易" },
    {
      type: "paragraph",
      text: "第 19—21 章把 Wyckoff 结构转化为情景、触发、订单、仓位、退出和交易后管理。结构正确只是起点，最终结果取决于是否能以可承受成本和可生存风险执行。"
    },
    {
      type: "paragraph",
      text: "证据层级对应交易条件，结构失效与账户止损分别处理；执行记录保留时点信息，避免用最终图表重新解释原决定。"
    }
  ];
}

course.interludes = [
  ...course.interludes.filter((item) => item.beforeChapter !== 22),
  {
    beforeChapter: 22,
    blocks: [
      { type: "eyebrow", text: "WYCKOFF 2.0" },
      { type: "heading", text: "从结构推理到成交位置与订单流验证" },
      {
        type: "paragraph",
        text: "第 22—27 章把高级结构诊断、Auction Market Theory、Volume Profile、Value Area 与 Order Flow 接入原有 Wyckoff 体系。内容以职业交易台为标准：所有水平可复建，所有订单流参数可版本化，所有方向解释都必须由后续价格结果确认。"
      },
      {
        type: "paragraph",
        text: "本阶段吸收《Wyckoff 2.0: Structures, Volume Profile and Order Flow》的核心框架，同时修订其中容易被误读为确定性规则的表述。VWAP、VPOC、VAH/VAL、HVN/LVN、Footprint 和 Delta 均作为条件证据，而非独立信号。"
      }
    ]
  },
  {
    beforeChapter: 28,
    blocks: [
      { type: "eyebrow", text: "RESEARCH & GOVERNANCE" },
      { type: "heading", text: "从现代市场映射到研究、组合与治理" },
      {
        type: "paragraph",
        text: "第 28—30 章处理算法交易、市场碎片化、数据映射、操作化研究、回测偏差、组合风险与模型治理。课程最终产物不是一张标注图，而是一套可被另一位交易员复建、执行、质疑和停用的专业流程。"
      },
      {
        type: "paragraph",
        text: "跨市场适配先完成数据制度映射，研究层保存时点与版本，组合层识别共同风险，治理层规定变更、例外与停用条件。"
      }
    ]
  }
].sort((a, b) => a.beforeChapter - b.beforeChapter);

const preservedFrontMatter = course.frontMatter.slice(0, 21);
preservedFrontMatter[4].text = "七阶段 · 三十章专业教材\n面向证券从业人员、自营机构交易员与具备多年实盘经验的职业交易者";
preservedFrontMatter[6].text = "Version 6.0 • Professional Student Edition";
preservedFrontMatter[9].text = "本书从价格、成交量与时间开始，逐步进入趋势、交易区间、Accumulation、Distribution、执行、Auction Market Theory、Volume Profile、Order Flow、研究与治理。事件名称始终服从结构任务、数据口径与后续价格结果。";
preservedFrontMatter[15].text = "图表用于呈现价格、成交量、波段、成交分布与结构之间的关系。股票、ETF、期货、外汇与数字资产共享拍卖和供需逻辑，但交易时段、场所覆盖、基差、展期、杠杆与流动性制度不同。第 22—30 章集中处理工具整合、市场映射、研究与治理。";
preservedFrontMatter[17].text = "建议按章节顺序学习。第 1—8 章建立证据与结构语言，第 9—18 章深入 Accumulation、Distribution 与失败结构，第 19—21 章完成交易构建，第 22—27 章整合 Volume Profile 与 Order Flow，第 28—30 章完成研究、组合与治理。";
preservedFrontMatter[19].text = "SEVEN PHASES · THIRTY CHAPTERS";
preservedFrontMatter[20].text = "七个阶段构成连续的专业推理体系：先建立量价与结构语言，再完成吸筹、派发和执行；随后以拍卖、成交量剖面与订单流提升定位和执行精度，最后进入现代市场映射、研究验证与组合治理。";

const outline = [];
for (const phase of course.phases) {
  outline.push({ type: "paragraph", text: `第${["一", "二", "三", "四", "五", "六", "七"][phase.number - 1]}阶段 ${phase.title}` });
  for (const chapterNumber of phase.chapters) {
    const chapter = course.chapters.find((item) => item.number === chapterNumber);
    outline.push({ type: "paragraph", text: `${pad(chapter.number)} ${chapter.title}` });
  }
}
course.frontMatter = [...preservedFrontMatter, ...outline];

await fs.writeFile(coursePath, `${JSON.stringify(course, null, 2)}\n`);

const searchRecords = [];
for (const chapter of course.chapters) {
  chapter.blocks.forEach((block, blockIndex) => {
    const anchor = block.id || `c${chapter.number}-b${String(blockIndex).padStart(3, "0")}`;
    const base = {
      chapter: chapter.number,
      chapterTitle: chapter.title,
      phase: chapter.phase
    };

    if (["paragraph", "heading", "eyebrow", "caption"].includes(block.type) && block.text) {
      searchRecords.push({ ...base, anchor, text: block.text, kind: block.type });
    }
    if (block.type === "list") {
      block.items?.forEach((item, index) => {
        searchRecords.push({
          ...base,
          anchor: `${anchor}-i${String(index).padStart(2, "0")}`,
          text: item,
          kind: "list-item"
        });
      });
    }
    if (block.type === "table" && block.rows?.length) {
      searchRecords.push({
        ...base,
        anchor,
        text: block.rows.flat().join(" "),
        kind: "table"
      });
    }
    if (block.type === "image" && block.caption) {
      searchRecords.push({ ...base, anchor, text: block.caption, kind: "image" });
    }
  });
}
await fs.writeFile(searchPath, `${JSON.stringify(searchRecords)}\n`);

const counts = course.chapters.flatMap((chapter) => chapter.blocks).reduce((acc, block) => {
  acc[block.type] = (acc[block.type] || 0) + 1;
  return acc;
}, {});
await fs.writeFile(summaryPath, `${JSON.stringify({
  title: course.meta.title,
  phases: course.phases.length,
  chapters: course.chapters.length,
  searchRecords: searchRecords.length,
  blocks: counts,
  integration: "Wyckoff 2.0 professional review"
}, null, 2)}\n`);

console.log(JSON.stringify({
  phases: course.phases.length,
  chapters: course.chapters.length,
  searchRecords: searchRecords.length,
  advancedChapters: advancedChapters.length
}, null, 2));
