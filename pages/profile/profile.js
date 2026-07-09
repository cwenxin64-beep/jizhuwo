Page({
  data: {
    layout: getApp().globalData.layout,
    heartLit: false,
    warmMode: true,
    memoryReminder: true,
    panelVisible: false,
    panelTitle: '',
    panelCopy: '',
    panelItems: [],
    menu: [
      {
        title: '隐私保护中心',
        desc: '照片、位置和回忆权限',
        copy: '这里集中展示当前原型里的权限说明，方便之后接真实设置。',
        items: ['照片：仅用于相册与形象实验室', '位置：仅用于散步路线展示', '回忆：只在本机原型中展示']
      },
      {
        title: '数据资产管理',
        desc: '导出相册与纪念记录',
        copy: '把布丁的照片、故事和纪念日整理成一份可导出的清单。',
        items: ['相册记录 12 条', '纪念故事 4 篇', '散步足迹 3 次']
      },
      {
        title: '集市订单',
        desc: '查看心愿单和订单',
        copy: '这里展示已经加入心愿单的纪念小物，后续可以接真实订单。',
        items: ['云朵芝士冻干', '万寿菊曲奇', '南瓜舒心棒']
      }
    ]
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 3, hidden: false });
  },
  tapHeart() {
    this.setData({
      heartLit: !this.data.heartLit,
      panelVisible: true,
      panelTitle: '今日心意',
      panelCopy: '你把今天的想念轻轻放进了花桥。',
      panelItems: ['已点亮一枚小心心', '布丁的陪伴值 +1']
    });
  },
  openPetFile() {
    this.setData({
      panelVisible: true,
      panelTitle: '萌宠档案',
      panelCopy: '这里可以集中管理已经建立纪念档案的小伙伴。',
      panelItems: ['布丁 · 柯基 · 守护 421 天', '玛呜 · 猫咪 · 星光回忆']
    });
  },
  toggleSwitch(event) {
    const key = event.currentTarget.dataset.key;
    if (!key) return;
    this.setData({
      [key]: !this.data[key],
      panelVisible: true,
      panelTitle: key === 'warmMode' ? '温暖模式' : '纪念提醒',
      panelCopy: key === 'warmMode'
        ? '界面会保持低刺激、暖色和柔和动效。'
        : '重要日期会以轻提醒的方式出现。',
      panelItems: [this.data[key] ? '已关闭' : '已开启']
    });
  },
  openMenu(event) {
    const item = this.data.menu[Number(event.currentTarget.dataset.index)];
    if (!item) return;
    this.setData({
      panelVisible: true,
      panelTitle: item.title,
      panelCopy: item.copy,
      panelItems: item.items
    });
  },
  closePanel() {
    this.setData({ panelVisible: false });
  }
});
