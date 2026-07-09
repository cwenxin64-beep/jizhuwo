const EXCHANGE_STEP_COST = 100;
const EXCHANGE_COIN_GAIN = 1;
const EXCHANGE_TOTAL_DURATION = 1000;
const NUMBER_ROLL_DURATION = 520;

Page({
  data: {
    layout: getApp().globalData.layout,
    steps: 180,
    coins: 55,
    exchangeAnimating: false,
    flyingParticles: [],
    stepsInsufficient: false,
    travelModes: [
      { icon: 'paw', title: '慢步偶遇', active: true },
      { icon: 'spark', title: '灵感漂流', active: false }
    ],
    heartLit: false,
    packs: [
      { title: '背包', type: 'bag', image: '/pages/walk/assets/backpack.jpg', added: false },
      { title: '零食', type: 'snack', image: '/pages/walk/assets/snacks.jpg', added: false }
    ]
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 0, hidden: true });
  },
  onUnload() {
    this.clearExchangeTimers();
  },
  handleExchangeSteps() {
    if (this.data.exchangeAnimating) return;

    if (this.data.steps < EXCHANGE_STEP_COST) {
      this.clearExchangeTimers();
      this.setData({ stepsInsufficient: false });
      this.scheduleExchangeTask(() => {
        this.setData({ stepsInsufficient: true });
      }, 16);
      this.scheduleExchangeTask(() => {
        this.setData({ stepsInsufficient: false });
      }, 430);
      wx.showToast({
        title: '步数不足 100，继续走走吧',
        icon: 'none'
      });
      return;
    }

    this.clearExchangeTimers();
    const startSteps = this.data.steps;
    const startCoins = this.data.coins;
    const nextSteps = startSteps - EXCHANGE_STEP_COST;
    const nextCoins = startCoins + EXCHANGE_COIN_GAIN;
    const flyingParticles = Array.from({ length: 4 }, (_, index) => ({
      id: `${Date.now()}-${index}`,
      delay: index * 55
    }));

    this.setData({
      exchangeAnimating: true,
      stepsInsufficient: false,
      flyingParticles
    });

    this.scheduleExchangeTask(() => {
      this.animateExchangeNumbers(startSteps, nextSteps, startCoins, nextCoins);
    }, 140);

    this.scheduleExchangeTask(() => {
      this.setData({
        steps: nextSteps,
        coins: nextCoins,
        exchangeAnimating: false,
        flyingParticles: []
      });
      this.clearExchangeTimers();
    }, EXCHANGE_TOTAL_DURATION);
  },
  animateExchangeNumbers(startSteps, nextSteps, startCoins, nextCoins) {
    const startedAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const stepProgress = Math.min(1, elapsed / NUMBER_ROLL_DURATION);
      const stepEased = 1 - Math.pow(1 - stepProgress, 3);
      const coinProgress = Math.max(0, Math.min(1, (elapsed - 250) / 270));
      const coinEased = 1 - Math.pow(1 - coinProgress, 3);

      this.setData({
        steps: Math.round(startSteps + (nextSteps - startSteps) * stepEased),
        coins: Math.round(startCoins + (nextCoins - startCoins) * coinEased)
      });

      if (stepProgress < 1 || coinProgress < 1) {
        this.scheduleExchangeTask(tick, 32);
      }
    };

    tick();
  },
  scheduleExchangeTask(callback, delay) {
    this.exchangeTimers = this.exchangeTimers || [];
    const timer = setTimeout(callback, delay);
    this.exchangeTimers.push(timer);
  },
  clearExchangeTimers() {
    (this.exchangeTimers || []).forEach((timer) => clearTimeout(timer));
    this.exchangeTimers = [];
  },
  startWalk() {
    wx.navigateTo({ url: '/pages/run/run' });
  },
  chooseTravelMode(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (index === 1) {
      wx.navigateTo({ url: '/pages/runGame/runGame' });
      return;
    }
    this.setData({
      travelModes: this.data.travelModes.map((item, itemIndex) => ({
        ...item,
        active: itemIndex === index
      }))
    });
  },
  tapHeart() {
    this.setData({
      heartLit: !this.data.heartLit
    });
  },
  addPack(event) {
    const index = Number(event.currentTarget.dataset.index);
    const packs = this.data.packs.map((item, itemIndex) => ({
      ...item,
      added: itemIndex === index ? !item.added : item.added
    }));
    this.setData({ packs });
  },
  goHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },
  goAlbum() {
    wx.switchTab({ url: '/pages/album/album' });
  },
  goMarket() {
    wx.switchTab({ url: '/pages/market/market' });
  },
  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  }
});
