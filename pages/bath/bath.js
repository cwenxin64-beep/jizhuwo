const STEPS = [
  { id: 'treatBefore', label: '安抚', mood: '有点紧张', hint: '它有点紧张，先给一颗小零食吧。', expected: ['treat'] },
  { id: 'showerWet', label: '打湿', mood: '安心', hint: '把花洒拖到布丁身上，轻轻淋湿毛毛。', expected: ['shower'] },
  { id: 'soap', label: '起泡', mood: '放松', hint: '选一块香皂，给布丁揉出香香泡泡。', expected: ['soapMarigold', 'soapStar', 'soapHoney'] },
  { id: 'showerRinse', label: '冲净', mood: '开心', hint: '泡泡还在身上，用花洒轻轻冲干净。', expected: ['shower'] },
  { id: 'towel', label: '擦干', mood: '乖乖等着', hint: '毛毛还滴着水，用暖毛巾包一下它。', expected: ['towel'] },
  { id: 'dryer', label: '吹毛', mood: '舒服', hint: '用暖风把布丁的毛毛慢慢吹蓬。', expected: ['dryer'] },
  { id: 'treatAfter', label: '奖励', mood: '期待奖励', hint: '已经洗好啦，给它一颗小奖励吧。', expected: ['treat'] }
];

const TOOLS = [
  { id: 'treat', label: '小零食', icon: '◒' },
  { id: 'shower', label: '花洒', icon: '♨' },
  { id: 'soapMarigold', label: '万寿菊香皂', shortLabel: '万寿菊', icon: '✿', scent: '万寿菊香皂' },
  { id: 'soapStar', label: '星光香皂', shortLabel: '星光', icon: '✦', scent: '星光香皂' },
  { id: 'soapHoney', label: '奶油蜂蜜香皂', shortLabel: '蜂蜜', icon: '○', scent: '奶油蜂蜜香皂' },
  { id: 'towel', label: '毛巾', icon: '▰' },
  { id: 'dryer', label: '吹风机', icon: '⌁' }
];

const SUCCESS = {
  treatBefore: { mood: '安心', state: 'comforted', clean: 0, fluffy: 0, message: '吃到小零食后，布丁安心地坐好了。', effect: 'treat' },
  showerWet: { mood: '放松', state: 'wet', clean: 20, fluffy: 0, message: '水温暖暖的，布丁慢慢放松下来。', effect: 'water' },
  soap: { mood: '开心', state: 'soapy', clean: 50, fluffy: 0, message: '香香泡泡已经揉出来了。', effect: 'foam' },
  showerRinse: { mood: '放松', state: 'rinsed', clean: 80, fluffy: 0, message: '泡泡变成小花瓣，被温水轻轻带走。', effect: 'rinse' },
  towel: { mood: '乖乖等着', state: 'toweled', clean: 90, fluffy: 50, message: '暖毛巾把布丁轻轻包住了。', effect: 'towel' },
  dryer: { mood: '舒服', state: 'fluffy', clean: 100, fluffy: 100, message: '暖风刚刚好，毛毛慢慢蓬起来了。', effect: 'dryer' },
  treatAfter: { mood: '满足', state: 'happy', clean: 100, fluffy: 100, message: '今天洗得香香的，布丁很满足。', effect: 'complete' }
};

const WRONG_HINTS = {
  treatBefore: '布丁还有点紧张，先用小零食安抚它。',
  showerWet: '先用花洒把毛毛轻轻淋湿。',
  soap: '毛毛已经湿了，现在选一块香皂吧。',
  showerRinse: '泡泡还在身上，需要用花洒冲干净。',
  towel: '冲干净以后，先用毛巾擦干。',
  dryer: '毛毛还不够蓬松，用吹风机暖暖吹一下。',
  treatAfter: '已经洗好啦，现在可以给小奖励。'
};

