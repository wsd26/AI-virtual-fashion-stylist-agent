import { Scene, Weather } from "@/types";

// ========== 社区用户 ==========
export interface CommunityUser {
  id: string;
  name: string;
  avatar: string;
  followers: number;
  style: string[];
  bio: string;
}

export const communityUsers: CommunityUser[] = [
  { id: "u1", name: "@潮人小张", avatar: "🧑", followers: 12300, style: ["街头", "美式"], bio: "街头文化爱好者，AJ1 收藏玩家" },
  { id: "u2", name: "@穿搭达人Lily", avatar: "👩", followers: 8900, style: ["Clean Fit", "日系"], bio: "极简质感穿搭，一个单品穿七天" },
  { id: "u3", name: "@球鞋阿聪", avatar: "🧑", followers: 15600, style: ["球鞋评测", "开箱"], bio: "硬核开箱，不吹不黑" },
  { id: "u4", name: "@日系穿搭阿Ken", avatar: "🧑", followers: 6200, style: ["日系", "City Boy"], bio: "东京古着探店十级学者" },
  { id: "u5", name: "@甜酷穿搭Sally", avatar: "👩", followers: 4800, style: ["甜酷", "Y2K", "韩系"], bio: "甜中带酷，160cm 穿搭思路分享" },
  { id: "u6", name: "@城市玩家小K", avatar: "🧑", followers: 3500, style: ["机能", "户外"], bio: "城市机能风，实用主义穿搭" },
  { id: "u7", name: "@音乐节穿搭", avatar: "👩", followers: 9100, style: ["音乐节", "撞色", "层次"], bio: "音乐节现场才是真正的 T 台" },
  { id: "u8", name: "@校园穿搭志", avatar: "👩", followers: 11200, style: ["校园", "学院", "休闲"], bio: "好穿不贵的学生党穿搭" },
  { id: "u9", name: "@质感穿搭指南", avatar: "🧑", followers: 7300, style: ["Clean Fit", "质感", "简约"], bio: "细节控，面料和剪裁才是穿搭的灵魂" },
  { id: "u10", name: "@韩系穿搭Hana", avatar: "👩", followers: 5600, style: ["韩系", "温柔", "约会"], bio: "首尔留学中，分享韩系日常" },
];

// ========== 商品 ==========
export interface CommunityProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  images: string[];
  salesCount: number;
  rating: number;
  ratingCount: number;
  category: "sneaker" | "clothing" | "accessory" | "toy";
  tags: string[];
}

