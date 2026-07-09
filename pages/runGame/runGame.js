const RESERVED_ASSETS = {
  dog: '/assets/game/dog_run.png',
  tileset: '/assets/game/tileset.png',
  collect: '/assets/game/sprites_collect.png',
  obstacle: '/assets/game/sprites_obstacle.png'
};

const MEMORY_PHRASES = [
  '晚风替你把思念带回小屋。',
  '有些脚印，会在心里一直发光。',
  '它跑过的地方，花会慢慢开。',
  '今晚的花桥，也在等你们回家。'
];

Page({
  data: {
    layout: getApp().globalData.layout,
    score: 0,
    petals: 0,
    lives: [0, 1, 2],
    memoryText: '',
    gameOver: false,
    tutorialVisible: true,
    gameStarted: false
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ hidden: true });
    if (this.canvas && this.data.gameStarted && !this.gameOver && !this.running) {
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
    if (this.memoryTimer) clearTimeout(this.memoryTimer);
  },

  initCanvas() {
    wx.createSelectorQuery()
      .in(this)
      .select('#runGameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvasInfo = res[0];
        this.canvas = canvasInfo.node;
        this.ctx = this.canvas.getContext('2d');
        this.dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
        this.width = canvasInfo.width;
        this.height = canvasInfo.height;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);
        this.ctx.imageSmoothingEnabled = false;
        this.pixel = Math.max(4, Math.floor(this.width / 96));
        this.reservedAssets = RESERVED_ASSETS;
        this.resetGame();
        this.drawGame(0);
      });
  },

  resetGame() {
    const roadWidth = this.width * 0.72;
    const roadLeft = (this.width - roadWidth) / 2;
    const laneWidth = roadWidth / 3;
    this.lanes = [0, 1, 2].map((index) => roadLeft + laneWidth * (index + 0.5));
    this.roadLeft = roadLeft;
    this.roadRight = roadLeft + roadWidth;
    this.laneWidth = laneWidth;
    this.playerLane = 1;
    this.playerY = this.height - 92;
    this.playerSize = Math.min(46, this.width * 0.12);
    this.entities = [];
    this.score = 0;
    this.petals = 0;
    this.life = 3;
    this.speed = 0.19;
    this.bgOffset = 0;
    this.spawnTimer = 360;
    this.jumpEndTime = 0;
    this.invincibleUntil = 0;
    this.lastHudSync = 0;
    this.distanceBuffer = 0;
    this.gameOver = false;
    if (this.memoryTimer) {
      clearTimeout(this.memoryTimer);
      this.memoryTimer = null;
    }
    this.setData({
      score: 0,
      petals: 0,
      lives: [0, 1, 2],
      memoryText: '',
      gameOver: false
    });
  },

  startGame() {
    if (!this.canvas || this.data.gameStarted) return;
    this.setData({
      tutorialVisible: false,
      gameStarted: true
    });
    this.startLoop();
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
    if (!this.running) return;
    if (!this.lastFrameTime) this.lastFrameTime = time;
    this.currentFrameTime = time;
    const delta = Math.min(time - this.lastFrameTime, 34);
    this.lastFrameTime = time;
    this.updateGame(delta, time);
    this.drawGame(time);
    if (!this.gameOver) {
      this.frameId = this.requestFrame((nextTime) => this.loop(nextTime));
    }
  },

  updateGame(delta, time) {
    this.speed = Math.min(0.34, this.speed + delta * 0.000004);
    this.bgOffset += this.speed * delta;
    this.distanceBuffer += delta * 0.01;
    if (this.distanceBuffer >= 1) {
      const addScore = Math.floor(this.distanceBuffer);
      this.distanceBuffer -= addScore;
      this.score += addScore;
    }

    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnEntity();
      this.spawnTimer = 520 + Math.random() * 360 - this.speed * 620;
    }

    const nextEntities = [];
    this.entities.forEach((item) => {
      item.y += this.speed * delta;
      if (!item.hit && this.isColliding(item, time)) {
        this.handleCollision(item, time);
      }
      if (!item.hit && item.y < this.height + 80) nextEntities.push(item);
    });
    this.entities = nextEntities;

    if (time - this.lastHudSync > 160) this.syncHud(time);
  },

  spawnEntity() {
    const lane = Math.floor(Math.random() * 3);
    const isCollect = Math.random() < 0.62;
    if (isCollect) {
      const types = [
        { kind: 'petal', score: 12, size: 26 },
        { kind: 'bone', score: 28, size: 30 },
        { kind: 'memory', score: 60, size: 30 }
      ];
      const type = types[Math.floor(Math.random() * types.length)];
      this.entities.push({
        type: 'collect',
        lane,
        y: -50,
        ...type
      });
      return;
    }

    const obstacles = [
      { kind: 'puddle', low: true, size: 42 },
      { kind: 'leaves', low: true, size: 44 },
      { kind: 'stone', low: false, size: 38 },
      { kind: 'fence', low: false, size: 48 }
    ];
    const obstacle = obstacles[Math.floor(Math.random() * obstacles.length)];
    this.entities.push({
      type: 'obstacle',
      lane,
      y: -60,
      ...obstacle
    });
  },

  isColliding(item, time) {
    if (item.lane !== this.playerLane) return false;
    const distance = Math.abs(item.y - this.playerY);
    return distance < (item.size + this.playerSize) * 0.48;
  },

  handleCollision(item, time) {
    if (item.type === 'collect') {
      item.hit = true;
      this.score += item.score;
      if (item.kind === 'petal') this.petals += 1;
      if (item.kind === 'memory') this.showMemoryPhrase();
      this.syncHud(time, true);
      return;
    }

    if (item.low && this.isJumping(time)) {
      item.hit = true;
      this.score += 8;
      this.syncHud(time, true);
      return;
    }

    if (time < this.invincibleUntil) return;
    item.hit = true;
    this.life -= 1;
    this.invincibleUntil = time + 900;
    if (this.life <= 0) {
      this.endGame();
      return;
    }
    this.syncHud(time, true);
  },

  syncHud(time, force = false) {
    if (!force && time - this.lastHudSync < 160) return;
    this.lastHudSync = time;
    this.setData({
      score: this.score,
      petals: this.petals,
      lives: Array.from({ length: this.life }, (_, index) => index)
    });
  },

  showMemoryPhrase() {
    const text = MEMORY_PHRASES[Math.floor(Math.random() * MEMORY_PHRASES.length)];
    if (this.memoryTimer) clearTimeout(this.memoryTimer);
    this.setData({ memoryText: text });
    this.memoryTimer = setTimeout(() => {
      this.setData({ memoryText: '' });
    }, 1600);
  },

  endGame() {
    this.gameOver = true;
    this.setData({
      score: this.score,
      petals: this.petals,
      lives: [],
      gameOver: true,
      gameStarted: false
    });
  },

  restartGame() {
    this.resetGame();
    this.setData({
      tutorialVisible: false,
      gameStarted: true
    });
    this.startLoop();
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },

  onTouchStart(event) {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  },

  onTouchEnd(event) {
    if (!this.data.gameStarted || this.gameOver) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 28) {
      this.moveLane(dx > 0 ? 1 : -1);
      return;
    }
    if (dy < -26) this.jump();
  },

  moveLane(direction) {
    this.playerLane = Math.max(0, Math.min(2, this.playerLane + direction));
  },

  jump() {
    if (!this.data.gameStarted || this.gameOver) return;
    const now = this.currentFrameTime || this.lastFrameTime || 0;
    if (now < this.jumpEndTime) return;
    this.jumpEndTime = now + 620;
  },

  isJumping(time) {
    return time < this.jumpEndTime;
  },

  getJumpOffset(time) {
    if (!this.isJumping(time)) return 0;
    const progress = 1 - (this.jumpEndTime - time) / 620;
    return Math.sin(progress * Math.PI) * 54;
  },

  drawGame(time) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.entities.forEach((item) => this.drawEntity(item));
    this.drawDog(time);
  },

  drawBackground() {
    const ctx = this.ctx;
    const p = this.pixel;
    ctx.fillStyle = '#315737';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#75502c';
    ctx.fillRect(this.roadLeft, 0, this.roadRight - this.roadLeft, this.height);
    ctx.fillStyle = '#8c6235';
    ctx.fillRect(this.roadLeft + p * 2, 0, this.roadRight - this.roadLeft - p * 4, this.height);

    for (let i = 1; i < 3; i += 1) {
      const x = this.roadLeft + this.laneWidth * i;
      this.drawDashedStones(x, p);
    }

    const step = p * 12;
    const offset = this.bgOffset % step;
    for (let y = -step; y < this.height + step; y += step) {
      const yy = y + offset;
      this.drawRoadPebbles(yy, p);
      this.drawFenceRow(yy, p);
      this.drawFlowers(yy, p);
      this.drawLantern(yy, p);
    }
  },

  drawDashedStones(x, p) {
    const offset = this.bgOffset % (p * 16);
    for (let y = -p * 16; y < this.height + p * 16; y += p * 16) {
      this.pixelRect(x - p, y + offset, p * 2, p * 5, '#d9a65a');
    }
  },

  drawRoadPebbles(y, p) {
    const colors = ['#b78242', '#d19a50', '#5c3a24'];
    for (let i = 0; i < 6; i += 1) {
      const laneX = this.roadLeft + p * 7 + i * this.laneWidth * 0.48;
      this.pixelRect(laneX, y + (i % 3) * p * 3, p * 2, p * 2, colors[i % colors.length]);
    }
  },

  drawFenceRow(y, p) {
    const left = this.roadLeft - p * 8;
    const right = this.roadRight + p * 5;
    this.pixelRect(left, y, p * 3, p * 10, '#6b3d1d');
    this.pixelRect(right, y + p * 5, p * 3, p * 10, '#6b3d1d');
    this.pixelRect(left - p, y + p * 4, p * 8, p * 2, '#9b612d');
    this.pixelRect(right - p, y + p * 9, p * 8, p * 2, '#9b612d');
  },

  drawFlowers(y, p) {
    const leftX = p * 6 + (Math.floor(y / p) % 3) * p * 2;
    const rightX = this.width - p * 11 - (Math.floor(y / p) % 4) * p;
    this.drawMarigold(leftX, y + p * 6, p);
    this.drawMarigold(rightX, y + p * 2, p);
  },

  drawLantern(y, p) {
    if (Math.floor(y / (p * 12)) % 3 !== 0) return;
    const x = this.roadRight + p * 12;
    this.pixelRect(x, y + p, p * 3, p * 5, '#3c2414');
    this.pixelRect(x + p, y + p * 2, p * 4, p * 6, '#f2b744');
    this.pixelRect(x + p * 2, y + p * 3, p * 2, p * 3, '#ffe29a');
  },

  drawEntity(item) {
    const x = this.lanes[item.lane];
    if (item.type === 'collect') {
      if (item.kind === 'petal') this.drawPetal(x, item.y);
      if (item.kind === 'bone') this.drawBone(x, item.y);
      if (item.kind === 'memory') this.drawMemoryShard(x, item.y);
      return;
    }

    if (item.kind === 'puddle') this.drawPuddle(x, item.y);
    if (item.kind === 'leaves') this.drawLeaves(x, item.y);
    if (item.kind === 'stone') this.drawStone(x, item.y);
    if (item.kind === 'fence') this.drawFenceObstacle(x, item.y);
  },

  drawPetal(x, y) {
    const p = this.pixel;
    this.pixelRect(x - p * 2, y - p, p * 2, p * 2, '#ffb51e');
    this.pixelRect(x, y - p * 2, p * 2, p * 2, '#f37724');
    this.pixelRect(x + p * 2, y, p * 2, p * 2, '#ffd35a');
    this.pixelRect(x - p, y + p * 2, p * 2, p * 2, '#f37724');
  },

  drawBone(x, y) {
    const p = this.pixel;
    this.pixelRect(x - p * 4, y - p, p * 8, p * 2, '#ffe3a1');
    this.pixelRect(x - p * 6, y - p * 2, p * 3, p * 3, '#f7cf7a');
    this.pixelRect(x + p * 3, y - p * 2, p * 3, p * 3, '#f7cf7a');
  },

  drawMemoryShard(x, y) {
    const p = this.pixel;
    this.pixelRect(x - p, y - p * 4, p * 2, p * 2, '#7bd2ff');
    this.pixelRect(x - p * 3, y - p * 2, p * 6, p * 4, '#4d7ad9');
    this.pixelRect(x - p, y + p * 2, p * 2, p * 2, '#d7a6ff');
  },

  drawPuddle(x, y) {
    const p = this.pixel;
    this.pixelRect(x - p * 6, y - p * 2, p * 12, p * 5, '#315f7f');
    this.pixelRect(x - p * 3, y - p, p * 8, p * 3, '#5797ad');
    this.pixelRect(x + p, y, p * 3, p, '#b7dfd5');
  },

  drawLeaves(x, y) {
    const p = this.pixel;
    this.pixelRect(x - p * 6, y - p, p * 12, p * 4, '#8f4d1f');
    this.pixelRect(x - p * 4, y - p * 3, p * 4, p * 3, '#c06b24');
    this.pixelRect(x + p, y - p * 2, p * 4, p * 3, '#d68a2b');
  },

  drawStone(x, y) {
    const p = this.pixel;
    this.pixelRect(x - p * 5, y - p * 4, p * 10, p * 8, '#6a6654');
    this.pixelRect(x - p * 3, y - p * 3, p * 6, p * 5, '#9b9275');
    this.pixelRect(x + p, y - p, p * 2, p * 2, '#d6c99a');
  },

  drawFenceObstacle(x, y) {
    const p = this.pixel;
    this.pixelRect(x - p * 8, y - p * 4, p * 16, p * 3, '#9b612d');
    this.pixelRect(x - p * 8, y + p * 2, p * 16, p * 3, '#71411f');
    this.pixelRect(x - p * 6, y - p * 7, p * 3, p * 12, '#b77a35');
    this.pixelRect(x + p * 3, y - p * 7, p * 3, p * 12, '#b77a35');
  },

  drawDog(time) {
    const p = this.pixel;
    const x = this.lanes[this.playerLane];
    const jumpOffset = this.getJumpOffset(time);
    const y = this.playerY - jumpOffset;
    if (time < this.invincibleUntil && Math.floor(time / 90) % 2 === 0) return;

    this.pixelRect(x - p * 6, this.playerY + p * 6, p * 12, p * 3, 'rgba(30, 18, 10, 0.36)');
    this.pixelRect(x - p * 5, y - p * 5, p * 10, p * 11, '#d79b55');
    this.pixelRect(x - p * 6, y - p * 4, p * 3, p * 7, '#7b3f22');
    this.pixelRect(x + p * 3, y - p * 4, p * 3, p * 7, '#7b3f22');
    this.pixelRect(x - p * 3, y - p * 2, p * 2, p * 2, '#211108');
    this.pixelRect(x + p, y - p * 2, p * 2, p * 2, '#211108');
    this.pixelRect(x - p, y + p, p * 2, p * 2, '#3a1d0e');
    this.pixelRect(x + p * 5, y + p * 2, p * 4, p * 2, '#f3c06b');
    this.pixelRect(x - p * 4, y + p * 6, p * 3, p * 3, '#5c2d18');
    this.pixelRect(x + p, y + p * 6, p * 3, p * 3, '#5c2d18');
  },

  drawMarigold(x, y, p) {
    this.pixelRect(x, y, p * 2, p * 2, '#ffd45d');
    this.pixelRect(x - p * 2, y, p * 2, p * 2, '#ee7b22');
    this.pixelRect(x + p * 2, y, p * 2, p * 2, '#ee7b22');
    this.pixelRect(x, y - p * 2, p * 2, p * 2, '#ee7b22');
    this.pixelRect(x, y + p * 2, p * 2, p * 2, '#ee7b22');
  },

  pixelRect(x, y, width, height, color) {
    const p = this.pixel;
    const left = Math.round(x / p) * p;
    const top = Math.round(y / p) * p;
    const w = Math.max(p, Math.round(width / p) * p);
    const h = Math.max(p, Math.round(height / p) * p);
    this.ctx.fillStyle = color;
    this.ctx.fillRect(left, top, w, h);
  }
});
