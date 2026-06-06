const words = Array.isArray(window.VOCABULARY) ? window.VOCABULARY : [];
const sentenceChallenges = Array.isArray(window.SENTENCE_CHALLENGES) ? window.SENTENCE_CHALLENGES : [];

function readJsonStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function initialPets() {
  const pets = readJsonStorage("vocabTrainerPets", null);
  if (pets && pets.primary && pets.high) return pets;
  const oldPet = readJsonStorage("vocabTrainerPet", { feed: 0, lastFedAt: 0 });
  return {
    primary: oldPet,
    high: { feed: 0, lastFedAt: 0 },
  };
}

function initialPetProgress() {
  const progress = readJsonStorage("vocabTrainerPetProgress", null);
  if (progress && progress.primary && progress.high) return progress;
  return {
    primary: { completedGroups: [], names: {} },
    high: { completedGroups: [], names: {} },
  };
}

const state = {
  level: "primary",
  pos: "all",
  semantic: "all",
  group: 1,
  mode: "cards",
  index: 0,
  currentCardId: null,
  streaks: readJsonStorage("vocabTrainerStreaks", {
    primary: Number(localStorage.getItem("vocabTrainerStreak") || 0),
    high: 0,
  }),
  mastered: new Set(JSON.parse(localStorage.getItem("vocabTrainerMastered") || "[]")),
  wrong: new Set(JSON.parse(localStorage.getItem("vocabTrainerWrong") || "[]")),
  wordStats: JSON.parse(localStorage.getItem("vocabTrainerWordStats") || "{}"),
  readChallenge: readJsonStorage("vocabTrainerReadChallenge", { primary: { index: 0, attempts: [] }, high: { index: 0, attempts: [] } }),
  pets: initialPets(),
  petProgress: initialPetProgress(),
  currentQuiz: null,
  queues: { choice: [], sentence: [], wrongChoice: [], wrongSentence: [] },
  batchDone: { choice: false, sentence: false, wrongChoice: false, wrongSentence: false },
  batchStarted: { choice: false, sentence: false, wrongChoice: false, wrongSentence: false },
  batchRewarded: { choice: false, sentence: false, wrongChoice: false, wrongSentence: false },
  batchStats: {
    choice: { total: 0, correct: 0, wrong: 0 },
    sentence: { total: 0, correct: 0, wrong: 0 },
    wrongChoice: { total: 0, correct: 0, wrong: 0 },
    wrongSentence: { total: 0, correct: 0, wrong: 0 },
  },
};

