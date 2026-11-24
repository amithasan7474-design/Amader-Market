export type LangCode = 'bn' | 'en';
export type ThemeMode =
  | 'light'
  | 'dark'
  | 'cyber_violet'
  | 'carbon_amber'
  | 'nordic_slate'
  | 'sunset_coral'
  | 'royal_indigo'
  | 'forest_jade';

export type AppView =
  | 'home'
  | 'shop'
  | 'details'
  | 'store'
  | 'orders'
  | 'wishlist'
  | 'account'
  | 'control'
  | 'auth';

export type ControlTab =
  | 'overview'
  | 'products'
  | 'editor'
  | 'approvals'
  | 'orders'
  | 'inbox'
  | 'wallet'
  | 'users'
  | 'reviews'
  | 'site_settings';

export type UserRole =
  | 'guest'
  | 'user'
  | 'merchant'
  | 'seller'
  | 'moderator'
  | 'manager'
  | 'partner'
  | 'admin'
  | 'super_admin';

export interface AdBanner {
  image: string;
  link?: string;
  active?: boolean;
}

export interface Coupon {
  code: string;
  discount: number;
  type: 'percent' | 'fixed';
  minAmount: number;
}

export interface SiteSettings {
  defaultTheme?: ThemeMode;
  enableCampaign11?: boolean;
  campaign11Title?: string;
  campaign11DurationHours?: number;
  campaign11EndTime?: number;
  enableFlashSale?: boolean;
  telecomAutoScroll?: boolean;
  telecomScrollSpeed?: 'slow' | 'normal' | 'fast' | 'super_fast';
  autoShuffleActive?: boolean;
  autoShuffleSeconds?: number;
  enableDedicatedStore?: boolean;
  storeActivationFee?: string | number;
  enableOrderPreview?: boolean;
  appName: string;
  loadingText?: string;
  logo?: string;
  footerLogo?: string;
  footerTitle?: string;
  footerSubtitle?: string;
  footerDesc?: string;
  facebook?: string;
  youtube?: string;
  contactEmail?: string;
  contactPhone?: string;
  adminName?: string;
  adminWaNumber?: string;
  copyrightYear?: string;
  footerCopyright?: string;
  footerCredit?: string;
  showFooter?: boolean;
  showFloatingWhatsapp?: boolean;
  footerCustomized?: boolean;
  topSloganText?: string;
  topSloganActive?: boolean;
  digitalLoginWarning?: string;
  androidAppLink?: string;
  androidBtnText?: string;
  iosAppLink?: string;
  iosBtnText?: string;
  desktopAppLink?: string;
  desktopBtnText?: string;
  totalDeliveredOrders?: number;
  totalSalesAmount?: number;
  totalProfitAmount?: number;
  noticeText?: string;
  noticeActive?: boolean;
  noticeSpeed?: 'super_slow' | 'slow' | 'normal' | 'fast';
  enableCOD?: boolean;
  enableAdvance?: boolean;
  enableTelecomSection?: boolean;
  enableDataPackageSelling?: boolean;
  maintenance?: boolean;
  registration?: boolean;
  showClock?: boolean;
  showSearch?: boolean;
  advanceBkash?: string;
  advanceBkashType?: string;
  advanceNagad?: string;
  advanceNagadType?: string;
  storeBkash?: string;
  storeBkashType?: string;
  storeNagad?: string;
  storeNagadType?: string;
  enableLoyaltyReward?: boolean;
  enableProductPromo?: boolean;
  partnerStrictMode?: boolean;
  managerBonusAmount?: number;
  managerMinOrderValue?: number;
  enableLoadingAnim?: boolean;
  enableOfflineOverlay?: boolean;
  categories?: string[];
  telecomCategories?: string[];
  ads?: AdBanner[];
  coupons?: Coupon[];
  globalFontSize?: number;
  enableWallet?: boolean;
  autoScrollBanner?: boolean;
  imgbbApiKey?: string;
  enableStaffSuperAdminChat?: boolean;
  showHeroCard?: boolean;
  mainSuperAdminSupportPhone?: string;
  assistantSuperAdminSupportPhone?: string;
}

export interface ProductVariation {
  label: string;
  price: number;
  vipNumbers?: string[];
}

export interface DigitalLink {
  label?: string;
  title?: string;
  url: string;
}

export interface DigitalTextItem {
  title?: string;
  text: string;
}

export interface VideoLink {
  title?: string;
  url: string;
}

export interface ProductReview {
  reviewId?: string | number;
  userId?: string;
  userName?: string;
  rating: number;
  comment: string;
  date: number;
}