export const communityProducts: CommunityProduct[] = [
  {
    id: "aj1-chicago-2025",
    name: 'Air Jordan 1 High OG "Chicago" 芝加哥',
    brand: "Nike",
    price: 1499,
    originalPrice: 1699,
    images: ["https://picsum.photos/seed/aj1-chicago/400/400"],
    salesCount: 23800,
    rating: 4.8,
    ratingCount: 12600,
    category: "sneaker",
    tags: ["AJ1", "芝加哥", "经典复刻", "篮球鞋", "高帮"],
  },
  {
    id: "dunk-low-panda",
    name: 'Nike Dunk Low "Panda" 黑白熊猫',
    brand: "Nike",
    price: 799,
    originalPrice: 899,
    images: ["https://picsum.photos/seed/dunk-panda/400/400"],
    salesCount: 56200,
    rating: 4.6,
    ratingCount: 32100,
    category: "sneaker",
    tags: ["Dunk", "熊猫", "黑白", "低帮", "百搭"],
  },
  {
    id: "essential-hoodie-fw23",
    name: "Fear of God Essentials FW23 连帽卫衣",
    brand: "Essentials",
    price: 899,
    originalPrice: 1299,
    images: ["https://picsum.photos/seed/essential-hoodie/400/400"],
    salesCount: 15700,
    rating: 4.7,
    ratingCount: 8900,
    category: "clothing",
    tags: ["卫衣", "高街", "Essentials", "秋冬", "廓形"],
  },
  {
    id: "carhartt-cargo",
    name: "Carhartt WIP 工装裤 Cargo Pants",
    brand: "Carhartt WIP",
    price: 659,
    originalPrice: 799,
    images: ["https://picsum.photos/seed/carhartt-cargo/400/400"],
    salesCount: 12300,
    rating: 4.5,
    ratingCount: 6700,
    category: "clothing",
    tags: ["工装裤", "Carhartt", "街头", "日系", "百搭"],
  },
  {
    id: "stussy-tote",
    name: "Stussy 帆布托特包 Canvas Tote",
    brand: "Stussy",
    price: 329,
    images: ["https://picsum.photos/seed/stussy-tote/400/400"],
    salesCount: 8900,
    rating: 4.4,
    ratingCount: 4300,
    category: "accessory",
    tags: ["托特包", "Stussy", "帆布", "街头", "配件"],
  },
  {
    id: "new-era-yankees",
    name: "New Era 纽约洋基 59FIFTY 棒球帽",
    brand: "New Era",
    price: 269,
    originalPrice: 329,
    images: ["https://picsum.photos/seed/new-era-cap/400/400"],
    salesCount: 34100,
    rating: 4.3,
    ratingCount: 18900,
    category: "accessory",
    tags: ["棒球帽", "洋基", "New Era", "经典", "配件"],
  },
  {
    id: "heavyweight-tee-white",
    name: "重磅纯棉T恤 白色",
    brand: "Uniqlo",
    price: 129,
    images: ["https://picsum.photos/seed/heavyweight-tee/400/400"],
    salesCount: 45200,
    rating: 4.5,
    ratingCount: 28900,
    category: "clothing",
    tags: ["T恤", "白T", "基础款", "重磅", "百搭"],
  },
  {
    id: "vintage-wash-jeans",
    name: "做旧水洗宽松直筒牛仔裤",
    brand: "Levi's",
    price: 599,
    originalPrice: 799,
    images: ["https://picsum.photos/seed/vintage-jeans/400/400"],
    salesCount: 18900,
    rating: 4.6,
    ratingCount: 12300,
    category: "clothing",
    tags: ["牛仔裤", "直筒", "水洗", "做旧", "日系"],
  },
  {
    id: "mid-calf-socks-red",
    name: "红白拼色中筒运动袜",
    brand: "Nike",
    price: 79,
    images: ["https://picsum.photos/seed/mid-calf-socks/400/400"],
    salesCount: 67300,
    rating: 4.4,
    ratingCount: 34100,
    category: "accessory",
    tags: ["袜子", "中筒", "红白", "运动", "配件"],
  },
  {
    id: "boxy-oversized-shirt",
    name: "廓形古巴领短袖衬衫",
    brand: "Zara",
    price: 259,
    images: ["https://picsum.photos/seed/boxy-shirt/400/400"],
    salesCount: 12400,
    rating: 4.3,
    ratingCount: 7800,
    category: "clothing",
    tags: ["衬衫", "廓形", "古巴领", "夏日", "街头"],
  },
];

// ========== 社区内容类型 ==========
export type ContentType = "outfit" | "review" | "discussion" | "analysis";

export interface CommunityContent {
  id: string;
  type: ContentType;
  authorId: string;
  productIds: string[];
  title: string;
  body: string;
  images: string[];
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  scene?: Scene;
  weather?: Weather;
  style?: string;
  createdAt: string;
}

