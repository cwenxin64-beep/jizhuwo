const TARGET_SCORE = 100;
const BASE_SPEED = 135;
const SPAWN_DELAY_MIN = 2400;
const SPAWN_DELAY_RANGE = 450;

const ASSETS = {
  background: '/pages/cook/assets/bg.png',
  dog: '/pages/cook/assets/dog_game.png'
};

const FOOD_TYPES = [
  { id: 'vegetable', name: '胡萝卜', safe: true, score: 10, path: '/pages/cook/assets/vegetable.png' },
  { id: 'meat', name: '肉块', safe: true, score: 10, path: '/pages/cook/assets/meat.png' },
  { id: 'fish', name: '三文鱼', safe: true, score: 10, path: '/pages/cook/assets/fish.png' },
  { id: 'fruit', name: '苹果', safe: true, score: 10, path: '/pages/cook/assets/fruit.png' },
  { id: 'desert', name: '冰淇淋', safe: false, score: 0, path: '/pages/cook/assets/desert.png' },
  { id: 'nuts', name: '巧克力', safe: false, score: 0, path: '/pages/cook/assets/nuts.png' }
];

Page({
  data: {
    layout: getApp().globalData.layout,
    score: 0,
    targetScore: TARGET_SCORE,
    safeFoodCount: 0,
    feedbackText: '',
    gameState: 'ready',
    resultTitle: '',
    resultMessage: ''
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 0, hidden: true });
    if (this.canvasReady && this.data.gameState === 'playing' && !this.running) {
      this.startLoop();
    }
  },

  onReady() {
    this.initCanvas();
  },

  onHide() {
    this.stopLoop();
  },

  onUnload() {
    this.stopLoop();
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
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

  initCanvas() {
    wx.createSelectorQuery()
      .in(this)
      .select('#cookGameCanvas')
      .fields({ node: true, size: true })
      .exec((result) => {
        const canvasInfo = result[0];
        if (!canvasInfo || !canvasInfo.node) {
          this.showAssetError('游戏画布加载失败，请返回后重新进入。');
          return;
        }

        this.canvas = canvasInfo.node;
        this.ctx = this.canvas.getContext('2d');
        this.width = canvasInfo.width;
        this.height = canvasInfo.height;
        const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
        this.dpr = windowInfo.pixelRatio;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        this.ctx.imageSmoothingEnabled = false;

        this.loadAssets()
          .then(() => {
            this.canvasReady = true;
            this.resetRuntime();
            this.drawGame(0);
          })
          .catch(() => {
            this.showAssetError('吃饭游戏素材加载失败，请检查素材文件。');
          });
      });
  },

  loadAssets() {
    const entries = [
      ['background', ASSETS.background],
      ['dog', ASSETS.dog],
      ...FOOD_TYPES.map((food) => [food.id, food.path])
    ];
    this.images = {};
    return Promise.all(entries.map(([key, path]) => this.loadImage(key, path)));
  },

  loadImage(key, path) {
    return new Promise((resolve, reject) => {
      const image = this.canvas.createImage();
      image.onload = () => {
        this.images[key] = image;
        resolve();
      };
      image.onerror = reject;
      image.src = path;
    });
  },

  showAssetError(message) {
    this.stopLoop();
    this.setData({
      gameState: 'error',
      resultTitle: '页面没有加载完整',
      resultMessage: message
    });
  },

  resetRuntime() {
    this.score = 0;
    this.safeFoodCount = 0;
    this.entities = [];
    this.elapsed = 0;
    this.spawnCountdown = 1500;
    this.speed = Math.max(BASE_SPEED, this.width * 0.36);
    this.groundY = this.height * 0.82;
    this.dog = {
      x: this.width * 0.14,
      y: 0,
      width: Math.min(108, this.width * 0.25),
      height: Math.min(82, this.width * 0.19),
      velocityY: 0,
      jumpCount: 0
    };
    this.dog.y = this.groundY - this.dog.height;
    this.lastFrameTime = 0;
    this.setData({
      score: 0,
      safeFoodCount: 0,
      feedbackText: ''
    });
  },

  startGame() {
    if (!this.canvasReady) return;
    this.resetRuntime();
    this.setData({
      gameState: 'playing',
      resultTitle: '',
      resultMessage: ''
    });
    this.startLoop();
  },

  restartGame() {
    this.startGame();
  },

  startLoop() {
    this.stopLoop();
    this.running = true;
    this.lastFrameTime = 0;
    this.frameId = this.requestFrame((time) => this.loop(time));
  },

  stopLoop() {
    this.running = false;
    if (!this.frameId) return;
    if (this.canvas && this.canvas.cancelAnimationFrame) {
      this.canvas.cancelAnimationFrame(this.frameId);
    } else {
      clearTimeout(this.frameId);
    }
    this.frameId = null;
  },

  requestFrame(callback) {
    if (this.canvas && this.canvas.requestAnimationFrame) {
      return this.canvas.requestAnimationFrame(callback);
    }
    return setTimeout(() => callback(Date.now()), 16);
  },

  loop(time) {
    if (!this.running || this.data.gameState !== 'playing') return;
    if (!this.lastFrameTime) this.lastFrameTime = time;
    const delta = Math.min(time - this.lastFrameTime, 34);
    this.lastFrameTime = time;
    this.updateGame(delta);
    this.drawGame(time);
    if (this.data.gameState === 'playing') {
      this.frameId = this.requestFrame((nextTime) => this.loop(nextTime));
    }
  },

  updateGame(delta) {
    const seconds = delta / 1000;
    this.elapsed += delta;
    this.dog.velocityY += this.height * 2.45 * seconds;
    this.dog.y += this.dog.velocityY * seconds;
    const floorY = this.groundY - this.dog.height;
    if (this.dog.y >= floorY) {
      this.dog.y = floorY;
      this.dog.velocityY = 0;
      this.dog.jumpCount = 0;
    }

    this.spawnCountdown -= delta;
    if (this.spawnCountdown <= 0) {
      this.spawnEntity();
      this.spawnCountdown = SPAWN_DELAY_MIN + Math.random() * SPAWN_DELAY_RANGE;
    }

    const remaining = [];
    for (let index = 0; index < this.entities.length; index += 1) {
      const entity = this.entities[index];
      entity.x -= this.speed * seconds;
      if (!entity.hit && this.isColliding(entity)) {
        this.handleCollision(entity);
      }
      if (!entity.hit && entity.x + entity.width > -30) {
        remaining.push(entity);
      }
    }
    this.entities = remaining;
  },

  spawnEntity() {
    const roll = Math.random();
    if (roll < 0.4) {
      const isHigh = Math.random() > 0.5;
      const width = Math.min(34, this.width * 0.08);
      const height = isHigh
        ? Math.min(78, this.height * 0.12)
        : Math.min(46, this.height * 0.07);
      this.entities.push({
        type: 'obstacle',
        x: this.width + width,
        y: this.groundY - height,
        width,
        height
      });
      return;
    }

    const candidates = roll < 0.8
      ? FOOD_TYPES.filter((item) => item.safe)
      : FOOD_TYPES.filter((item) => !item.safe);
    const food = candidates[Math.floor(Math.random() * candidates.length)];
    const size = Math.min(48, this.width * 0.115);
    this.entities.push({
      type: 'food',
      food,
      x: this.width + size,
      y: this.groundY - this.dog.height - size * (0.55 + Math.random() * 0.9),
      width: size,
      height: size
    });
  },

  isColliding(entity) {
    const dogPaddingX = this.dog.width * 0.16;
    const dogPaddingY = this.dog.height * 0.12;
    return this.dog.x + dogPaddingX < entity.x + entity.width
      && this.dog.x + this.dog.width - dogPaddingX > entity.x
      && this.dog.y + dogPaddingY < entity.y + entity.height
      && this.dog.y + this.dog.height - dogPaddingY > entity.y;
  },

  handleCollision(entity) {
    entity.hit = true;
    if (entity.type === 'obstacle') {
      this.endGame('撞到木箱啦', '布丁先停下来休息一下，再试一次吧。');
      return;
    }

    if (!entity.food.safe) {
      this.endGame(`误食了${entity.food.name}`, '这个不能随便吃，帮布丁重新挑选吧。');
      return;
    }

    this.score += entity.food.score;
    this.safeFoodCount += 1;
    this.setData({
      score: this.score,
      safeFoodCount: this.safeFoodCount
    });
    this.showFeedback(`${entity.food.name} +${entity.food.score}`);

    if (this.score >= TARGET_SCORE) {
      this.finishGame();
    }
  },

  showFeedback(text) {
    if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
    this.setData({ feedbackText: text });
    this.feedbackTimer = setTimeout(() => {
      this.setData({ feedbackText: '' });
    }, 900);
  },

  finishGame() {
    this.stopLoop();
    this.setData({
      gameState: 'win',
      resultTitle: '布丁吃饱饱啦',
      resultMessage: `一共挑对了 ${this.safeFoodCount} 份食物，今天也有好好吃饭。`
    });
    this.drawGame(this.lastFrameTime || 0);
  },

  endGame(title, message) {
    this.stopLoop();
    this.setData({
      gameState: 'over',
      resultTitle: title,
      resultMessage: message
    });
    this.drawGame(this.lastFrameTime || 0);
  },

  jump() {
    if (this.data.gameState === 'ready') {
      this.startGame();
      return;
    }
    if (this.data.gameState !== 'playing' || !this.canvasReady) return;
    if (this.dog.jumpCount >= 2) return;
    this.dog.velocityY = -this.height * (this.dog.jumpCount === 0 ? 0.96 : 1.03);
    this.dog.jumpCount += 1;
  },

  onCanvasTouchStart(event) {
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    this.touchStartY = touch.clientY;
  },

  onCanvasTouchEnd(event) {
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch || typeof this.touchStartY !== 'number') return;
    if (touch.clientY - this.touchStartY < -28) {
      this.jump();
    }
    this.touchStartY = null;
  },

  drawGame(time) {
    if (!this.ctx || !this.images) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.drawGroundDetails();
    if (this.data.gameState !== 'ready' && this.data.gameState !== 'error') {
      this.entities.forEach((entity) => this.drawEntity(entity));
      this.drawDog(time);
    }
  },

  drawBackground() {
    const image = this.images.background;
    const imageRatio = image.width / image.height;
    const canvasRatio = this.width / this.height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.width;
    let sourceHeight = image.height;
    if (imageRatio > canvasRatio) {
      sourceWidth = image.height * canvasRatio;
      sourceX = (image.width - sourceWidth) / 2;
    } else {
      sourceHeight = image.width / canvasRatio;
      sourceY = (image.height - sourceHeight) / 2;
    }
    this.ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      this.width,
      this.height
    );
  },

  drawGroundDetails() {
    const ctx = this.ctx;
    const offset = (this.elapsed * this.speed * 0.001) % 44;
    ctx.fillStyle = 'rgba(31, 71, 54, 0.34)';
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
    for (let x = -44; x < this.width + 44; x += 44) {
      const drawX = x - offset;
      ctx.fillStyle = '#d99c35';
      ctx.fillRect(drawX, this.groundY + 18, 8, 5);
      ctx.fillStyle = '#35624a';
      ctx.fillRect(drawX + 22, this.groundY + 36, 10, 6);
    }
  },

  drawEntity(entity) {
    if (entity.type === 'food') {
      this.ctx.drawImage(
        this.images[entity.food.id],
        Math.round(entity.x),
        Math.round(entity.y),
        entity.width,
        entity.height
      );
      return;
    }

    const unit = entity.width / 8;
    const ctx = this.ctx;
    ctx.fillStyle = '#71451f';
    ctx.fillRect(entity.x, entity.y, entity.width, entity.height);
    ctx.fillStyle = '#a66b2c';
    ctx.fillRect(entity.x + unit, entity.y + unit, entity.width - unit * 2, entity.height - unit * 2);
    ctx.fillStyle = '#5a3218';
    ctx.fillRect(entity.x + unit * 3.4, entity.y, unit * 1.2, entity.height);
    ctx.fillRect(entity.x, entity.y + unit * 3.4, entity.width, unit * 1.2);
  },

  drawDog(time) {
    const bounce = this.dog.y + this.dog.height >= this.groundY
      ? Math.sin((time || 0) * 0.012) * 2
      : 0;
    const shadowWidth = this.dog.width * 0.7;
    this.ctx.fillStyle = 'rgba(35, 21, 12, 0.26)';
    this.ctx.fillRect(
      this.dog.x + (this.dog.width - shadowWidth) / 2,
      this.groundY - 4,
      shadowWidth,
      7
    );
    this.ctx.drawImage(
      this.images.dog,
      Math.round(this.dog.x),
      Math.round(this.dog.y + bounce),
      this.dog.width,
      this.dog.height
    );
  }
});
