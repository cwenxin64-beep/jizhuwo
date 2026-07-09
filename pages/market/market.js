const goodsList = [
  { name: '云朵芝士冻干', price: '42', old: '58', note: '它曾最爱的味道', image: '/assets/market/cheese.jpg', category: '日常', added: false },
  { name: '星空牛肉干', price: '38', old: '48', note: '咬下一口唤醒回忆', image: '/assets/market/beef.jpg', category: '训练', added: false },
  { name: '万寿菊曲奇', price: '56', old: '68', note: '节日限定', image: '/assets/market/marigold-cookie.jpg', category: '散步', added: false },
  { name: '南瓜舒心棒', price: '29', old: '39', note: '温柔安抚', image: '/assets/market/pumpkin.jpg', category: '安抚', added: false }
];

Page({
  data: {
    layout: getApp().globalData.layout,
    categories: ['日常', '训练', '散步', '安抚'],
    activeCategory: '日常',
    goods: goodsList,
    visibleGoods: goodsList,
    wishlist: [],
    wishCount: 0,
    wishlistOpen: false
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 2, hidden: false });
  },
  chooseCategory(event) {
    const activeCategory = event.currentTarget.dataset.name;
    this.setData({
      activeCategory,
      visibleGoods: activeCategory === '日常'
        ? this.data.goods
        : this.data.goods.filter((item) => item.category === activeCategory)
    });
  },
  addCart(event) {
    const visibleIndex = Number(event.currentTarget.dataset.index);
    const target = this.data.visibleGoods[visibleIndex];
    if (!target) return;

    const goods = this.data.goods.map((item) => (
      item.name === target.name ? { ...item, added: true } : item
    ));
    const wishlist = goods.filter((item) => item.added);
    this.setData({
      goods,
      visibleGoods: this.data.activeCategory === '日常'
        ? goods
        : goods.filter((item) => item.category === this.data.activeCategory),
      wishlist,
      wishCount: wishlist.length,
      wishlistOpen: true
    });
  },
  toggleWishlist() {
    this.setData({ wishlistOpen: !this.data.wishlistOpen });
  }
});