// ========== 社区内容数据库 ==========
export const communityContents: CommunityContent[] = [
  // ── 穿搭精选 ──
  {
    id: "outfit-1",
    type: "outfit",
    authorId: "u1",
    productIds: ["aj1-chicago-2025", "carhartt-cargo"],
    title: "",
    body: "芝加哥 + 工装裤，街头 OG 的经典组合。这双红色上脚比图片还顶，配卡其工装裤把鞋的颜色完全推出来了。今天晴天光线好，街头回头率拉满。",
    images: ["https://picsum.photos/seed/outfit1/400/500"],
    likes: 2300, comments: 156, shares: 89,
    tags: ["街头穿搭", "AJ1芝加哥", "工装裤"],
    scene: "street", weather: "sunny", style: "街头",
    createdAt: "2026-05-20",
  },
  {
    id: "outfit-2",
    type: "outfit",
    authorId: "u2",
    productIds: ["aj1-chicago-2025", "essential-hoodie-fw23"],
    title: "",
    body: "Clean Fit 路线配芝加哥。灰卫衣+直筒牛仔裤+芝加哥，三件基础款让鞋成为全身唯一亮点。简约不等于无聊，质感在细节里。",
    images: ["https://picsum.photos/seed/outfit2/400/500"],
    likes: 1800, comments: 98, shares: 45,
    tags: ["Clean Fit", "AJ1芝加哥", "极简穿搭"],
    scene: "cafe", weather: "cloudy", style: "Clean Fit",
    createdAt: "2026-05-18",
  },
  {
    id: "outfit-3",
    type: "outfit",
    authorId: "u4",
    productIds: ["aj1-chicago-2025", "new-era-yankees"],
    title: "",
    body: "日系 City Boy 风。宽腿斜纹裤+条纹牛津衬衫+针织马甲+芝加哥，层次感拉满。棒球帽是点睛之笔，和球鞋颜色呼应。校园里回头率很高。",
    images: ["https://picsum.photos/seed/outfit3/400/500"],
    likes: 1500, comments: 78, shares: 34,
    tags: ["日系穿搭", "City Boy", "AJ1芝加哥"],
    scene: "campus", weather: "sunny", style: "日系",
    createdAt: "2026-05-15",
  },
  {
    id: "outfit-4",
    type: "outfit",
    authorId: "u5",
    productIds: ["aj1-chicago-2025"],
    title: "",
    body: "甜酷女孩的 AJ1 穿法！短款皮夹克+百褶裙+芝加哥，甜中带酷。谁说 AJ1 只能男生穿？160cm 小个子也完全能驾驭，选对裙长比例就对。",
    images: ["https://picsum.photos/seed/outfit4/400/500"],
    likes: 2100, comments: 134, shares: 67,
    tags: ["甜酷风", "AJ1芝加哥", "小个子穿搭"],
    scene: "street", weather: "sunset", style: "甜酷",
    createdAt: "2026-05-12",
  },
  {
    id: "outfit-5",
    type: "outfit",
    authorId: "u6",
    productIds: ["aj1-chicago-2025", "stussy-tote"],
    title: "",
    body: "雨天机能风搭配。GORE-TEX 冲锋衣 + 速干机能裤 + 芝加哥，梅雨季也不影响出街。防水渔夫帽和托特包都是雨天必备，功能性和好看可以兼得。",
    images: ["https://picsum.photos/seed/outfit5/400/500"],
    likes: 980, comments: 56, shares: 23,
    tags: ["机能风", "雨天穿搭", "AJ1芝加哥"],
    scene: "street", weather: "rainy", style: "机能",
    createdAt: "2026-05-10",
  },
  {
    id: "outfit-6",
    type: "outfit",
    authorId: "u7",
    productIds: ["aj1-chicago-2025"],
    title: "",
    body: "音乐节 OOTD！扎染 Tee + 机能短裤 + 芝加哥，傍晚灯光下红色鞋面质感绝了。撞色叠穿在音乐节完全不违和，大胆一点！",
    images: ["https://picsum.photos/seed/outfit6/400/500"],
    likes: 3400, comments: 210, shares: 120,
    tags: ["音乐节穿搭", "撞色", "AJ1芝加哥"],
    scene: "festival", weather: "sunset", style: "撞色",
    createdAt: "2026-05-08",
  },
  {
    id: "outfit-7",
    type: "outfit",
    authorId: "u8",
    productIds: ["dunk-low-panda"],
    title: "",
    body: "熊猫 Dunk 的校园穿搭。灰色连帽卫衣 + 直筒牛仔裤 + 熊猫 Dunk，上课日常 yyds。黑白配色真的好搭，随便穿都好看。",
    images: ["https://picsum.photos/seed/outfit7/400/500"],
    likes: 2800, comments: 189, shares: 78,
    tags: ["校园穿搭", "Dunk熊猫", "日常"],
    scene: "campus", weather: "sunny", style: "休闲",
    createdAt: "2026-05-22",
  },
  {
    id: "outfit-8",
    type: "outfit",
    authorId: "u9",
    productIds: ["essential-hoodie-fw23", "carhartt-cargo"],
    title: "",
    body: "Essentials 卫衣 + Carhartt 工装裤，高街和工装的碰撞。傍晚咖啡店约会穿搭，米色和卡其的同色系看着很舒服，棒球帽增加层次。",
    images: ["https://picsum.photos/seed/outfit8/400/500"],
    likes: 1600, comments: 89, shares: 35,
    tags: ["高街", "工装", "约会穿搭"],
    scene: "cafe", weather: "sunset", style: "Clean Fit",
    createdAt: "2026-05-19",
  },
  {
    id: "outfit-9",
    type: "outfit",
    authorId: "u10",
    productIds: ["aj1-chicago-2025"],
    title: "",
    body: "韩系温柔风也能配 AJ1！燕麦色开衫 + A 字中长裙 + 芝加哥，温柔中带点酷。约会这样穿很加分，红色鞋子打破了一身柔和色调。",
    images: ["https://picsum.photos/seed/outfit9/400/500"],
    likes: 1200, comments: 67, shares: 28,
    tags: ["韩系", "约会穿搭", "AJ1芝加哥", "温柔风"],
    scene: "cafe", weather: "sunset", style: "韩系",
    createdAt: "2026-05-17",
  },
  {
    id: "outfit-10",
    type: "outfit",
    authorId: "u2",
    productIds: ["dunk-low-panda", "stussy-tote"],
    title: "",
    body: "熊猫 Dunk + 帆布托特包 + 白T + 直筒牛仔裤，最简单的通勤穿搭。不需要 logo 堆砌，基础款穿对版型就是高级感。",
    images: ["https://picsum.photos/seed/outfit10/400/500"],
    likes: 1900, comments: 102, shares: 41,
    tags: ["Clean Fit", "通勤穿搭", "Dunk熊猫"],
    scene: "cafe", weather: "cloudy", style: "Clean Fit",
    createdAt: "2026-05-21",
  },

  // ── 好物评价 ──
  {
    id: "review-1",
    type: "review",
    authorId: "u3",
    productIds: ["aj1-chicago-2025"],
    title: "二批复刻，有进步也有槽点",
    body: "先说好的：皮质比上一批明显升级，鞋面用了更好的牛皮，手感细腻很多。鞋型还原度也高，85 年的 silhouette 拿捏住了。再说问题：鞋头溢胶情况确实存在，我这双右边就有一条不太明显的胶线。尺码方面建议大家按正码买，不需要像上一批那样买大半码。整体给 4 星，扣一星在品控一致性上。",
    images: ["https://picsum.photos/seed/review1/400/500"],
    likes: 3200, comments: 234, shares: 156,
    tags: ["AJ1芝加哥", "开箱", "品控"],
    createdAt: "2026-04-28",
  },
  {
    id: "review-2",
    type: "review",
    authorId: "u8",
    productIds: ["dunk-low-panda"],
    title: "百搭之王，性价比拉满",
    body: "¥799 这个价格没什么好说的，Dunk 的经典程度不输 AJ1。上脚很轻，比 AJ1 舒服（Dunk 鞋底更软）。缺点是皮质一般，毕竟这个价位。建议买大半码，我平时 38 买 38.5 刚好。",
    images: ["https://picsum.photos/seed/review2/400/500"],
    likes: 1800, comments: 145, shares: 67,
    tags: ["Dunk熊猫", "性价比", "百搭"],
    createdAt: "2026-05-05",
  },
  {
    id: "review-3",
    type: "review",
    authorId: "u9",
    productIds: ["essential-hoodie-fw23"],
    title: "FW23 比 FW22 好在哪里",
    body: "FW23 的面料克重增加了，挺括感更强。廓形还是一如既往的 oversized，建议买小一码。这季的颜色比上季更高级，米色和灰色闭眼入。¥899 算是好价了，原价 ¥1299 的时候没舍得买。唯一的槽点是橡胶标容易粘毛，黑色尤其明显。",
    images: ["https://picsum.photos/seed/review3/400/500"],
    likes: 980, comments: 87, shares: 34,
    tags: ["Essentials", "FW23", "卫衣评测"],
    createdAt: "2026-05-02",
  },
  {
    id: "review-4",
    type: "review",
    authorId: "u6",
    productIds: ["carhartt-cargo"],
    title: "一条穿三年的工装裤",
    body: "Carhartt 的耐造程度不用多说。这条 WIP 支线比主线偏修身，建议买大一号。面料硬挺有型，下水三次后会软一点但不会变形。口袋够多够实用，手机钥匙钱包全部搞定。唯一缺点：夏天穿有点厚，春秋冬三季无压力。",
    images: ["https://picsum.photos/seed/review4/400/500"],
    likes: 760, comments: 56, shares: 23,
    tags: ["Carhartt", "工装裤", "耐穿"],
    createdAt: "2026-04-15",
  },
  {
    id: "review-5",
    type: "review",
    authorId: "u5",
    productIds: ["stussy-tote"],
    title: "拍照利器，实用性一般",
    body: "Stussy 这个托特包颜值没话说，帆布材质很上镜。但说句实话不太能装，比想象的小一圈。逛街背背还行，上学背电脑不太够。¥329 买的是个 logo 和搭配属性，实用性党慎重。",
    images: ["https://picsum.photos/seed/review5/400/500"],
    likes: 540, comments: 45, shares: 12,
    tags: ["Stussy", "托特包", "拔草"],
    createdAt: "2026-05-01",
  },

  // ── 讨论区 ──
  {
    id: "disc-1",
    type: "discussion",
    authorId: "u1",
    productIds: ["aj1-chicago-2025", "dunk-low-panda"],
    title: "AJ1 芝加哥 vs Dunk 熊猫，第一双球鞋选哪个？",
    body: "最近好多新手问这两双怎么选。个人观点：预算够就 AJ1，¥1499 换一个经典配色不亏；预算有限 Dunk ¥799 也够用。但 AJ1 芝加哥的搭配上限更高，Dunk 熊猫胜在价格和舒适度。大家怎么看？",
    images: [],
    likes: 4500, comments: 342, shares: 189,
    tags: ["球鞋选购", "AJ1 vs Dunk", "新手入坑"],
    createdAt: "2026-05-24",
  },
  {
    id: "disc-2",
    type: "discussion",
    authorId: "u3",
    productIds: ["aj1-chicago-2025"],
    title: "关于芝加哥复刻的尺码问题，我做个总结",
    body: "看了大家一个月的讨论，总结一下：第一批复刻鞋楦偏窄，所以老玩家都建议买大半码。但第二批鞋楦微调过了，现在买正码就行。如果你不确定自己是第几批，去「我的订单」看生产日期，2026年3月之后的都是第二批。",
    images: [],
    likes: 2800, comments: 198, shares: 245,
    tags: ["AJ1芝加哥", "尺码指南", "干货"],
    createdAt: "2026-05-23",
  },
  {
    id: "disc-3",
    type: "discussion",
    authorId: "u7",
    productIds: ["aj1-chicago-2025"],
    title: "芝加哥 vs 黑红脚趾，AJ1 颜值天花板之争",
    body: "3.2k 人参与了投票，目前芝加哥 52% vs 黑红脚趾 48%，咬得很紧。我站芝加哥，红白黑三色比黑红白更耐看，搭什么都不会错。但黑红脚趾更有个性，撞色更猛。评论区说说你选哪个？",
    images: [],
    likes: 6800, comments: 520, shares: 310,
    tags: ["AJ1", "投票", "颜值争议"],
    createdAt: "2026-05-25",
  },
  {
    id: "disc-4",
    type: "discussion",
    authorId: "u8",
    productIds: ["essential-hoodie-fw23"],
    title: "Essentials 还值得买吗？聊聊高街品牌的性价比",
    body: "去年 Essentials 确实火，但今年感觉热度下来了。FW23 这季设计和面料其实比 FW22 好，但价格也在涨。¥899 值不值？我觉得面料和版型值这个价，但如果你已经有类似的基础款卫衣，没必要重复买。",
    images: [],
    likes: 1200, comments: 178, shares: 56,
    tags: ["Essentials", "高街", "性价比"],
    createdAt: "2026-05-20",
  },
  {
    id: "disc-5",
    type: "discussion",
    authorId: "u4",
    productIds: ["carhartt-cargo"],
    title: "工装裤选购指南：Carhartt vs Dickies vs Uniqlo",
    body: "三家的工装裤我都穿过。质感排名 Carhartt > Dickies > Uniqlo，价格也是。学生党 Uniqlo ¥249 够用，预算够直接上 Carhartt ¥659，一条穿三年的裤子。Dickies 在中间，¥399，无功无过。",
    images: [],
    likes: 2100, comments: 189, shares: 98,
    tags: ["工装裤", "选购指南", "对比"],
    createdAt: "2026-05-18",
  },

  // ── 玩家说 ──
  {
    id: "analysis-1",
    type: "analysis",
    authorId: "u3",
    productIds: ["aj1-chicago-2025"],
    title: "AJ1 芝加哥复刻深度解析：和上一次复刻的 5 个不同",
    body: "1. 皮质：二批用了 tumbled leather，上一批是 smooth leather。手感和质感有明显提升。\n2. 鞋楦：二批微调了鞋楦宽度，解决了上批偏窄的问题。\n3. 配色：红色的色号微调，比上一批复刻更接近 85 元年。\n4. 鞋舌：厚度增加，更像 OG 版本的填充感。\n5. 做工：溢胶问题依然存在，但比上批有所改善。23 条相关评价集中在新批次的前期出货。\n\n总结：如果你已经有一批复刻，没必要再买二批；如果你第一次入 AJ1 芝加哥，二批是目前最好的版本。",
    images: ["https://picsum.photos/seed/analysis1/400/500"],
    likes: 5200, comments: 345, shares: 567,
    tags: ["AJ1芝加哥", "深度解析", "复刻对比", "干货"],
    createdAt: "2026-05-15",
  },
  {
    id: "analysis-2",
    type: "analysis",
    authorId: "u2",
    productIds: ["aj1-chicago-2025", "dunk-low-panda"],
    title: "从 AJ1 到 Dunk：球鞋文化中的穿搭逻辑演变",
    body: "AJ1 代表的是篮球鞋到文化符号的跨越，Dunk 代表的是滑板文化到潮流单品的转变。从穿搭角度看，AJ1 更适合做 statement piece（全身焦点），Dunk 更适合做日常通勤鞋。搭配逻辑不同，没有谁更好，看你在什么场景需要什么表达。",
    images: [],
    likes: 3400, comments: 267, shares: 198,
    tags: ["球鞋文化", "AJ1", "Dunk", "穿搭思考"],
    createdAt: "2026-05-10",
  },
  {
    id: "analysis-3",
    type: "analysis",
    authorId: "u6",
    productIds: ["essential-hoodie-fw23", "carhartt-cargo"],
    title: "为什么「基础款+工装裤+球鞋」是当下最稳的穿搭公式",
    body: "三个原因：1. 容错率极高，基础款不挑人、不挑身材、不挑肤色；2. 穿搭效率高，五分钟出门不乱搭；3. 视觉重心自然落在鞋子上，适合展示收藏的球鞋。但有一点要注意：基础款不等于随便买，版型和面料才是核心。一件重磅纯棉白T和一件薄款化纤白T，效果天差地别。",
    images: [],
    likes: 4200, comments: 289, shares: 234,
    tags: ["穿搭公式", "基础款", "工装裤", "球鞋搭配"],
    createdAt: "2026-05-12",
  },
];

