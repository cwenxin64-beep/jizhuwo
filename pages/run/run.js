Page({
  data: {
    layout: getApp().globalData.layout,
    heartLit: false,
    activeTool: ''
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 0, hidden: true });
  },
  goHome() {
    wx.switchTab({ url: '/pages/home/home' });
  },
  tapHeart() {
    this.setData({
      heartLit: !this.data.heartLit
    });
    wx.showToast({
      title: this.data.heartLit ? '已收藏这段路' : '已取消收藏',
      icon: 'none'
    });
  },
  chooseTool(event) {
    const tool = event.currentTarget.dataset.tool;
    this.setData({ activeTool: tool });
    wx.showToast({
      title: tool === 'music' ? '已开启陪跑音乐' : '装备已经准备好',
      icon: 'none'
    });
  }
});