const els = {
  learnedCount: document.getElementById("learnedCount"),
  streakCount: document.getElementById("streakCount"),
  wrongCount: document.getElementById("wrongCount"),
  wordTotal: document.getElementById("wordTotal"),
  wordList: document.getElementById("wordList"),
  levelFilters: document.getElementById("levelFilters"),
  posFilters: document.getElementById("posFilters"),
  semanticFilters: document.getElementById("semanticFilters"),
  groupFilters: document.getElementById("groupFilters"),
  petDog: document.getElementById("petDog"),
  petVideo: document.getElementById("petVideo"),
  petPhoto: document.getElementById("petPhoto"),
  petName: document.getElementById("petName"),
  petLevel: document.getElementById("petLevel"),
  petProgress: document.getElementById("petProgress"),
  petMessage: document.getElementById("petMessage"),
  petTouchBtn: document.getElementById("petTouchBtn"),
  cardCategory: document.getElementById("cardCategory"),
  cardWord: document.getElementById("cardWord"),
  cardCn: document.getElementById("cardCn"),
  cardExample: document.getElementById("cardExample"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  speakBtn: document.getElementById("speakBtn"),
  knownBtn: document.getElementById("knownBtn"),
  choicePrompt: document.getElementById("choicePrompt"),
  choiceOptions: document.getElementById("choiceOptions"),
  choiceFeedback: document.getElementById("choiceFeedback"),
  sentencePrompt: document.getElementById("sentencePrompt"),
  sentenceHint: document.getElementById("sentenceHint"),
  sentenceOptions: document.getElementById("sentenceOptions"),
  sentenceFeedback: document.getElementById("sentenceFeedback"),
  wrongList: document.getElementById("wrongList"),
  clearWrong: document.getElementById("clearWrong"),
  wrongChoiceBtn: document.getElementById("wrongChoiceBtn"),
  wrongSentenceBtn: document.getElementById("wrongSentenceBtn"),
  wrongPractice: document.getElementById("wrongPractice"),
  wrongPracticeLabel: document.getElementById("wrongPracticeLabel"),
  wrongPrompt: document.getElementById("wrongPrompt"),
  wrongHint: document.getElementById("wrongHint"),
  wrongOptions: document.getElementById("wrongOptions"),
  wrongFeedback: document.getElementById("wrongFeedback"),
  readCard: document.getElementById("readCard"),
  readSentenceNo: document.getElementById("readSentenceNo"),
  readEnglish: document.getElementById("readEnglish"),
  readChinese: document.getElementById("readChinese"),
  readAttemptText: document.getElementById("readAttemptText"),
  readAverageText: document.getElementById("readAverageText"),
  readScoreProgress: document.getElementById("readScoreProgress"),
  readFeedback: document.getElementById("readFeedback"),
  readAttempts: document.getElementById("readAttempts"),
  prevSentenceBtn: document.getElementById("prevSentenceBtn"),
  nextSentenceBtn: document.getElementById("nextSentenceBtn"),
  sampleSentenceBtn: document.getElementById("sampleSentenceBtn"),
  recordSentenceBtn: document.getElementById("recordSentenceBtn"),
  reciteSentenceBtn: document.getElementById("reciteSentenceBtn"),
  finishReadingBtn: document.getElementById("finishReadingBtn"),
};

const levelLabels = { primary: "小学版", high: "高中版", read: "读句子" };
const READ_REQUIRED_ATTEMPTS = 10;
const RECITE_PASS_SCORE = 60;
const ASSET_VERSION = "51";
const GROUP_SIZE_BY_LEVEL = { primary: 10, high: 50 };
const petLevelNames = [
  "小奶狗",
  "萌萌狗",
  "淘淘狗",
  "活力狗",
  "阳光狗",
  "快乐狗",
  "运动狗",
  "探险狗",
  "守护狗",
  "王者狗",
];

function statFor(id) {
  if (!state.wordStats[id]) state.wordStats[id] = { studied: 0, quiz: 0, correct: 0, wrong: 0 };
  return state.wordStats[id];
}

function saveProgress() {
  localStorage.setItem("vocabTrainerMastered", JSON.stringify([...state.mastered]));
  localStorage.setItem("vocabTrainerWrong", JSON.stringify([...state.wrong]));
  localStorage.setItem("vocabTrainerStreaks", JSON.stringify(state.streaks));
  localStorage.setItem("vocabTrainerWordStats", JSON.stringify(state.wordStats));
  localStorage.setItem("vocabTrainerPets", JSON.stringify(state.pets));
  localStorage.setItem("vocabTrainerPetProgress", JSON.stringify(state.petProgress));
  localStorage.setItem("vocabTrainerReadChallenge", JSON.stringify(state.readChallenge));
}

function baseLevelWords() {
  return words.filter((item) => item.level === state.level);
}

function activePetLevel() {
  return state.level === "read" ? "primary" : state.level;
}

function currentGroupSize(level = state.level) {
  return GROUP_SIZE_BY_LEVEL[level] || 10;
}

function isHighLevel(level = state.level) {
  return level === "high";
}

function wordsAfterPos() {
  const list = baseLevelWords();
  return state.pos === "all" ? list : list.filter((item) => item.pos === state.pos);
}

function textOf(item) {
  return `${item.word} ${item.cn} ${item.pos} ${item.scene} ${item.category}`.toLowerCase();
}

function hasMeaning(item, enWords, zhPattern) {
  const word = mainWord(item).toLowerCase();
  const cn = String(item.cn || "");
  const enHit = enWords.some((entry) => {
    if (entry.endsWith("*")) return word.startsWith(entry.slice(0, -1));
    return word === entry;
  });
  return enHit || zhPattern.test(cn);
}

function semanticClass(item) {
  if (hasMeaning(item, ["run", "jump", "walk", "swim", "play", "sport", "ball", "dance", "sing", "ride", "fly", "climb", "throw", "catch", "race", "game", "team"], /跳|跑|走|游|玩|球|运动|比赛|唱|跳舞|骑|飞|队/)) return "运动动作";
  if (hasMeaning(item, ["read", "write", "learn", "study", "speak", "listen", "say", "tell", "ask", "answer", "teach", "book", "class", "school", "word", "language", "grammar", "exam", "test"], /读|写|学|说|听|问|答|教|书|课|学校|语言|语法|考试/)) return "学习表达";
  if (hasMeaning(item, ["eat", "drink", "food", "rice", "milk", "water", "apple", "bread", "cake", "breakfast", "lunch", "dinner", "meal", "fruit", "vegetable"], /吃|喝|饭|水|奶|苹果|面包|早餐|午餐|晚餐|食物|水果|蔬菜/)) return "饮食生活";
  if (hasMeaning(item, ["father", "mother", "brother", "sister", "friend", "teacher", "student", "family", "boy", "girl", "man", "woman", "people", "person", "child", "parent", "neighbor"], /父|母|兄|弟|姐|妹|朋友|老师|学生|家庭|男孩|女孩|人|孩子|父母|邻居/)) return "人物关系";
  if (hasMeaning(item, ["job", "work*", "doctor", "nurse", "driver", "farmer", "police", "leader", "manager", "officer", "president", "member"], /职业|工人|医生|护士|司机|农民|警察|领导|经理|官员|总统|成员/)) return "社会职业";
  if (hasMeaning(item, ["city", "country", "society", "culture", "history", "government", "community", "public", "village", "town", "festival"], /城市|国家|社会|文化|历史|政府|社区|公共|村庄|城镇|节日/)) return "社会文化";
  if (hasMeaning(item, ["money", "price", "buy", "sell", "pay", "cost", "market", "business", "bank", "trade", "law", "rule", "right", "duty"], /钱|价格|买|卖|支付|花费|市场|商业|银行|贸易|法律|规则|权利|责任/)) return "经济法律";
  if (hasMeaning(item, ["computer", "phone", "internet", "online", "technology", "science", "machine", "screen", "video", "photo", "message", "email"], /电脑|手机|互联网|在线|技术|科学|机器|屏幕|视频|照片|信息|邮件/)) return "科技媒体";
  if (hasMeaning(item, ["health", "ill", "sick", "pain", "medicine", "hospital", "body", "heart", "eye", "hand", "head", "face"], /健康|生病|疼痛|药|医院|身体|心脏|眼|手|头|脸/)) return "健康身体";
  if (hasMeaning(item, ["happy", "sad", "angry", "afraid", "love", "like", "hope", "want", "feel", "good", "bad", "worry", "surprise", "proud"], /高兴|伤心|生气|害怕|喜欢|希望|想要|感觉|好|坏|担心|惊讶|自豪/)) return "情感状态";
  if (hasMeaning(item, ["time", "day", "week", "year", "morning", "number", "one", "two", "first", "last", "before", "after", "early", "late", "once", "twice"], /时间|天|周|年|早上|数字|第一|最后|以前|以后|早|晚|一次|两次/)) return "时间数量";
  if (hasMeaning(item, ["sun", "moon", "star", "tree", "flower", "river", "sea", "rain", "snow", "wind", "animal", "dog", "cat", "earth", "mountain", "forest"], /自然|太阳|月亮|星|树|花|河|海|雨|雪|风|动物|狗|猫|地球|山|森林/)) return "自然动物";
  if (hasMeaning(item, ["bus", "car", "bike", "train", "plane", "road", "street", "left", "right", "up", "down", "place", "space", "near", "far"], /交通|汽车|公交|自行车|火车|飞机|路|街|左|右|上|下|里面|上面|下面|地方|空间|附近|远/)) return "交通方位";
  if (hasMeaning(item, ["pen", "pencil", "bag", "desk", "chair", "room", "door", "window", "clothes", "shoe", "tool", "box", "paper", "key"], /钢笔|铅笔|书包|桌|椅|房间|门|窗|衣|鞋|工具|盒|纸|钥匙/)) return "物品工具";
  if (hasMeaning(item, ["begin", "start", "stop", "finish", "change", "grow", "turn", "become", "develop", "improve", "increase", "reduce", "open", "close"], /开始|停止|完成|改变|成长|变成|发展|提高|增加|减少|打开|关闭/)) return "行为变化";
  if (hasMeaning(item, ["important", "necessary", "possible", "different", "same", "special", "common", "main", "true", "false", "easy", "difficult"], /重要|必要|可能|不同|相同|特别|普通|主要|真实|错误|容易|困难/)) return "程度评价";
  if (hasMeaning(item, ["because", "so", "if", "although", "but", "however", "therefore", "result", "cause", "reason", "effect", "example", "compare"], /逻辑|因为|所以|如果|虽然|但是|然而|因此|结果|原因|影响|例子|比较/)) return "逻辑关系";
  if (hasMeaning(item, ["idea", "problem", "question", "way", "thing", "life", "world", "mind", "dream", "plan", "choice"], /抽象|想法|问题|方法|事情|生活|世界|思想|梦想|计划|选择/)) return "抽象概念";
  return "通用基础";
}

function wordsAfterSemantic() {
  const list = wordsAfterPos();
  if (isHighLevel()) return state.semantic === "all" ? list : list.filter((item) => item.frequency === state.semantic);
  return state.semantic === "all" ? list : list.filter((item) => semanticClass(item) === state.semantic);
}

function displayClass(item) {
  return item.level === "high" ? item.frequency || "" : semanticClass(item);
}

function wordsBeforeGroup() {
  return wordsAfterSemantic();
}

function filteredWords() {
  const groupSize = currentGroupSize();
  const start = (state.group - 1) * groupSize;
  return wordsBeforeGroup().slice(start, start + groupSize);
}

function currentGroupKey() {
  const groupWords = filteredWords();
  return [state.level, groupWords.map((item) => item.id).join(",")].join("|");
}

function groupProgress() {
  const level = activePetLevel();
  const progress = state.petProgress[level] || { completedGroups: [], names: {} };
  if (!progress.groupTasks) progress.groupTasks = {};
  if (!Array.isArray(progress.completedGroups)) progress.completedGroups = [];
  state.petProgress[level] = progress;
  const key = currentGroupKey();
  if (!progress.groupTasks[key]) {
    progress.groupTasks[key] = { cards: false, choice: false, sentence: false, choicePasses: 0, sentencePasses: 0, rewardedPairs: 0 };
  }
  return { progress, key, tasks: progress.groupTasks[key] };
}

function currentGroupCardDone() {
  const groupWords = filteredWords();
  return groupWords.length === currentGroupSize() && groupWords.every((item) => state.mastered.has(item.id));
}

function ensureLevelGroupCount(progress, targetLevel = state.level) {
  const levelIds = new Set(words.filter((item) => item.level === targetLevel).map((item) => item.id));
  const groupSize = currentGroupSize(targetLevel);
  const masteredLevelGroups = Math.floor([...state.mastered].filter((id) => levelIds.has(id)).length / groupSize);
  progress.legacyLevelGroupCount = Math.max(Number(progress.legacyLevelGroupCount || 0), masteredLevelGroups);
  if (!Number.isFinite(progress.levelGroupCount)) {
    const completedGroups = Array.isArray(progress.completedGroups) ? progress.completedGroups : [];
    const uniqueGroups = new Set(
      completedGroups.filter((key) => {
        const ids = String(key).split("|")[1]?.split(",") || [];
        return ids.length === groupSize;
      })
    );
    progress.levelGroupCount = Math.max(Number(progress.legacyLevelGroupCount || 0), uniqueGroups.size);
  }
  progress.levelGroupCount = Math.max(Number(progress.levelGroupCount || 0), Number(progress.legacyLevelGroupCount || 0));
  return progress.levelGroupCount;
}

function markGroupTask(task, score = 100) {
  const { progress, key, tasks } = groupProgress();
  ensureLevelGroupCount(progress, state.level);
  if (task === "cards") {
    tasks.cards = currentGroupCardDone();
  } else if (["choice", "sentence"].includes(task) && score >= 60) {
    tasks[task] = true;
    const passKey = `${task}Passes`;
    tasks[passKey] = Number(tasks[passKey] || 0) + 1;
  }
  const pairs = Math.min(Number(tasks.choicePasses || 0), Number(tasks.sentencePasses || 0));
  if (pairs > Number(tasks.rewardedPairs || 0)) {
    const gained = pairs - Number(tasks.rewardedPairs || 0);
    tasks.rewardedPairs = pairs;
    progress.levelGroupCount = Number(progress.levelGroupCount || 0) + gained;
    progress.completedGroups.push(`${key}#${Date.now()}#${pairs}`);
    const pet = activePet();
    pet.lastFedAt = Date.now();
    renderPet();
  }
  saveProgress();
}

function addLevelGroup(reason = "manual", targetLevel = state.level) {
  const progress = state.petProgress[targetLevel] || { completedGroups: [], names: {} };
  if (!Array.isArray(progress.completedGroups)) progress.completedGroups = [];
  state.petProgress[targetLevel] = progress;
  ensureLevelGroupCount(progress, targetLevel);
  progress.levelGroupCount = Number(progress.levelGroupCount || 0) + 1;
  progress.completedGroups.push(`${targetLevel}|${reason}|${Date.now()}`);
  const pet = state.pets[targetLevel] || { feed: 0, lastFedAt: 0 };
  pet.lastFedAt = Date.now();
  state.pets[targetLevel] = pet;
  saveProgress();
  if (targetLevel === activePetLevel()) renderPet();
}

function activeWord() {
  const list = filteredWords();
  if (!list.length) return null;
  state.index = Math.max(0, Math.min(state.index, list.length - 1));
  return list[state.index];
}

function uniqueValues(list, key) {
  return [...new Set(list.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function uniqueComputedValues(list, getter) {
  return [...new Set(list.map(getter).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function splitPhonics(word) {
  const parts = String(word).match(/[^aeiouy\s-]*[aeiouy]+(?:[^aeiouy\s-](?![aeiouy]))?|[^aeiouy\s-]+|\s+|-/gi);
  return parts && parts.length ? parts : [word];
}

function renderPhonics(word) {
  return splitPhonics(word)
    .map((part, index) => {
      if (/^\s+$/.test(part)) return " ";
      if (part === "-") return `<span class="phonics-sep">-</span>`;
      return `<span class="phonics-part tone-${(index % 4) + 1}">${escapeHtml(part)}</span>`;
    })
    .join("");
}

function mainWord(item) {
  return item.word.split("/")[0].trim();
}

function articleFor(word) {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function sceneContext(item) {
  const semantic = semanticClass(item);
  if (semantic === "学习表达") return "in class";
  if (semantic === "运动动作") return "after school";
  if (semantic === "饮食生活") return "at home";
  if (semantic === "人物关系") return "at school";
  if (semantic === "情感状态") return "during the talk";
  if (semantic === "时间数量") return "this morning";
  if (semantic === "自然动物") return "in the park";
  if (semantic === "交通方位") return "on the way to school";
  if (semantic === "物品工具") return "on the desk";
  return "every day";
}

const commonUsage = {
  jump: {
    phrases: ["jump rope", "jump high", "jump over the box"],
    examples: ["The boy jumps rope after school.", "We jump high in P.E. class.", "I jump over the line in the playground."],
  },
  run: {
    phrases: ["run fast", "run to school", "run in the playground"],
    examples: ["The students run in the playground.", "I run to the bus stop in the morning.", "My brother runs fast in the race."],
  },
  high: {
    phrases: ["jump high", "fly high", "a high wall"],
    examples: ["The kite flies high in the sky.", "Can you jump high?", "The wall is high."],
  },
  far: {
    phrases: ["far away", "far from school", "not far from here"],
    examples: ["My home is far from school.", "The park is not far from here.", "We can see a mountain far away."],
  },
  sport: {
    phrases: ["play a sport", "do sports", "my favorite sport"],
    examples: ["My favorite sport is basketball.", "We play a sport after school.", "What sport do you like?"],
  },
  "ping-pong": {
    phrases: ["play ping-pong", "a ping-pong ball", "a ping-pong game"],
    examples: ["We play ping-pong after school.", "I like ping-pong.", "This is a ping-pong ball."],
  },
  volleyball: {
    phrases: ["play volleyball", "a volleyball game", "a volleyball team"],
    examples: ["We play volleyball in P.E. class.", "I like volleyball.", "Our class has a volleyball game."],
  },
  across: {
    phrases: ["walk across the street", "across from the school", "go across the bridge"],
    examples: ["We walk across the street.", "The shop is across from the school.", "They go across the bridge."],
  },
  walk: {
    phrases: ["walk to school", "walk home", "walk in the park"],
    examples: ["I walk to school with my friend.", "We walk in the park after dinner.", "The girl walks home after class."],
  },
  play: {
    phrases: ["play football", "play games", "play the piano"],
    examples: ["We play football after school.", "I play games with my brother.", "She plays the piano at home."],
  },
  swim: {
    phrases: ["swim in the pool", "swim fast"],
    examples: ["I swim in the pool on Sunday.", "The boy swims fast in the race."],
  },
  read: {
    phrases: ["read a book", "read English", "read a story"],
    examples: ["I read a book before bed.", "She reads English in the morning.", "We read a story in class."],
  },
  write: {
    phrases: ["write a letter", "write a sentence", "write homework"],
    examples: ["I write a sentence in my notebook.", "He writes a letter to his friend.", "We write homework after class."],
  },
  draw: {
    phrases: ["draw a picture", "draw a cat"],
    examples: ["I draw a picture in art class.", "She draws a cat on the paper."],
  },
  sing: {
    phrases: ["sing a song", "sing loudly"],
    examples: ["We sing a song in music class.", "The girl sings loudly on the stage."],
  },
  dance: {
    phrases: ["dance to music", "dance well"],
    examples: ["They dance to music after school.", "My sister dances well at the party."],
  },
  eat: {
    phrases: ["eat breakfast", "eat an apple", "eat lunch"],
    examples: ["I eat breakfast at home.", "She eats an apple after lunch.", "We eat lunch at school."],
  },
  drink: {
    phrases: ["drink water", "drink milk"],
    examples: ["I drink water after running.", "The baby drinks milk in the morning."],
  },
  sleep: {
    phrases: ["sleep well", "sleep at night"],
    examples: ["I sleep well at night.", "The child sleeps in his bedroom."],
  },
  learn: {
    phrases: ["learn English", "learn a word", "learn from mistakes"],
    examples: ["I learn English at school.", "We learn a new word every day.", "She learns from her mistakes."],
  },
  study: {
    phrases: ["study English", "study hard"],
    examples: ["I study English after school.", "The students study hard before the test."],
  },
  help: {
    phrases: ["help my mother", "help a friend", "help with homework"],
    examples: ["I help my mother at home.", "He helps a friend with homework.", "We help the teacher in class."],
  },
  make: {
    phrases: ["make a cake", "make a card", "make friends"],
    examples: ["I make a card for my mother.", "They make friends at school.", "She makes a cake in the kitchen."],
  },
  do: {
    phrases: ["do homework", "do housework", "do sports"],
    examples: ["I do homework after dinner.", "We do sports on Friday.", "He does housework at home."],
  },
  have: {
    phrases: ["have breakfast", "have a class", "have a look"],
    examples: ["I have breakfast at seven.", "We have an English class today.", "She has a look at the picture."],
  },
  like: {
    phrases: ["like apples", "like music", "like playing football"],
    examples: ["I like apples very much.", "She likes music after school.", "They like playing football."],
  },
  see: {
    phrases: ["see a bird", "see a film", "see a doctor"],
    examples: ["I see a bird in the tree.", "We see a film on Sunday.", "He sees a doctor when he is ill."],
  },
  watch: {
    phrases: ["watch TV", "watch a game", "watch a film"],
    examples: ["I watch TV after dinner.", "We watch a football game on Saturday.", "She watches a film with her family."],
  },
  listen: {
    phrases: ["listen to music", "listen to the teacher"],
    examples: ["I listen to music at home.", "The students listen to the teacher in class."],
  },
  speak: {
    phrases: ["speak English", "speak loudly"],
    examples: ["I speak English in class.", "Please speak loudly in the room."],
  },
  open: {
    phrases: ["open the door", "open the book"],
    examples: ["I open the book in class.", "She opens the door for her father."],
  },
  close: {
    phrases: ["close the door", "close the window"],
    examples: ["I close the window at night.", "He closes the door after class."],
  },
  put: {
    phrases: ["put the book on the desk", "put on a coat"],
    examples: ["I put the book on the desk.", "She puts on a coat before going out."],
  },
  take: {
    phrases: ["take a bus", "take a photo", "take a book"],
    examples: ["I take a bus to school.", "We take a photo in the park.", "He takes a book from the desk."],
  },
  give: {
    phrases: ["give a gift", "give me a book"],
    examples: ["My friend gives me a book.", "I give a gift to my sister."],
  },
};

function phrasesFor(item) {
  if (Array.isArray(item.phrases) && item.phrases.length) return item.phrases.slice(0, 3);
  const rawWord = mainWord(item);
  const word = rawWord.toLowerCase();
  if (commonUsage[word]) return commonUsage[word].phrases.slice(0, 3);
  if (item.pos === "动词") return [`${rawWord} a problem`, `${rawWord} the work`, `${rawWord} a plan`];
  if (item.pos === "名词") return [`${articleFor(rawWord)} ${rawWord}`, `the ${rawWord}`];
  if (item.pos === "形容词") return [`${articleFor(rawWord)} ${rawWord} idea`, `${rawWord} enough`];
  if (item.pos === "副词") return [`work ${rawWord}`, `speak ${rawWord}`];
  if (item.pos === "介词") return [`${rawWord} the room`, `${rawWord} the desk`];
  if (item.pos === "连词") return [`A ${rawWord} B`];
  if (item.pos === "情态动词") return [`${rawWord} finish it`, `${rawWord} be useful`];
  return [];
}

function examplesFor(item) {
  if (Array.isArray(item.examples) && item.examples.length) return item.examples.slice(0, 3);
  const word = mainWord(item);
  const key = word.toLowerCase();
  if (commonUsage[key]) return commonUsage[key].examples.slice(0, 3);
  const context = sceneContext(item);
  const cn = String(item.cn || "").replace(/[，。；、].*$/, "");
  if (item.pos === "动词") {
    return [
      `I can ${word} after class.`,
      `We ${word} at school.`,
      `Please ${word} with me.`,
    ];
  }
  if (item.pos === "名词") {
    return [
      `I like ${word}.`,
      `We learn about ${word} in class.`,
      `This ${word} is useful.`,
    ];
  }
  if (item.pos === "形容词") {
    return [
      `It is ${word}.`,
      `The answer is ${word}.`,
      `This book is ${word}.`,
    ];
  }
  if (item.pos === "副词") {
    return [
      `Please speak ${word}.`,
      `She runs ${word}.`,
      `We work ${word}.`,
    ];
  }
  if (item.pos === "介词") return [`The ball is ${word} the box.`, `I walk ${word} the park.`, `The bag is ${word} the desk.`];
  if (item.pos === "情态动词") return [`I ${word} read this word.`, `We ${word} finish it today.`, `She ${word} join us after school.`];
  if (item.pos === "代词") return [`${word} is my friend.`, `The teacher asks ${word} to answer.`, `I give ${word} a book.`];
  if (item.pos === "连词") return [`I like apples ${word} bananas.`, `Read the word ${word} write it down.`, `I stay home ${word} it rains.`];
  if (item.pos === "冠词") return [`${word} student asks a question.`, `I see ${word} picture.`, `This is ${word} apple.`];
  return [`I use ${word} every day.`, `We choose ${word} here.`, `The word means "${cn}".`];
}

function mainMeaning(item) {
  return String(item.cn || "")
    .replace(/[（(].*?[）)]/g, "")
    .split(/[；;，,、]/)[0]
    .trim();
}

function pronounTranslation(word, meaning) {
  const key = String(word || "").toLowerCase();
  const map = {
    i: "我",
    me: "我",
    my: "我的",
    mine: "我的",
    you: "你",
    your: "你的",
    yours: "你的",
    he: "他",
    him: "他",
    his: "他的",
    she: "她",
    her: "她的",
    hers: "她的",
    it: "它",
    its: "它的",
    we: "我们",
    us: "我们",
    our: "我们的",
    ours: "我们的",
    they: "他们",
    them: "他们",
    their: "他们的",
    theirs: "他们的",
    this: "这个",
    that: "那个",
    these: "这些",
    those: "那些",
    anybody: "任何人",
    anyone: "任何人",
    everybody: "每个人",
    everyone: "每个人",
    somebody: "某人",
    someone: "某人",
    nobody: "没有人",
    noone: "没有人",
  };
  return map[key] || meaning;
}

function sentenceTranslationFor(item, example) {
  if (Array.isArray(item.translations) && item.translations.length) {
    const examples = examplesFor(item);
    const index = examples.indexOf(example);
    return item.translations[index >= 0 ? index : 0] || item.translations[0];
  }
  const meaning = mainMeaning(item) || item.cn || item.word;
  const pronoun = pronounTranslation(item.word, meaning);
  const lower = example.toLowerCase();

  const exact = {
    "the answer is written on the board.": "答案写在黑板上。",
    "we visited the museum on the first day.": "第一天我们参观了博物馆。",
    "a useful tool can save time.": "一个有用的工具可以节省时间。",
    "an important idea should be explained clearly.": "一个重要的想法应该解释清楚。",
    "many students go to school by bus.": "许多学生乘公共汽车去上学。",
    "she listens to music after finishing homework.": "她完成作业后听音乐。",
    "the report is ready for the meeting.": "这份报告已为会议准备好了。",
    "a clear goal is important for success.": "清晰的目标对成功很重要。",
    "bread and milk are on the table.": "面包和牛奶在桌子上。",
    "students read and write in english class.": "学生们在英语课上读写。",
    "it seems difficult at first.": "起初它看起来很难。",
    "practice makes it easier.": "练习会让它变得更容易。",
  };
  if (exact[lower]) return exact[lower];

  const patterns = [
    [/^(.+) are part of a healthy (.+)\.$/i, () => `${meaning}是健康生活的一部分。`],
    [/^he goes on a diet to stay healthy\.$/i, () => "他节食以保持健康。"],
    [/^healthy food gives us energy\.$/i, () => "健康食物给我们能量。"],
    [/^fast food is not good every day\.$/i, () => "每天吃快餐并不好。"],
    [/^we enjoyed a warm (.+) after class\.$/i, () => `课后我们享用了一顿温暖的${meaning}。`],
    [/^a good (.+) can make people happy\.$/i, () => `好的${meaning}能让人开心。`],
    [/^i have (.+) at seven\.$/i, () => `我七点吃${meaning}。`],
    [/^she eats (.+) with her family\.$/i, () => `她和家人一起吃${meaning}。`],
    [/^we have (.+) at school\.$/i, () => `我们在学校吃${meaning}。`],
    [/^(.+) time is at twelve\.$/i, () => `${meaning}时间在十二点。`],
    [/^we have (.+) at home\.$/i, () => `我们在家吃${meaning}。`],
    [/^my father cooks (.+) today\.$/i, () => `我爸爸今天做${meaning}。`],
    [/^i like (.+)\.$/i, () => `我喜欢${meaning}。`],
    [/^we have (.+) for lunch\.$/i, () => `我们午餐吃${meaning}。`],
    [/^mom puts (.+) on the table\.$/i, () => `妈妈把${meaning}放在桌子上。`],
    [/^we share (.+) after class\.$/i, () => `课后我们分享${meaning}。`],
    [/^there is (.+) in my lunch box\.$/i, () => `我的午餐盒里有${meaning}。`],
    [/^my sister wants more (.+)\.$/i, () => `我妹妹还想要更多${meaning}。`],
    [/^this (.+) is fresh\.$/i, () => `这个${meaning}很新鲜。`],
    [/^please pass me (.+)\.$/i, () => `请把${meaning}递给我。`],
    [/^this (.+) fits me well\.$/i, () => `这件${meaning}很适合我。`],
    [/^she wears (.+) on cold days\.$/i, () => `她在冷天穿${meaning}。`],
    [/^put (.+) on the chair\.$/i, () => `把${meaning}放在椅子上。`],
    [/^my brother bought (.+) yesterday\.$/i, () => `我哥哥昨天买了${meaning}。`],
    [/^my (.+) hurts a little\.$/i, () => `我的${meaning}有点疼。`],
    [/^wash your (.+) before dinner\.$/i, () => `晚饭前洗你的${meaning}。`],
    [/^the doctor checks (.+)\.$/i, () => `医生检查${meaning}。`],
    [/^the teacher explained (.+) before class ended\.$/i, () => `下课前老师讲解了${meaning}。`],
    [/^students wrote (.+) in their notebooks\.$/i, () => `学生们把${meaning}写在笔记本里。`],
    [/^students (.+) the new material before the test\.$/i, () => `考试前学生们学习新材料中的${meaning}。`],
    [/^the teacher asked us to (.+) carefully\.$/i, () => `老师要求我们认真${meaning}。`],
    [/^the team discussed (.+) at the meeting\.$/i, () => `团队在会议上讨论了${meaning}。`],
    [/^a clear (.+) helped the project move faster\.$/i, () => `清晰的${meaning}帮助项目进展更快。`],
    [/^the article discusses (.+) in modern society\.$/i, () => `这篇文章讨论了现代社会中的${meaning}。`],
    [/^people have different opinions about (.+)\.$/i, () => `人们对${meaning}有不同看法。`],
    [/^the children observed (.+) during the field trip\.$/i, () => `孩子们在实地考察中观察了${meaning}。`],
    [/^protecting (.+) is important for the environment\.$/i, () => `保护${meaning}对环境很重要。`],
    [/^the doctor asked about (.+) during the checkup\.$/i, () => `体检时医生询问了${meaning}。`],
    [/^regular exercise can improve (.+)\.$/i, () => `规律锻炼可以改善${meaning}。`],
    [/^the passage uses (.+) to explain the idea\.$/i, () => `这篇文章用${meaning}来解释这个想法。`],
    [/^context helps readers understand (.+)\.$/i, () => `上下文帮助读者理解${meaning}。`],
    [/^the story shows (.+) through a small detail\.$/i, () => `这个故事通过一个小细节表现了${meaning}。`],
    [/^her speech gave us a clear sense of (.+)\.$/i, () => `她的演讲让我们清楚感受到${meaning}。`],
    [/^you can notice (.+) in daily life\.$/i, () => `你可以在日常生活中注意到${meaning}。`],
    [/^the writer chose (.+) for comparison\.$/i, () => `作者选择${meaning}来进行比较。`],
    [/^the class raised a question about (.+)\.$/i, () => `课堂上提出了一个关于${meaning}的问题。`],
    [/^the role of (.+) changes in different situations\.$/i, () => `${meaning}的作用在不同情境中会变化。`],
    [/^the report described recent (.+)\.$/i, () => `报告描述了最近的${meaning}。`],
    [/^a new (.+) appeared in the final paragraph\.$/i, () => `最后一段出现了新的${meaning}。`],
    [/^this example is (.+) enough for beginners\.$/i, () => `这个例子对初学者来说足够${meaning}。`],
    [/^the answer seemed (.+) after the explanation\.$/i, () => `解释之后，答案似乎很${meaning}。`],
    [/^the website provides (.+) information\.$/i, () => `这个网站提供${meaning}信息。`],
    [/^they discussed (.+) problem in groups\.$/i, () => `他们分组讨论了一个${meaning}问题。`],
    [/^(.+) answer surprised the class\.$/i, () => `${pronoun}回答让全班很惊讶。`],
    [/^the teacher asked (.+) to explain the idea\.$/i, () => `老师让${pronoun}解释这个想法。`],
    [/^(.+) idea surprised the class\.$/i, () => `${pronoun}想法让全班很惊讶。`],
    [/^(.+) own way/i, () => `${pronoun}自己的方式。`],
  ];

  const hit = patterns.find(([pattern]) => pattern.test(example));
  if (hit) return hit[1]();
  return `这句话表达的是“${meaning}”在具体语境中的用法。`;
}

function sentenceQuestionFor(item, variant = 0) {
  const word = mainWord(item);
  const examples = examplesFor(item);
  const example = examples[variant % examples.length] || `Students use ${word} every day.`;
  const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const prompt = pattern.test(example) ? example.replace(pattern, "___") : item.level === "high" ? `${example} ___` : `${example} (${item.cn}: ___)`;
  return {
    prompt,
    translation: `整句翻译：${sentenceTranslationFor(item, example)}`,
    hint: `选择合适的单词：${item.cn}`,
  };
}

function resetQuizBatches() {
  state.queues.choice = [];
  state.queues.sentence = [];
  state.batchDone.choice = false;
  state.batchDone.sentence = false;
  state.batchStarted.choice = false;
  state.batchStarted.sentence = false;
  state.batchRewarded.choice = false;
  state.batchRewarded.sentence = false;
  state.batchStats.choice = { total: 0, correct: 0, wrong: 0 };
  state.batchStats.sentence = { total: 0, correct: 0, wrong: 0 };
  state.currentQuiz = null;
}

function updateFilter(next) {
  Object.assign(state, next);
  if (state.level === "read") {
    state.mode = "read100";
  } else if (state.mode === "read100") {
    state.mode = "cards";
  }
  state.index = 0;
  state.currentCardId = null;
  resetQuizBatches();
  render();
  refreshPractice();
}

function makeChip(container, label, active, onClick, extraClass = "") {
  const button = document.createElement("button");
  button.className = `chip ${active ? "active" : ""} ${extraClass}`;
  button.textContent = label;
  button.addEventListener("click", onClick);
  container.appendChild(button);
}

function renderFilters() {
  els.levelFilters.innerHTML = "";
  Object.entries(levelLabels).forEach(([value, label]) => {
    const count = value === "read" ? sentenceChallenges.length : words.filter((item) => item.level === value).length;
    makeChip(els.levelFilters, `${label} ${count}`, state.level === value, () => updateFilter({ level: value, pos: "all", semantic: "all", group: 1 }));
  });

  const readingMode = state.level === "read";
  document.querySelectorAll(".word-only-filter").forEach((block) => {
    block.hidden = readingMode;
  });
  document.querySelector(".word-list").hidden = readingMode;
  document.querySelector(".study-layout").classList.toggle("reading-layout", readingMode);
  if (readingMode) {
    els.posFilters.innerHTML = "";
    els.semanticFilters.innerHTML = "";
    els.groupFilters.innerHTML = "";
    return;
  }

  const levelWords = baseLevelWords();
  if (els.semanticFilters.previousElementSibling) {
    els.semanticFilters.previousElementSibling.textContent = isHighLevel() ? "频次" : "语义分类";
  }
  els.posFilters.innerHTML = "";
  makeChip(els.posFilters, "全部词性", state.pos === "all", () => updateFilter({ pos: "all", semantic: "all", group: 1 }));
  uniqueValues(levelWords, "pos").forEach((pos) => {
    const count = levelWords.filter((item) => item.pos === pos).length;
    makeChip(els.posFilters, `${pos} ${count}`, state.pos === pos, () => updateFilter({ pos, semantic: "all", group: 1 }));
  });

  const posWords = wordsAfterPos();
  els.semanticFilters.innerHTML = "";
  if (isHighLevel()) {
    makeChip(els.semanticFilters, "全部频次", state.semantic === "all", () => updateFilter({ semantic: "all", group: 1 }));
    ["高频词", "中频词", "低频词"].filter((frequency) => posWords.some((item) => item.frequency === frequency)).forEach((frequency) => {
      const count = posWords.filter((item) => item.frequency === frequency).length;
      makeChip(els.semanticFilters, `${frequency} ${count}`, state.semantic === frequency, () => updateFilter({ semantic: frequency, group: 1 }));
    });
  } else {
    makeChip(els.semanticFilters, "全部语义", state.semantic === "all", () => updateFilter({ semantic: "all", group: 1 }));
    uniqueComputedValues(posWords, semanticClass).forEach((semantic) => {
      const count = posWords.filter((item) => semanticClass(item) === semantic).length;
      makeChip(els.semanticFilters, `${semantic} ${count}`, state.semantic === semantic, () => updateFilter({ semantic, group: 1 }));
    });
  }

  const groupedWords = wordsBeforeGroup();
  const groupSize = currentGroupSize();
  const groupCount = Math.max(1, Math.ceil(groupedWords.length / groupSize));
  if (state.group > groupCount) state.group = groupCount;
  els.groupFilters.innerHTML = "";
  for (let group = 1; group <= groupCount; group += 1) {
    const groupWords = groupedWords.slice((group - 1) * groupSize, group * groupSize);
    const start = groupedWords.length ? (group - 1) * groupSize + 1 : 0;
    const end = Math.min(group * groupSize, groupedWords.length);
    const done = groupWords.length > 0 && groupWords.every((item) => state.mastered.has(item.id));
    makeChip(els.groupFilters, `第${group}组 ${start}-${end}`, state.group === group, () => updateFilter({ group }), done ? "done" : "");
  }
}

function updateStats() {
  const statsLevel = activePetLevel();
  const levelWords = words.filter((item) => item.level === statsLevel);
  const levelIds = new Set(levelWords.map((item) => item.id));
  els.learnedCount.textContent = [...state.mastered].filter((id) => levelIds.has(id)).length;
  els.streakCount.textContent = levelWords.reduce((sum, item) => sum + Number(statFor(item.id).correct || 0), 0);
  els.wrongCount.textContent = [...state.wrong].filter((id) => levelIds.has(id)).length;
}

function activePet() {
  const level = activePetLevel();
  if (!state.pets[level]) state.pets[level] = { feed: 0, lastFedAt: 0 };
  return state.pets[level];
}

function activePetMeta(growth = 1) {
  const defaultName = "单词小狗";
  const name = petLevelNames[growth - 1] || defaultName;
  return { name, defaultName, typeClass: "pet-dog", sleepText: "小狗睡着了", imageDir: "dog", imagePrefix: "dog" };
}

function completedGroupCount() {
  const level = activePetLevel();
  const progress = state.petProgress[level];
  if (!progress) return 0;
  const count = ensureLevelGroupCount(progress, level);
  saveProgress();
  return count;
}

function petRank() {
  const count = completedGroupCount();
  const rankIndex = Math.min(20, Math.max(1, count + 1));
  return {
    growth: Math.floor((rankIndex - 1) / 10) + 1,
    level: ((rankIndex - 1) % 10) + 1,
    completed: count,
  };
}

function petVitality() {
  const lastFedAt = Number(activePet().lastFedAt || 0);
  if (!lastFedAt) return 0;
  const hours = (Date.now() - lastFedAt) / 36e5;
  if (hours >= 48) return 0;
  if (hours >= 24) return Math.round(50 * (1 - (hours - 24) / 24));
  return Math.round(100 - 50 * (hours / 24));
}

function petStageIndex(level) {
  if (level >= 9) return 4;
  if (level >= 7) return 3;
  if (level >= 5) return 2;
  if (level >= 3) return 1;
  return 0;
}

function gifDurationMs(buffer) {
  const bytes = new Uint8Array(buffer);
  let offset = 13;
  let duration = 0;
  const packed = bytes[10] || 0;
  if (packed & 0x80) offset += 3 * (2 ** ((packed & 0x07) + 1));

  while (offset < bytes.length) {
    const block = bytes[offset++];
    if (block === 0x3b) break;
    if (block === 0x21) {
      const label = bytes[offset++];
      if (label === 0xf9 && bytes[offset] === 4) {
        const delay = bytes[offset + 2] | (bytes[offset + 3] << 8);
        duration += (delay || 10) * 10;
      }
      while (offset < bytes.length) {
        const size = bytes[offset++];
        if (!size) break;
        offset += size;
      }
      continue;
    }
    if (block === 0x2c) {
      offset += 8;
      const imagePacked = bytes[offset++] || 0;
      if (imagePacked & 0x80) offset += 3 * (2 ** ((imagePacked & 0x07) + 1));
      offset += 1;
      while (offset < bytes.length) {
        const size = bytes[offset++];
        if (!size) break;
        offset += size;
      }
    }
  }

  return duration;
}

const gifDurationCache = new Map();
const touchGifFallbackDuration = 10040;
let petTouchRun = 0;

function getGifDuration(src) {
  const cleanSrc = src.split("?")[0];
  if (!gifDurationCache.has(cleanSrc)) {
    gifDurationCache.set(
      cleanSrc,
      fetch(cleanSrc)
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error("GIF load failed"))))
        .then(gifDurationMs)
    );
  }
  return gifDurationCache.get(cleanSrc);
}

function renderPet() {
  const rank = petRank();
  const meta = activePetMeta(rank.growth);
  const vitality = petVitality();
  const asleep = vitality <= 0;
  const lively = vitality >= 70;
  const stage = petStageIndex(rank.level);
  els.petDog.className = `${meta.typeClass} stage-${stage} ${asleep ? "asleep" : ""} ${lively ? "lively" : ""}`;
  els.petVideo.hidden = true;
  els.petVideo.pause();
  els.petVideo.removeAttribute("src");

  if (meta.imageDir) {
    const petSrc = `./${meta.imageDir}/${meta.imagePrefix}${rank.growth}-${rank.level}.jpg?v=${ASSET_VERSION}`;
    els.petPhoto.hidden = false;
    els.petPhoto.onerror = null;
    els.petPhoto.onload = () => {
      els.petPhoto.hidden = false;
    };
    els.petPhoto.onerror = () => {
      els.petPhoto.hidden = true;
    };
    els.petPhoto.src = petSrc;
  } else {
    els.petPhoto.hidden = true;
    els.petPhoto.removeAttribute("src");
  }
  els.petName.textContent = meta.name;
  els.petLevel.textContent = `成长 ${rank.growth} · 等级 ${rank.level}/10 · ${asleep ? "睡觉中" : lively ? "活力充足" : "安静待机"}`;
  els.petProgress.style.width = `${rank.level * 10}%`;
  els.petMessage.textContent = asleep
    ? `达标升级 ${rank.completed} 次。超过 48 小时未完成本学段题组，${meta.sleepText}。`
    : `达标升级 ${rank.completed} 次，活力 ${vitality}%。中选英、单选题都达到 60 分后升 1 级。`;
}

function touchPet() {
  const runId = (petTouchRun += 1);
  const rank = petRank();
  const videoSrc = `./dog/dog${rank.growth}-1.mp4?t=${Date.now()}`;
  const gifSrc = `./dog/dog${rank.growth}-1.gif`;
  const fallbackGifSrc = "./dog/dog1-1.gif";

  const clearVideoEvents = () => {
    els.petVideo.onloadeddata = null;
    els.petVideo.onended = null;
    els.petVideo.onerror = null;
  };
  const restorePet = () => {
    if (runId !== petTouchRun) return;
    clearVideoEvents();
    renderPet();
  };
  const playGifFallback = () => {
    if (runId !== petTouchRun) return;
    clearVideoEvents();
    els.petVideo.hidden = true;
    els.petVideo.pause();
    els.petVideo.removeAttribute("src");
    els.petPhoto.hidden = false;
    els.petPhoto.src = `${gifSrc}?t=${Date.now()}`;
    els.petPhoto.onerror = () => {
      els.petPhoto.onerror = null;
      els.petPhoto.src = `${fallbackGifSrc}?t=${Date.now()}`;
    };
    getGifDuration(gifSrc)
      .then((duration) => {
        setTimeout(restorePet, duration || touchGifFallbackDuration);
      })
      .catch(() => {
        setTimeout(restorePet, touchGifFallbackDuration);
      });
  };

  els.petVideo.hidden = true;
  els.petVideo.loop = false;
  els.petVideo.muted = true;
  els.petVideo.playsInline = true;
  els.petVideo.onloadeddata = () => {
    if (runId !== petTouchRun) return;
    els.petPhoto.hidden = true;
    els.petVideo.hidden = false;
    els.petVideo.currentTime = 0;
    els.petVideo.play().catch(playGifFallback);
  };
  els.petVideo.onended = restorePet;
  els.petVideo.onerror = playGifFallback;
  els.petVideo.src = videoSrc;
  els.petVideo.load();
}

function recordCardStudy(item) {
  if (!item || state.currentCardId === item.id) return;
  state.currentCardId = item.id;
  statFor(item.id).studied += 1;
  saveProgress();
}

function renderWordList() {
  const list = filteredWords();
  const total = wordsBeforeGroup().length;
  els.wordTotal.textContent = `本组 ${list.length} 个 / 筛选 ${total} 个`;
  els.wordList.innerHTML = "";
  if (!list.length) {
    els.wordList.innerHTML = `<div class="empty-state">当前筛选下没有单词。</div>`;
    return;
  }

  list.forEach((item, position) => {
    const stats = statFor(item.id);
    const button = document.createElement("button");
    button.className = `word-item ${position === state.index ? "active" : ""} ${state.mastered.has(item.id) ? "mastered" : ""}`;
    button.innerHTML = `
      <div>
        <strong>${escapeHtml(item.word)}</strong>
        <span>${escapeHtml(item.cn)} · ${escapeHtml(item.pos)} · ${escapeHtml(displayClass(item))}</span>
        <span>记 ${stats.studied} 次 · 题 ${stats.quiz} 次 · 对 ${stats.correct} · 错 ${stats.wrong}</span>
      </div>
      <i class="mastered-dot"></i>
    `;
    button.addEventListener("click", () => {
      state.index = position;
      state.currentCardId = null;
      render();
      speak(item.word);
    });
    els.wordList.appendChild(button);
  });
}

function renderCard() {
  const item = activeWord();
  if (!item) {
    els.cardCategory.textContent = "";
    els.cardWord.textContent = "-";
    els.cardCn.textContent = "请调整筛选条件";
    els.cardExample.textContent = "";
    return;
  }

  recordCardStudy(item);
  const stats = statFor(item.id);
  const phrases = phrasesFor(item);
  const examples = examplesFor(item);
  const phraseHtml = phrases.length
    ? `<span class="phrase-line"><b>短语:</b> ${phrases.map(escapeHtml).join(" / ")}</span>`
    : "";
  const exampleHtml = examples
    .map((example, index) => `<span class="example-line"><b>${index === 0 ? "例句:" : ""}</b> ${escapeHtml(example)}</span>`)
    .join("");
  els.cardCategory.textContent = "";
  els.cardWord.innerHTML = renderPhonics(item.word);
  els.cardCn.textContent = item.cn;
  els.cardExample.innerHTML = `
    ${phraseHtml}
    ${exampleHtml}
    <span class="progress-line">记 ${stats.studied} 次 · 做题 ${stats.quiz} 次 · 对 ${stats.correct} · 错 ${stats.wrong}</span>
  `;
}

function candidatePoolForOptions(answer) {
  const sameScope = filteredWords();
  const samePos = baseLevelWords().filter((item) => item.pos === answer.pos);
  if (sameScope.length >= 4) return sameScope;
  if (samePos.length >= 4) return samePos;
  return baseLevelWords();
}

function sampleOptions(answer) {
  const pool = candidatePoolForOptions(answer)
    .filter((item) => item.id !== answer.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  return [answer, ...pool].sort(() => Math.random() - 0.5);
}

function quizKind(mode) {
  return mode === "wrongChoice" ? "choice" : mode === "wrongSentence" ? "sentence" : mode;
}

function upgradeTaskForMode(mode) {
  return quizKind(mode);
}

function quizElements(mode) {
  if (mode === "choice") return { prompt: els.choicePrompt, options: els.choiceOptions, feedback: els.choiceFeedback };
  if (mode === "sentence") return { prompt: els.sentencePrompt, hint: els.sentenceHint, options: els.sentenceOptions, feedback: els.sentenceFeedback };
  return { prompt: els.wrongPrompt, hint: els.wrongHint, options: els.wrongOptions, feedback: els.wrongFeedback };
}

function wrongLevelWords() {
  return words.filter((item) => item.level === state.level && state.wrong.has(item.id));
}

function resetBatch(mode) {
  const sourceWords = mode.startsWith("wrong") ? wrongLevelWords() : filteredWords();
  const ids = sourceWords.map((item) => item.id);
  const variantsPerWord = isHighLevel() && ["choice", "sentence"].includes(mode) ? 1 : 2;
  const batchItems = ["choice", "sentence", "wrongChoice", "wrongSentence"].includes(mode)
    ? ids.flatMap((id) => Array.from({ length: variantsPerWord }, (_, variant) => ({ id, variant })))
    : ids.map((id) => ({ id, variant: 0 }));
  state.queues[mode] = batchItems.sort(() => Math.random() - 0.5);
  state.batchDone[mode] = false;
  state.batchStarted[mode] = true;
  state.batchRewarded[mode] = false;
  state.batchStats[mode] = { total: state.queues[mode].length, correct: 0, wrong: 0 };
}

function takeQuestionWord(mode) {
  if (state.batchDone[mode]) return null;
  if (!state.batchStarted[mode]) resetBatch(mode);
  if (!state.queues[mode].length) {
    state.batchDone[mode] = true;
    return null;
  }
  const entry = state.queues[mode].shift();
  state.currentQuizVariant = Number(entry.variant || 0);
  return words.find((item) => item.id === entry.id) || null;
}

function showBatchDone(mode) {
  const { prompt, options, feedback } = quizElements(mode);
  const batch = state.batchStats[mode];
  const attempts = batch.correct + batch.wrong;
  const score = attempts ? Math.round((batch.correct / attempts) * 100) : 0;
  if (!state.batchRewarded[mode] && batch.total > 0) {
    state.batchRewarded[mode] = true;
    markGroupTask(upgradeTaskForMode(mode), score);
  }
  prompt.textContent = "本批次已完成";
  options.innerHTML = "";
  const button = document.createElement("button");
  button.className = "primary-button";
  button.textContent = "再练一遍";
  button.addEventListener("click", () => {
    resetBatch(mode);
    if (mode === "choice") newChoiceQuestion();
    if (mode === "sentence") newSentenceQuestion();
    if (mode === "wrongChoice") newWrongQuestion("wrongChoice");
    if (mode === "wrongSentence") newWrongQuestion("wrongSentence");
  });
  options.appendChild(button);
  feedback.innerHTML = `
    <span class="score-line">得分：${score} 分</span>
    <span>本批次 ${batch.total} 个词，答对 ${batch.correct} 次，答错 ${batch.wrong} 次。${score >= 60 ? "本轮达标。" : "未达 60 分，本轮不计入升级。"}</span>
  `;
}

function newChoiceQuestion() {
  const answer = takeQuestionWord("choice");
  if (!answer) {
    state.batchDone.choice = true;
    showBatchDone("choice");
    return;
  }
  state.currentQuiz = answer;
  els.choicePrompt.textContent = answer.cn;
  els.choiceFeedback.textContent = `本批次剩余 ${state.queues.choice.length + 1} 个`;
  els.choiceOptions.innerHTML = "";
  sampleOptions(answer).forEach((item) => {
    const button = document.createElement("button");
    button.className = "option";
    button.textContent = item.word;
    button.addEventListener("click", () => checkAnswer(button, item, answer, "choice"));
    els.choiceOptions.appendChild(button);
  });
}

function newSentenceQuestion() {
  const answer = takeQuestionWord("sentence");
  if (!answer) {
    state.batchDone.sentence = true;
    showBatchDone("sentence");
    return;
  }
  state.currentQuiz = answer;
  const sentenceQuestion = sentenceQuestionFor(answer, state.currentQuizVariant || 0);
  els.sentencePrompt.textContent = sentenceQuestion.prompt;
  els.sentenceHint.textContent = sentenceQuestion.translation;
  els.sentenceFeedback.textContent = `本批次剩余 ${state.queues.sentence.length + 1} 个`;
  els.sentenceOptions.innerHTML = "";
  sampleOptions(answer).forEach((item) => {
    const button = document.createElement("button");
    button.className = "option";
    button.textContent = item.word;
    button.addEventListener("click", () => checkAnswer(button, item, answer, "sentence"));
    els.sentenceOptions.appendChild(button);
  });
}

function newWrongQuestion(mode) {
  const answer = takeQuestionWord(mode);
  const kind = quizKind(mode);
  els.wrongPractice.hidden = false;
  els.wrongPracticeLabel.textContent = kind === "choice" ? "错题中选英" : "错题单选题";
  els.wrongHint.textContent = "";

  if (!answer) {
    state.batchDone[mode] = true;
    showBatchDone(mode);
    renderWrongList();
    return;
  }

  state.currentQuiz = answer;
  els.wrongFeedback.textContent = `本批次剩余 ${state.queues[mode].length + 1} 个`;
  els.wrongOptions.innerHTML = "";
  if (kind === "choice") {
    els.wrongPrompt.textContent = answer.cn;
  } else {
    const sentenceQuestion = sentenceQuestionFor(answer, state.currentQuizVariant || 0);
    els.wrongPrompt.textContent = sentenceQuestion.prompt;
    els.wrongHint.textContent = sentenceQuestion.translation;
  }
  sampleOptions(answer).forEach((item) => {
    const button = document.createElement("button");
    button.className = "option";
    button.textContent = item.word;
    button.addEventListener("click", () => checkAnswer(button, item, answer, mode));
    els.wrongOptions.appendChild(button);
  });
}

function checkAnswer(button, item, answer, mode) {
  const correct = item.id === answer.id;
  const kind = quizKind(mode);
  const { options: optionWrap, feedback } = quizElements(mode);
  button.classList.add(correct ? "correct" : "wrong");
  const stats = statFor(answer.id);

  if (correct) {
    optionWrap.querySelectorAll("button").forEach((option) => {
      option.disabled = true;
      if (option.textContent === answer.word) option.classList.add("correct");
    });
    stats.quiz += 1;
    state.streaks[state.level] = (state.streaks[state.level] || 0) + 1;
    state.mastered.add(answer.id);
    state.wrong.delete(answer.id);
    stats.correct += 1;
    state.batchStats[mode].correct += 1;
    feedback.textContent = `正确：${answer.word} = ${answer.cn}`;
    speak(answer.word);
    setTimeout(() => {
      if (mode === "choice") newChoiceQuestion();
      else if (mode === "sentence") newSentenceQuestion();
      else newWrongQuestion(mode);
    }, 900);
  } else {
    button.disabled = true;
    if (!button.dataset.countedWrong) {
      button.dataset.countedWrong = "1";
      stats.quiz += 1;
      stats.wrong += 1;
      state.batchStats[mode].wrong += 1;
      state.queues[mode].push({ id: answer.id, variant: (state.currentQuizVariant || 0) + 2 });
    }
    state.streaks[state.level] = 0;
    state.wrong.add(answer.id);
    feedback.textContent = `已加入错题本，并会在本批次后面再做一次。请继续选择正确答案后进入下一题。`;
  }

  saveProgress();
  renderWordList();
  renderFilters();
  renderWrongList();
  updateStats();
  renderPet();
}

function renderWrongList() {
  const items = wrongLevelWords();
  els.wrongList.innerHTML = "";
  if (!items.length) {
    els.wrongPractice.hidden = true;
    els.wrongList.innerHTML = `<div class="empty-state">当前学段没有错词。</div>`;
    return;
  }

  items.forEach((item) => {
    const stats = statFor(item.id);
    const row = document.createElement("div");
    row.className = "wrong-card";
    row.innerHTML = `<div><strong>${escapeHtml(item.word)}</strong><div>${escapeHtml(item.cn)} · ${escapeHtml(item.pos)} · ${escapeHtml(displayClass(item))}</div><div>记 ${stats.studied} 次 · 题 ${stats.quiz} 次 · 对 ${stats.correct} · 错 ${stats.wrong}</div></div>`;
    const button = document.createElement("button");
    button.className = "primary-button";
    button.textContent = "发音";
    button.addEventListener("click", () => speak(item.word));
    row.appendChild(button);
    els.wrongList.appendChild(row);
  });
}

function activeReadState() {
  if (!state.readChallenge.primary) state.readChallenge.primary = { index: 0, attempts: [] };
  if (!state.readChallenge.primary.sentences) state.readChallenge.primary.sentences = {};
  return state.readChallenge.primary;
}

function activeSentenceChallenge() {
  if (!sentenceChallenges.length) return null;
  const progress = activeReadState();
  progress.index = Math.max(0, Math.min(progress.index || 0, sentenceChallenges.length - 1));
  return sentenceChallenges[progress.index];
}

function normalizeSpeechText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function speechResultText(event) {
  const parts = [];
  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    const text = result?.[0]?.transcript || "";
    if (text.trim()) parts.push(text.trim());
  }
  return parts.join(" ").trim();
}

function scoreReading(target, spoken) {
  const targetWords = normalizeSpeechText(target);
  const spokenWords = normalizeSpeechText(spoken);
  if (!targetWords.length || !spokenWords.length) return 0;
  let matched = 0;
  const used = new Set();
  targetWords.forEach((word) => {
    const index = spokenWords.findIndex((candidate, candidateIndex) => !used.has(candidateIndex) && candidate === word);
    if (index >= 0) {
      used.add(index);
      matched += 1;
    }
  });
  const coverage = matched / targetWords.length;
  const precision = matched / spokenWords.length;
  return Math.round((coverage * 0.75 + precision * 0.25) * 100);
}

function activeSentenceProgress(item) {
  const progress = activeReadState();
  if (!progress.sentences) progress.sentences = {};
  if (!progress.sentences[item.id]) {
    progress.sentences[item.id] = {
      attempts: Array.isArray(progress.attempts) && progress.attempts.length ? progress.attempts : [],
      activeAttemptIndex: Number.isFinite(progress.activeAttemptIndex) ? progress.activeAttemptIndex : 0,
      rewarded: Boolean(progress.rewarded),
      recite: progress.recite || null,
      reciteRewarded: Boolean(progress.reciteRewarded),
    };
    progress.attempts = [];
    progress.rewarded = false;
    progress.recite = null;
    progress.reciteRewarded = false;
    progress.activeAttemptIndex = 0;
  }
  const sentenceProgress = progress.sentences[item.id];
  if (!Array.isArray(sentenceProgress.attempts)) sentenceProgress.attempts = [];
  if (!("recite" in sentenceProgress)) sentenceProgress.recite = null;
  if (!("reciteRewarded" in sentenceProgress)) sentenceProgress.reciteRewarded = false;
  if (!Number.isFinite(sentenceProgress.activeAttemptIndex) || sentenceProgress.activeAttemptIndex < sentenceProgress.attempts.length) {
    sentenceProgress.activeAttemptIndex = sentenceProgress.attempts.length;
  }
  return sentenceProgress;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function playReadAttempt(index) {
  const item = activeSentenceChallenge();
  if (!item) return;
  const sentenceProgress = activeSentenceProgress(item);
  const attempt = sentenceProgress.attempts[index];
  if (attempt?.audio) {
    const audio = new Audio(attempt.audio);
    audio.play().catch(() => {
      speak(attempt.text || item.en);
    });
    return;
  }
  speak(attempt?.text || item.en);
}

function renderReadChallenge() {
  const item = activeSentenceChallenge();
  if (!item) {
    els.readSentenceNo.textContent = "Sentence -- / 100";
    els.readEnglish.textContent = "没有句子数据";
    els.readChinese.textContent = "";
    els.readAttemptText.textContent = `跟读 0 / ${READ_REQUIRED_ATTEMPTS}`;
    els.readAverageText.textContent = "平均分 --";
    els.readScoreProgress.style.width = "0%";
    els.readFeedback.textContent = "请先加载句子数据。";
    els.readAttempts.innerHTML = "";
    els.recordSentenceBtn.disabled = false;
    els.reciteSentenceBtn.disabled = true;
    return;
  }
  const sentenceProgress = activeSentenceProgress(item);
  const attempts = sentenceProgress.attempts;
  const average = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + item.score, 0) / attempts.length) : 0;
  const readComplete = attempts.length >= READ_REQUIRED_ATTEMPTS;
  const reciteScore = sentenceProgress.recite?.score;
  const reciteStatus = sentenceProgress.reciteRewarded
    ? `背诵通过 ${reciteScore} 分`
    : readComplete
      ? "可背诵评分，60分通过"
      : "完成10遍后可背诵";
  els.readSentenceNo.textContent = `Sentence ${String(item.number).padStart(2, "0")} / ${sentenceChallenges.length}`;
  els.readEnglish.textContent = item.en;
  els.readChinese.textContent = item.zh;
  els.readAttemptText.textContent = `跟读 ${attempts.length} / ${READ_REQUIRED_ATTEMPTS} · 当前第 ${sentenceProgress.activeAttemptIndex + 1} 遍`;
  els.readAverageText.textContent = attempts.length ? `平均分 ${average} · ${reciteStatus}` : `平均分 -- · ${reciteStatus}`;
  els.readScoreProgress.style.width = `${Math.min(100, (attempts.length / READ_REQUIRED_ATTEMPTS) * 100)}%`;
  els.reciteSentenceBtn.disabled = !readComplete;
  els.readAttempts.innerHTML = attempts
    .map(
      (attempt, index) => `
        <div class="read-attempt ${index === sentenceProgress.activeAttemptIndex ? "active" : ""}">
          <strong>第 ${index + 1} 遍 · ${attempt.score}</strong>
          <span>${escapeHtml(attempt.text || "未识别到内容")}</span>
          <div class="read-attempt-actions">
            <button class="text-button" data-read-play="${index}">播放</button>
          </div>
        </div>
      `
    )
    .join("");
  els.readAttempts.querySelectorAll("[data-read-play]").forEach((button) => {
    button.addEventListener("click", () => {
      playReadAttempt(Number(button.dataset.readPlay || 0));
    });
  });
}

function changeReadSentence(step) {
  if (!sentenceChallenges.length) return;
  cancelActiveReadSession();
  const progress = activeReadState();
  progress.index = (progress.index + step + sentenceChallenges.length) % sentenceChallenges.length;
  saveProgress();
  renderReadChallenge();
}

function speakSentenceExample() {
  const item = activeSentenceChallenge();
  if (item) speak(item.en);
}

let readMicStream = null;
let activeReadRecognition = null;
let activeReadCancel = null;
let activeReadFinish = null;
let readReciteActive = false;

function setReadReciteActive(active) {
  readReciteActive = active;
  els.readCard.classList.toggle("reciting", active);
  els.readEnglish.setAttribute("aria-hidden", active ? "true" : "false");
  els.readAttempts.setAttribute("aria-hidden", active ? "true" : "false");
  els.sampleSentenceBtn.disabled = active;
  els.prevSentenceBtn.disabled = active;
  els.nextSentenceBtn.disabled = active;
}

function cancelActiveReadSession(message = "") {
  if (activeReadCancel) {
    activeReadCancel();
    activeReadCancel = null;
  } else if (activeReadRecognition) {
    try {
      activeReadRecognition.abort?.();
      activeReadRecognition.stop?.();
    } catch {
      // Ignore stale browser speech-recognition sessions.
    }
  }
  activeReadRecognition = null;
  activeReadFinish = null;
  setReadReciteActive(false);
  els.finishReadingBtn.disabled = true;
  els.recordSentenceBtn.disabled = false;
  if (message) els.readFeedback.textContent = message;
}

async function ensureMicrophoneReady() {
  if (readMicStream?.active) return true;
  if (!navigator.mediaDevices?.getUserMedia) return true;
  readMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return true;
}

async function recordSentenceReading() {
  const item = activeSentenceChallenge();
  if (!item) return;
  cancelActiveReadSession();
  const startProgress = activeSentenceProgress(item);
  startProgress.activeAttemptIndex = startProgress.attempts.length;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.readFeedback.textContent = "当前浏览器不支持语音识别，请使用 Chrome 或 Edge。";
    return;
  }
  try {
    els.recordSentenceBtn.disabled = true;
    els.reciteSentenceBtn.disabled = true;
    els.readFeedback.textContent = "正在准备麦克风。";
    await ensureMicrophoneReady();
  } catch {
    els.recordSentenceBtn.disabled = false;
    renderReadChallenge();
    els.readFeedback.textContent = "麦克风未授权，无法跟读评分。请在浏览器地址栏允许麦克风。";
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  els.readFeedback.textContent = "正在听，请读完后点“已读完”。";
  let spoken = "";
  let score = 0;
  let gotResult = false;
  let finished = false;
  let cancelled = false;
  let userFinished = false;
  let restartCount = 0;
  let listenTimer = null;
  let recorder = null;
  const audioChunks = [];
  if (readMicStream && window.MediaRecorder) {
    try {
      recorder = new MediaRecorder(readMicStream);
      recorder.ondataavailable = (event) => {
        if (event.data?.size) audioChunks.push(event.data);
      };
      recorder.start();
    } catch {
      recorder = null;
    }
  }
  const saveAttempt = async () => {
    if (!gotResult) {
      els.readFeedback.textContent = "没有识别到声音。iPad 浏览器语音识别不稳定，请靠近麦克风再试，或改用电脑 Chrome/Edge。";
      renderReadChallenge();
      return;
    }
    const sentenceProgress = activeSentenceProgress(item);
    const activeIndex = sentenceProgress.attempts.length;
    let audio = "";
    if (audioChunks.length) {
      try {
        audio = await blobToDataUrl(new Blob(audioChunks, { type: audioChunks[0].type || "audio/webm" }));
      } catch {
        audio = "";
      }
    }
    sentenceProgress.attempts[activeIndex] = { score, text: spoken, audio, at: Date.now() };
    sentenceProgress.activeAttemptIndex = sentenceProgress.attempts.length;
    els.readFeedback.textContent = `第 ${activeIndex + 1} 遍 ${score} 分。`;
    if (sentenceProgress.attempts.length >= READ_REQUIRED_ATTEMPTS && !sentenceProgress.rewarded) {
      sentenceProgress.rewarded = true;
      addLevelGroup("read100", "primary");
      els.readFeedback.textContent = `已完成 ${READ_REQUIRED_ATTEMPTS} 遍跟读，升级成功。第 ${activeIndex + 1} 遍 ${score} 分。`;
    }
    saveProgress();
    renderReadChallenge();
  };
  recognition.onresult = (event) => {
    spoken = speechResultText(event);
    gotResult = Boolean(normalizeSpeechText(spoken).length);
    score = scoreReading(item.en, spoken);
  };
  recognition.onerror = () => {
    if (cancelled) return;
    gotResult = false;
    els.readFeedback.textContent = "没有识别成功，请再试一次。";
  };
  const finishListening = () => {
    if (finished) return;
    if (!cancelled && !userFinished && !gotResult && restartCount < 3) {
      restartCount += 1;
      els.readFeedback.textContent = "正在听，请继续读，读完后点“已读完”。";
      setTimeout(() => {
        try {
          recognition.start();
        } catch {
          userFinished = true;
          finishListening();
        }
      }, 200);
      return;
    }
    finished = true;
    if (listenTimer) {
      clearTimeout(listenTimer);
      listenTimer = null;
    }
    if (activeReadRecognition === recognition) activeReadRecognition = null;
    if (activeReadCancel === cancelThisSession) activeReadCancel = null;
    if (activeReadFinish === finishThisSession) activeReadFinish = null;
    els.finishReadingBtn.disabled = true;
    const finish = () => {
      if (cancelled) {
        els.recordSentenceBtn.disabled = false;
        return;
      }
      saveAttempt().finally(() => {
        els.recordSentenceBtn.disabled = false;
      });
    };
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = finish;
      recorder.stop();
    } else {
      finish();
    }
  };
  const cancelThisSession = () => {
    cancelled = true;
    if (listenTimer) {
      clearTimeout(listenTimer);
      listenTimer = null;
    }
    els.finishReadingBtn.disabled = true;
    els.recordSentenceBtn.disabled = false;
    renderReadChallenge();
    try {
      recognition.abort?.();
    } catch {
      try {
        recognition.stop?.();
      } catch {
        // Ignore stale browser speech-recognition sessions.
      }
    }
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Ignore stale recorder sessions.
      }
    }
  };
  const finishThisSession = () => {
    userFinished = true;
    try {
      recognition.stop();
    } catch {
      finishListening();
    }
  };
  recognition.onend = finishListening;
  activeReadRecognition = recognition;
  activeReadCancel = cancelThisSession;
  activeReadFinish = finishThisSession;
  els.finishReadingBtn.disabled = false;
  try {
    recognition.start();
  } catch {
    activeReadRecognition = null;
    activeReadCancel = null;
    activeReadFinish = null;
    els.finishReadingBtn.disabled = true;
    els.recordSentenceBtn.disabled = false;
    renderReadChallenge();
    els.readFeedback.textContent = "语音识别启动失败，请重新点击跟读评分。";
    return;
  }
  listenTimer = setTimeout(() => {
    if (finished || cancelled) return;
    userFinished = true;
    els.readFeedback.textContent = "已自动停止，正在识别。";
    try {
      recognition.stop();
    } catch {
      finishListening();
    }
  }, 30000);
}

function finishSentenceReading() {
  if (!activeReadRecognition) {
    els.readFeedback.textContent = "当前没有正在进行的跟读。";
    return;
  }
  els.readFeedback.textContent = "已读完，正在识别。";
  els.finishReadingBtn.disabled = true;
  if (activeReadFinish) {
    activeReadFinish();
    return;
  }
  try {
    activeReadRecognition.stop();
  } catch {
    activeReadRecognition = null;
    activeReadCancel = null;
    activeReadFinish = null;
    els.finishReadingBtn.disabled = true;
    els.recordSentenceBtn.disabled = false;
  }
}

async function recordSentenceRecite() {
  const item = activeSentenceChallenge();
  if (!item) return;
  const sentenceProgress = activeSentenceProgress(item);
  if (sentenceProgress.attempts.length < READ_REQUIRED_ATTEMPTS) {
    els.readFeedback.textContent = `请先完成 ${READ_REQUIRED_ATTEMPTS} 遍跟读，再进行背诵评分。`;
    return;
  }
  cancelActiveReadSession();
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.readFeedback.textContent = "当前浏览器不支持语音识别，请使用 Chrome 或 Edge。";
    return;
  }
  try {
    els.recordSentenceBtn.disabled = true;
    els.reciteSentenceBtn.disabled = true;
    els.readFeedback.textContent = "正在准备麦克风。";
    await ensureMicrophoneReady();
  } catch {
    els.recordSentenceBtn.disabled = false;
    renderReadChallenge();
    els.readFeedback.textContent = "麦克风未授权，无法背诵评分。请在浏览器地址栏允许麦克风。";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  setReadReciteActive(true);
  els.readFeedback.textContent = "正在听背诵，请背完后点“已读完”。";

  let spoken = "";
  let score = 0;
  let gotResult = false;
  let finished = false;
  let cancelled = false;
  let userFinished = false;
  let restartCount = 0;
  let listenTimer = null;

  const saveRecite = () => {
    setReadReciteActive(false);
    if (!gotResult) {
      els.readFeedback.textContent = "没有识别到背诵内容，请靠近麦克风再试。";
      renderReadChallenge();
      return;
    }
    const latestProgress = activeSentenceProgress(item);
    latestProgress.recite = { score, text: spoken, at: Date.now() };
    if (score >= RECITE_PASS_SCORE && !latestProgress.reciteRewarded) {
      latestProgress.reciteRewarded = true;
      addLevelGroup("recite100", "primary");
      els.readFeedback.textContent = `背诵通过，${score} 分，升级成功。`;
    } else if (score >= RECITE_PASS_SCORE) {
      els.readFeedback.textContent = `背诵通过，${score} 分。`;
    } else {
      els.readFeedback.textContent = `背诵 ${score} 分，未达 ${RECITE_PASS_SCORE} 分，请再试。`;
    }
    saveProgress();
    renderReadChallenge();
  };

  recognition.onresult = (event) => {
    spoken = speechResultText(event);
    gotResult = Boolean(normalizeSpeechText(spoken).length);
    score = scoreReading(item.en, spoken);
  };
  recognition.onerror = () => {
    if (cancelled) return;
    gotResult = false;
    els.readFeedback.textContent = "背诵识别失败，请再试一次。";
  };
  const finishListening = () => {
    if (finished) return;
    if (!cancelled && !userFinished && !gotResult && restartCount < 3) {
      restartCount += 1;
      els.readFeedback.textContent = "正在听背诵，请继续背，背完后点“已读完”。";
      setTimeout(() => {
        try {
          recognition.start();
        } catch {
          userFinished = true;
          finishListening();
        }
      }, 200);
      return;
    }
    finished = true;
    if (listenTimer) {
      clearTimeout(listenTimer);
      listenTimer = null;
    }
    if (activeReadRecognition === recognition) activeReadRecognition = null;
    if (activeReadCancel === cancelThisSession) activeReadCancel = null;
    if (activeReadFinish === finishThisSession) activeReadFinish = null;
    els.finishReadingBtn.disabled = true;
    if (cancelled) {
      setReadReciteActive(false);
      els.recordSentenceBtn.disabled = false;
      renderReadChallenge();
      return;
    }
    els.recordSentenceBtn.disabled = false;
    saveRecite();
  };
  const cancelThisSession = () => {
    cancelled = true;
    if (listenTimer) {
      clearTimeout(listenTimer);
      listenTimer = null;
    }
    els.finishReadingBtn.disabled = true;
    setReadReciteActive(false);
    els.recordSentenceBtn.disabled = false;
    renderReadChallenge();
    try {
      recognition.abort?.();
    } catch {
      try {
        recognition.stop?.();
      } catch {
        // Ignore stale browser speech-recognition sessions.
      }
    }
  };
  const finishThisSession = () => {
    userFinished = true;
    try {
      recognition.stop();
    } catch {
      finishListening();
    }
  };
  recognition.onend = finishListening;
  activeReadRecognition = recognition;
  activeReadCancel = cancelThisSession;
  activeReadFinish = finishThisSession;
  els.finishReadingBtn.disabled = false;
  try {
    recognition.start();
  } catch {
    activeReadRecognition = null;
    activeReadCancel = null;
    activeReadFinish = null;
    els.finishReadingBtn.disabled = true;
    setReadReciteActive(false);
    els.recordSentenceBtn.disabled = false;
    renderReadChallenge();
    els.readFeedback.textContent = "背诵识别启动失败，请重新点击背诵评分。";
    return;
  }
  listenTimer = setTimeout(() => {
    if (finished || cancelled) return;
    userFinished = true;
    els.readFeedback.textContent = "已自动停止，正在识别背诵。";
    try {
      recognition.stop();
    } catch {
      finishListening();
    }
  }, 30000);
}

function refreshPractice() {
  if (state.mode === "choice") newChoiceQuestion();
  if (state.mode === "sentence") newSentenceQuestion();
  if (state.mode === "wrong") {
    els.wrongPractice.hidden = true;
    renderWrongList();
  }
  if (state.mode === "read100") renderReadChallenge();
}

function switchMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.getElementById(`${mode}Mode`).classList.add("active");
  refreshPractice();
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
}