// ========== 内容检索工具 ==========

/** 根据商品 ID 获取关联的社区内容 */
export function getContentByProduct(productId: string): CommunityContent[] {
  return communityContents.filter((c) => c.productIds.includes(productId));
}

/** 按类型过滤 */
export function getContentByType(type: ContentType): CommunityContent[] {
  return communityContents.filter((c) => c.type === type);
}

/** 按场景 + 天气检索穿搭内容 */
export function getOutfitsBySceneWeather(scene: Scene, weather?: Weather): CommunityContent[] {
  return communityContents.filter(
    (c) => c.type === "outfit" && c.scene === scene && (!weather || c.weather === weather)
  );
}

/** 按风格检索穿搭内容 */
export function getOutfitsByStyle(style: string): CommunityContent[] {
  return communityContents.filter(
    (c) => c.type === "outfit" && c.style === style
  );
}

/** 获取商品 */
export function getProduct(productId: string): CommunityProduct | undefined {
  return communityProducts.find((p) => p.id === productId);
}

/** 获取社区用户 */
export function getUser(userId: string): CommunityUser | undefined {
  return communityUsers.find((u) => u.id === userId);
}

/** 获取商品的所有评价（review 类型） */
export function getReviews(productId: string): CommunityContent[] {
  return communityContents.filter((c) => c.type === "review" && c.productIds.includes(productId));
}