export interface HouseData {
  title: string;
  category: string;
  location?: string;
  description?: string;
  rent: number;
  oldPrice?: number;
  stock?: number;
  status: 'approved' | 'pending' | 'rejected' | string;
  featured?: boolean;
  productType?:
    | 'physical'
    | 'digital'
    | 'liquid_weight'
    | 'clothing_size'
    | 'telecom'
    | 'vip_sim'
    | 'data_package';
  telecomCompany?: string;
  offerValidity?: string;
  saleType?: 'regular' | 'flash';
  flashPrice?: number;
  flashDuration?: number;
  flashEndTime?: number;
  campaign11?: {
    active: boolean;
    discount: number;
    type: 'percent' | 'fixed' | 'flat';
    stock?: number;
    stockTotal?: number;
    stockSold?: number;
  };
  promoCode?: {
    code: string;
    discount: number;
    type: 'percent' | 'fixed';
  };
  moq?: number;
  deliveryChargeDhaka?: number;
  deliveryChargeOutside?: number;
  freeDeliveryMinQty?: number;
  freeDeliveryMinAmount?: number;
  variations?: ProductVariation[];
  imageLinks?: string[];
  videoLinks?: VideoLink[];
  digitalLinks?: DigitalLink[];
  digitalTexts?: DigitalTextItem[];
  digitalExpiryHours?: number | string;
  secretInfo?: string;
  ownerName?: string;
  ownerId?: string;
  ownerPhone?: string;
  storeName?: string;
  storeLogo?: string;
  views?: number;
  paymentSettings?: {
    method: 'both' | 'cod' | 'advance';
    bkash?: string;
    bkashType?: string;
    nagad?: string;
    nagadType?: string;
  };
  reviews?: Record<string, ProductReview> | ProductReview[];
}

export interface HouseAdminHiddenData {
  wholesalePrice?: number | string;
  notes?: string;
  ownerPhone?: string;
  digitalSecret?: string;
  digitalLinks?: DigitalLink[];
  digitalTexts?: DigitalTextItem[];
}

export interface HouseItem {
  id: string;
  ownerId?: string;
  createdAt?: number;
  data: HouseData;
  adminHiddenData?: HouseAdminHiddenData;
}

export interface CartItem {
  id: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  variation?: ProductVariation | null;
  sellerId?: string;
}

export interface OrderItem {
  orderId: string;
  userId: string;
  userEmail?: string;
  name: string;
  phone: string;
  message?: string;
  reference?: string;
  paymentMethod: 'COD' | 'Advance' | string;
  paymentProvider?: string;
  trxId?: string;
  senderNumber?: string;
  status: 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled' | string;
  createdAt: number;
  isCart?: boolean;
  cartItems?: CartItem[];
  houseId?: string;
  sellerId?: string;
  quantity?: number;
  selectedVariation?: ProductVariation | null;
  totalPrice: number;
  productTotal?: number;
  profit?: number;
  offerTargetNumber?: string;
  isTelecomOffer?: boolean;
  appliedPromoCode?: string;
  promoDiscount?: number;
  hiddenFromAdmin?: boolean;
  adminDeletedAt?: number;
  updatedAt?: number;
}

export interface UserProfile {
  uid: string;
  email?: string;
  name?: string;
  phone?: string;
  role?: UserRole;
  profilePic?: string;
  storeName?: string;
  storeLogo?: string;
  isStoreActive?: boolean;
  walletBalance?: number;
  createdAt?: number;
  lastLogin?: number;
  lastActive?: number;
  isOnline?: boolean;
  wishlist?: string[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole?: string;
  isBot?: boolean;
  text: string;
  timestamp: number;
}

export interface ChatThread {
  chatId: string;
  otherUid: string;
  otherName: string;
  otherPic?: string;
  lastMessage?: string;
  lastSender?: string;
  lastTimestamp?: number;
  unread?: number;
  isSupport?: boolean;
}

export interface WithdrawalItem {
  id: string;
  uid: string;
  userName?: string;
  amount: number;
  method: string;
  type?: string;
  account: string;
  status: 'Pending' | 'Paid' | 'Sent' | 'Rejected' | 'Disputed' | string;
  timestamp: number;
}

export interface StoreRequest {
  id: string;
  uid: string;
  userName?: string;
  storeName: string;
  storeLogo?: string;
  phone?: string;
  method?: string;
  trxId?: string;
  senderNumber?: string;
  amount?: number;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  timestamp: number;
}

export interface PartnerRequest {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  timestamp: number;
}

export interface AdminActionRequest {
  id: string;
  actionType:
    | 'delete_product'
    | 'edit_product'
    | 'delete_order'
    | 'delete_review'
    | 'delete_user';
  targetId: string;
  targetTitle: string;
  reviewId?: string | number;
  productData?: HouseData;
  wholesalePrice?: number;
  adminHiddenData?: HouseAdminHiddenData;
  requestedByUid: string;
  requestedByName: string;
  requestedByEmail?: string;
  requestedByRole: string;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  timestamp: number;
}

