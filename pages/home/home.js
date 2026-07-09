Page({
  data: {
    layout: getApp().globalData.layout,
    tapEffect: ''
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 0, hidden: true });
    this.setData({ tapEffect: '' });
  },
  goWalk() {
    wx.navigateTo({ url: '/pages/walk/walk' });
  },
  goCook() {
    this.goWithRoomEffect('kitchen', '/pages/cook/cook');
  },
  goBath() {
    this.goWithRoomEffect('bath', '/pages/bath/bath');
  },
  goLiving() {
    this.goWithRoomEffect('living', '/pages/livingRoom/livingRoom');
  },
  goAlbum() {
    wx.switchTab({ url: '/pages/album/album' });
  },
  goMarket() {
    wx.switchTab({ url: '/pages/market/market' });
  },
  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  },
  goWithRoomEffect(effect, url) {
    if (this.effectTimer) clearTimeout(this.effectTimer);
    this.setData({ tapEffect: effect });
    this.effectTimer = setTimeout(() => {
      this.setData({ tapEffect: '' });
      wx.navigateTo({ url });
    }, 180);
  }
});