/** 获取商品相关的讨论 */
export function getDiscussions(productId: string): CommunityContent[] {
  return communityContents.filter((c) => c.type === "discussion" && c.productIds.includes(productId));
}

/** 获取商品相关的玩家说 */
export function getAnalyses(productId: string): CommunityContent[] {
  return communityContents.filter((c) => c.type === "analysis" && c.productIds.includes(productId));
}

/** 构建社区内容摘要（用于 Agent System Prompt）—— 精简版，详细数据由 intentContext 按需注入 */
export function buildCommunityContext(productId: string): string {
  const product = getProduct(productId);
  if (!product) return "";

  const contents = getContentByProduct(productId);
  const reviews = contents.filter((c) => c.type === "review").length;
  const discussions = contents.filter((c) => c.type === "discussion").length;
  const outfits = contents.filter((c) => c.type === "outfit").length;
  const analyses = contents.filter((c) => c.type === "analysis").length;

  const sentiment = product.rating >= 4.5 ? "多数好评" : product.rating >= 4.0 ? "评价两极" : "多数差评";

  return `${product.name} · ¥${product.price} · ${product.rating}分(${product.ratingCount >= 10000 ? (product.ratingCount / 10000).toFixed(1) + "万" : product.ratingCount}评价) · ${product.salesCount >= 10000 ? (product.salesCount / 10000).toFixed(1) + "万" : product.salesCount}件已售
口碑：${sentiment}，${reviews}条好物评价 · ${discussions}个讨论 · ${outfits}套穿搭 · ${analyses}篇玩家说
标签：${product.tags.join("、")}`;
}