function render() {
  renderFilters();
  if (state.level !== "read") {
    renderCard();
    renderWordList();
    renderWrongList();
  }
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.getElementById(`${state.mode}Mode`).classList.add("active");
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.mode);
  });
  if (state.mode === "read100") renderReadChallenge();
  updateStats();
  renderPet();
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => switchMode(button.dataset.mode));
});

els.prevBtn.addEventListener("click", () => {
  const list = filteredWords();
  if (!list.length) return;
  state.index = (state.index - 1 + list.length) % list.length;
  state.currentCardId = null;
  render();
  speak(activeWord().word);
});

els.nextBtn.addEventListener("click", () => {
  const list = filteredWords();
  if (!list.length) return;
  state.index = (state.index + 1) % list.length;
  state.currentCardId = null;
  render();
  speak(activeWord().word);
});

els.speakBtn.addEventListener("click", () => {
  const item = activeWord();
  if (item) speak(item.word);
});

els.knownBtn.addEventListener("click", () => {
  const item = activeWord();
  const list = filteredWords();
  if (!item || !list.length) return;
  state.mastered.add(item.id);
  state.currentCardId = null;
  markGroupTask("cards");
  saveProgress();
  state.index = (state.index + 1) % list.length;
  render();
  speak(activeWord().word);
});

