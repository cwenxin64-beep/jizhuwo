const IDLE_SLEEP_DELAY = 12000;

const hotspotMap = {
  dog: { id: 'dog', x: 18, y: 65, w: 42, h: 25, text: '布丁轻轻蹭了蹭你。' },
  frame: { id: 'frame', x: 8, y: 13, w: 25, h: 21, text: '那天的阳光，布丁好像还记得。' },
  window: { id: 'window', x: 55, y: 9, w: 38, h: 30, text: '花桥那边的月亮也亮着。' },
  sofa: { id: 'sofa', x: 48, y: 50, w: 39, h: 20, text: '布丁还是喜欢靠在你旁边。' },
  toy: { id: 'toy', x: 28, y: 87, w: 22, h: 10, text: '它还记得最喜欢的小球。' },
  candle: { id: 'candle', x: 2, y: 62, w: 18, h: 16, text: '灯还亮着，我们再坐一会儿。' }
};

Page({
  data: {
    layout: getApp().globalData.layout,
    hotspots: Object.values(hotspotMap),
    currentText: '布丁在这里等你。',
    progress: 36,
    petals: [],
    hearts: [],
    activeHotspot: '',
    heartPulse: false,
    toyRolling: false,
    dogGlow: false,
    petting: false,
    sleeping: false
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ hidden: true });
    this.restartIdleTimer();
  },

  onHide() {
    this.clearTimers();
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

  onTapHotspot(event) {
    const id = event.currentTarget.dataset.id;
    const hit = hotspotMap[id];
    if (!hit) return;
    if (id === 'dog' && Date.now() - (this.lastLongPressAt || 0) < 700) return;

    this.wakeAndRestart();

    if (id === 'dog') {
      this.respondToDogTap();
      return;
    }

    if (id === 'toy') {
      this.rollToy();
      return;
    }

    this.setData({
      currentText: hit.text,
      activeHotspot: id
    });

    if (id === 'window') this.spawnPetals('window');
    this.resetActiveState();
  },

  onLongPressHotspot(event) {
    const id = event.currentTarget.dataset.id;
    if (id !== 'dog') return;

    this.lastLongPressAt = Date.now();
    this.wakeAndRestart();
    this.spawnPetals('dog');
    this.setData({
      currentText: '布丁安静地靠近了你。',
      activeHotspot: 'dog',
      dogGlow: true,
      petting: true,
      progress: Math.min(100, this.data.progress + 8)
    });

    this.setNamedTimer('pettingTimer', () => {
      this.setData({
        activeHotspot: '',
        dogGlow: false,
        petting: false
      });
    }, 1600);
  },

  onTapHeart() {
    this.wakeAndRestart();
    this.setData({
      currentText: '布丁把心意收好了。',
      progress: Math.min(100, this.data.progress + 6),
      heartPulse: true
    });

    this.setNamedTimer('heartTimer', () => {
      this.setData({ heartPulse: false });
    }, 680);
  },

  respondToDogTap() {
    this.spawnHearts();
    this.setData({
      currentText: hotspotMap.dog.text,
      activeHotspot: 'dog',
      dogGlow: true,
      progress: Math.min(100, this.data.progress + 10)
    });

    this.setNamedTimer('dogTimer', () => {
      this.setData({
        activeHotspot: '',
        dogGlow: false,
        hearts: []
      });
    }, 1320);
  },

  rollToy() {
    this.setData({
      currentText: hotspotMap.toy.text,
      activeHotspot: 'toy',
      toyRolling: true
    });

    this.setNamedTimer('toyTimer', () => {
      this.setData({
        activeHotspot: '',
        toyRolling: false
      });
    }, 1240);
  },

  spawnHearts() {
    const now = Date.now();
    const hearts = [
      { id: `${now}-heart-1`, x: 31, y: 64, delay: 0 },
      { id: `${now}-heart-2`, x: 39, y: 62, delay: 120 },
      { id: `${now}-heart-3`, x: 48, y: 66, delay: 220 }
    ];
    this.setData({ hearts });
  },

  spawnPetals(target) {
    const now = Date.now();
    const config = target === 'dog'
      ? { count: 10, x: 23, y: 61, spreadX: 28, spreadY: 11 }
      : { count: 9, x: 60, y: 20, spreadX: 26, spreadY: 9 };

    const petals = Array.from({ length: config.count }).map((_, index) => ({
      id: `${now}-petal-${index}`,
      x: config.x + Math.random() * config.spreadX,
      y: config.y + Math.random() * config.spreadY,
      delay: index * 86
    }));

    this.setData({ petals });
    this.setNamedTimer('petalTimer', () => {
      this.setData({ petals: [] });
    }, 2500);
  },

  resetActiveState() {
    this.setNamedTimer('activeTimer', () => {
      this.setData({ activeHotspot: '' });
    }, 940);
  },

  wakeAndRestart() {
    this.setData({ sleeping: false });
    this.restartIdleTimer();
  },

  restartIdleTimer() {
    this.setNamedTimer('sleepTimer', () => {
      this.setData({
        sleeping: true,
        currentText: '布丁在你身边睡着了。'
      });
    }, IDLE_SLEEP_DELAY);
  },

  setNamedTimer(name, handler, delay) {
    this.clearNamedTimer(name);
    this[name] = setTimeout(() => {
      this[name] = null;
      handler();
    }, delay);
  },

  clearNamedTimer(name) {
    if (!this[name]) return;
    clearTimeout(this[name]);
    this[name] = null;
  },

  clearTimers() {
    [
      'activeTimer',
      'petalTimer',
      'heartTimer',
      'dogTimer',
      'pettingTimer',
      'toyTimer',
      'sleepTimer'
    ].forEach((timerName) => this.clearNamedTimer(timerName));
  }
});