function formatDate(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

Page({
  data: {
    layout: getApp().globalData.layout,
    steps: STEPS,
    stepIndex: 0,
    currentStep: STEPS[0],
    tools: [],
    selectedToolId: '',
    selectedTool: null,
    selectedSoap: '万寿菊香皂',
    petMood: STEPS[0].mood,
    petState: 'anxious',
    hintMessage: STEPS[0].hint,
    cleanProgress: 0,
    fluffyProgress: 0,
    petMotion: false,
    effectType: '',
    effectParticles: [],
    quietMode: false,
    dragging: false,
    dragX: 0,
    dragY: 0,
    dragTool: {},
    completed: false,
    completionDate: '',
    recordSaved: false
  },

  onLoad() {
    this.refreshTools();
  },

  onReady() {
    this.measurePetTarget();
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 0, hidden: true });
    setTimeout(() => this.measurePetTarget(), 100);
  },

  onUnload() {
    this.clearTimers();
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: '/pages/home/home' });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  toggleQuiet() {
    this.setData({ quietMode: !this.data.quietMode });
  },

  selectTool(event) {
    if (this.transitioning || this.data.completed) return;
    const tool = this.findTool(event.currentTarget.dataset.id);
    if (!tool) return;
    this.setData({
      selectedToolId: tool.id,
      selectedTool: tool
    });
  },

  useSelectedTool() {
    if (!this.data.selectedToolId || this.transitioning || this.data.completed) return;
    this.applyTool(this.data.selectedToolId);
  },

  onToolTouchStart(event) {
    if (this.transitioning || this.data.completed) return;
    const tool = this.findTool(event.currentTarget.dataset.id);
    const touch = event.touches && event.touches[0];
    if (!tool || !touch) return;
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.dragCandidate = tool;
    this.dragMoved = false;
    this.dragMode = 'pending';
    this.setData({
      selectedToolId: tool.id,
      selectedTool: tool
    });
  },

  onToolTouchMove(event) {
    const touch = event.touches && event.touches[0];
    if (!touch || !this.dragCandidate) return;
    const dx = touch.clientX - this.dragStartX;
    const dy = touch.clientY - this.dragStartY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (this.dragMode === 'pending' && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      this.dragMode = 'scroll';
      return;
    }
    if (this.dragMode === 'scroll') return;
    if (distance < 10 && !this.dragMoved) return;
    this.dragMode = 'drag';
    this.dragMoved = true;
    this.setData({
      dragging: true,
      dragX: touch.clientX - 28,
      dragY: touch.clientY - 28,
      dragTool: this.dragCandidate
    });
  },

  onToolTouchEnd(event) {
    if (!this.dragCandidate) return;
    const touch = event.changedTouches && event.changedTouches[0];
    const toolId = this.dragCandidate.id;
    const hit = touch && this.isInsidePet(touch.clientX, touch.clientY);
    const dragMode = this.dragMode;
    this.setData({ dragging: false });
    this.dragCandidate = null;
    this.dragMode = '';
    if (dragMode === 'scroll') {
      this.setData({
        selectedToolId: '',
        selectedTool: null
      });
      return;
    }
    if (this.dragMoved && hit) this.applyTool(toolId);
  },

  applyTool(toolId) {
    const step = this.data.currentStep;
    if (!step.expected.includes(toolId)) {
      this.setData({
        hintMessage: WRONG_HINTS[step.id],
        petMotion: true
      });
      this.setNamedTimer('motionTimer', () => this.setData({ petMotion: false }), 520);
      return;
    }

    const result = SUCCESS[step.id];
    if (!result) return;
    const tool = this.findTool(toolId);
    this.transitioning = true;
    if (step.id === 'soap' && tool && tool.scent) {
      this.setData({ selectedSoap: tool.scent });
    }

    this.setData({
      petMood: result.mood,
      petState: result.state,
      cleanProgress: result.clean,
      fluffyProgress: result.fluffy,
      hintMessage: step.id === 'soap' && tool
        ? `${tool.scent}的香气让布丁放松下来。`
        : result.message,
      effectType: result.effect,
      effectParticles: this.createParticles(result.effect),
      petMotion: true,
      selectedToolId: '',
      selectedTool: null
    });

    this.setNamedTimer('stepTimer', () => this.advanceStep(), 720);
  },

  advanceStep() {
    const nextIndex = this.data.stepIndex + 1;
    if (nextIndex >= STEPS.length) {
      this.transitioning = false;
      this.setData({
        stepIndex: STEPS.length,
        petMood: '满足',
        petState: 'happy',
        cleanProgress: 100,
        fluffyProgress: 100,
        hintMessage: '今天洗得香香的，布丁很满足。',
        effectType: 'complete',
        petMotion: false,
        completed: true,
        completionDate: formatDate(new Date())
      });
      return;
    }

    const currentStep = STEPS[nextIndex];
    this.transitioning = false;
    this.setData({
      stepIndex: nextIndex,
      currentStep,
      petMood: currentStep.mood,
      hintMessage: currentStep.hint,
      effectType: '',
      effectParticles: [],
      petMotion: false
    });
    this.refreshTools();
  },

  refreshTools() {
    const step = this.data.currentStep || STEPS[0];
    this.setData({
      tools: TOOLS.map((tool) => ({
        ...tool,
        recommended: step.expected.includes(tool.id)
      }))
    });
  },

  createParticles(effect) {
    const count = effect === 'foam' ? 18 : 12;
    return Array.from({ length: count }).map((_, index) => ({
      id: `${Date.now()}-${index}`,
      x: 10 + Math.round(Math.random() * 78),
      y: 8 + Math.round(Math.random() * 72),
      delay: index * 35
    }));
  },

  findTool(id) {
    return TOOLS.find((tool) => tool.id === id);
  },

  measurePetTarget() {
    wx.createSelectorQuery()
      .in(this)
      .select('#petTarget')
      .boundingClientRect((rect) => {
        this.petRect = rect || null;
      })
      .exec();
  },

  isInsidePet(x, y) {
    const rect = this.petRect;
    if (!rect) return false;
    return x >= rect.left - 20
      && x <= rect.right + 20
      && y >= rect.top - 20
      && y <= rect.bottom + 20;
  },

  saveRecord() {
    if (this.data.recordSaved) return;
    const records = wx.getStorageSync('bathCareRecords') || [];
    records.unshift({
      date: new Date().toISOString(),
      shampoo: this.data.selectedSoap,
      cleanProgress: 100,
      fluffyProgress: 100,
      petMood: '满足',
      memoryText: '今天布丁洗得香香的，毛毛像被星光晒过一样蓬起来了。'
    });
    wx.setStorageSync('bathCareRecords', records.slice(0, 20));
    this.setData({ recordSaved: true });
  },

  resetBath() {
    this.transitioning = false;
    this.clearTimers();
    this.setData({
      stepIndex: 0,
      currentStep: STEPS[0],
      selectedToolId: '',
      selectedTool: null,
      selectedSoap: '万寿菊香皂',
      petMood: STEPS[0].mood,
      petState: 'anxious',
      hintMessage: STEPS[0].hint,
      cleanProgress: 0,
      fluffyProgress: 0,
      petMotion: false,
      effectType: '',
      effectParticles: [],
      dragging: false,
      completed: false,
      completionDate: '',
      recordSaved: false
    });
    this.refreshTools();
    setTimeout(() => this.measurePetTarget(), 80);
  },

  setNamedTimer(name, handler, delay) {
    if (this[name]) clearTimeout(this[name]);
    this[name] = setTimeout(() => {
      this[name] = null;
      handler();
    }, delay);
  },

  clearTimers() {
    ['motionTimer', 'stepTimer'].forEach((name) => {
      if (this[name]) clearTimeout(this[name]);
      this[name] = null;
    });
  }
});
