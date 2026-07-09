Page({
  data: {
    layout: getApp().globalData.layout,
    activeAction: 'fire',
    statusTitle: '壁炉亮起来了',
    statusDesc: '客厅变暖，布丁会在沙发旁慢慢放松。'
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 0, hidden: true });
  },
  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: '/pages/home/home' });
  },
  lightFire() {
    this.setData({
      activeAction: 'fire',
      statusTitle: '壁炉亮起来了',
      statusDesc: '客厅变暖，布丁会在沙发旁慢慢放松。'
    });
  },
  tellStory() {
    this.setData({
      activeAction: 'story',
      statusTitle: '故事时间',
      statusDesc: '轻声讲一段回忆，陪它把今晚慢慢过完。'
    });
  },
  restTogether() {
    this.setData({
      activeAction: 'rest',
      statusTitle: '一起休息',
      statusDesc: '灯光暗下来，客厅进入安静陪伴状态。'
    });
  }
});