/** 获取社区统计数据 */
export function getCommunityStats(productId: string) {
  const contents = getContentByProduct(productId);
  const totalLikes = contents.reduce((sum, c) => sum + c.likes, 0);
  const totalComments = contents.reduce((sum, c) => sum + c.comments, 0);
  const totalShares = contents.reduce((sum, c) => sum + c.shares, 0);
  return {
    totalPosts: contents.length,
    totalLikes,
    totalComments,
    totalShares,
    outfitCount: contents.filter((c) => c.type === "outfit").length,
    reviewCount: contents.filter((c) => c.type === "review").length,
    discussionCount: contents.filter((c) => c.type === "discussion").length,
    analysisCount: contents.filter((c) => c.type === "analysis").length,
  };
}

/** 构建穿搭方案的社区引用 */
export function buildOutfitReference(productId: string, style?: string, scene?: Scene, weather?: Weather) {
  const outfits = getContentByProduct(productId).filter((c) => c.type === "outfit");
  let filtered = outfits;

  if (scene) filtered = filtered.filter((o) => o.scene === scene);
  if (weather) filtered = filtered.filter((o) => o.weather === weather);
  if (style) filtered = filtered.filter((o) => o.style === style);

  // fallback
  if (filtered.length === 0) filtered = outfits;

  return filtered.slice(0, 3).map((o) => {
    const author = getUser(o.authorId);
    return {
      contentId: o.id,
      authorName: author?.name || "社区用户",
      authorAvatar: author?.avatar || "👤",
      body: o.body,
      likes: o.likes,
      comments: o.comments,
      style: o.style || "",
      scene: o.scene,
      weather: o.weather,
      tags: o.tags,
    };
  });
}