els.clearWrong.addEventListener("click", () => {
  baseLevelWords().forEach((item) => state.wrong.delete(item.id));
  state.queues.wrongChoice = [];
  state.queues.wrongSentence = [];
  state.batchDone.wrongChoice = false;
  state.batchDone.wrongSentence = false;
  state.batchStarted.wrongChoice = false;
  state.batchStarted.wrongSentence = false;
  state.batchRewarded.wrongChoice = false;
  state.batchRewarded.wrongSentence = false;
  els.wrongPractice.hidden = true;
  saveProgress();
  render();
});

els.wrongChoiceBtn.addEventListener("click", () => {
  if (!wrongLevelWords().length) return;
  resetBatch("wrongChoice");
  newWrongQuestion("wrongChoice");
});

els.wrongSentenceBtn.addEventListener("click", () => {
  if (!wrongLevelWords().length) return;
  resetBatch("wrongSentence");
  newWrongQuestion("wrongSentence");
});

els.prevSentenceBtn.addEventListener("click", () => changeReadSentence(-1));
els.nextSentenceBtn.addEventListener("click", () => changeReadSentence(1));
els.sampleSentenceBtn.addEventListener("click", speakSentenceExample);
els.recordSentenceBtn.addEventListener("click", recordSentenceReading);
els.reciteSentenceBtn.addEventListener("click", recordSentenceRecite);
els.finishReadingBtn.addEventListener("click", finishSentenceReading);

els.petTouchBtn.addEventListener("click", touchPet);

render();
const initial = activeWord();
if (initial) setTimeout(() => speak(initial.word), 300);
