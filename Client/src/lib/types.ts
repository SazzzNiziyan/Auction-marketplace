// Shapes returned by the Auctio REST API (backend/src/modules/*). Only the
// fields the UI reads are declared; everything else is passed through.

export type ListingType = 'FIXED_PRICE' | 'AUCTION';
export type ListingStatus = 'DRAFT' | 'PENDING_MODERATION' | 'ACTIVE' | 'PAUSED' | 'SOLD' | 'UNSOLD' | 'REMOVED';
export type AuctionStatus = 'SCHEDULED' | 'DEPOSIT_OPEN' | 'LIVE' | 'CLOSING' | 'ENDED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUND_APPROVED'
  | 'REFUNDED';

export interface ApiImage {
  id?: string;
  imageUrl: string;
  thumbUrl?: string | null;
  altText?: string | null;
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  children?: ApiCategory[];
  _count?: { listings?: number; children?: number };
}

export interface ApiAuctionSummary {
  id: string;
  status: AuctionStatus;
  startingBidPaise?: number;
  currentHighBidPaise?: number | null;
  reservePricePaise?: number | null;
  buyNowPricePaise?: number | null;
  depositAmountPaise?: number;
  bidCount?: number;
  scheduledStartAt?: string;
  scheduledEndAt: string;
  winnerId?: string | null;
  winningBidPaise?: number | null;
}

export interface ApiSellerRef {
  id?: string;
  profile?: { displayName?: string | null; avatarUrl?: string | null; city?: string | null; state?: string | null } | null;
  sellerProfile?: { businessName?: string | null; isVerified?: boolean; avgRating?: string | number; totalSales?: number } | null;
}

export interface ApiListing {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status?: ListingStatus;
  type: ListingType;
  condition?: string;
  priceInPaise?: number | null;
  stockQuantity?: number;
  shippingNote?: string | null;
  tags?: string[];
  viewCount?: number;
  createdAt?: string;
  sellerId?: string;
  seller?: ApiSellerRef;
  category?: { id?: string; name: string; slug: string } | null;
  images?: ApiImage[];
  auction?: ApiAuctionSummary | null;
  _count?: { watchlistItems?: number };
}

export interface ApiOrderItem {
  id: string;
  listingId?: string;
  quantity: number;
  unitPriceInPaise: number;
  snapshotTitle: string;
  snapshotImageUrl?: string | null;
  listing?: { id: string; title: string; images?: ApiImage[] } | null;
}

export interface ApiShipment {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  estimatedDelivery?: string | null;
}

export interface ApiStatusHistory {
  id: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  note?: string | null;
  createdAt: string;
}

export interface ShippingAddress {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  note?: string;
}

export interface ApiOrder {
  id: string;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  totalPaise: number;
  shippingAddress?: ShippingAddress | null;
  notes?: string | null;
  refundReason?: string | null;
  refundEvidenceUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: ApiOrderItem[];
  shipments?: ApiShipment[];
  statusHistory?: ApiStatusHistory[];
  seller?: ApiSellerRef & { email?: string };
  buyer?: ApiSellerRef & { email?: string; profile?: { displayName?: string | null; phone?: string | null } | null };
  payments?: Array<{ id: string; status: string; amountPaise: number; razorpayOrderId?: string | null }>;
}

export interface ApiCartItem {
  id: string;
  quantity: number;
  listing: ApiListing & { sellerId: string };
}

export interface ApiCart {
  items: ApiCartItem[];
  sellerGroups: Array<{
    sellerId: string;
    sellerName: string;
    items: ApiCartItem[];
    subtotalPaise: number;
    shippingPaise: number;
  }>;
  totalSubtotalPaise: number;
  totalShippingPaise: number;
  grandTotalPaise: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ─── Card model ─────────────────────────────────────────────────────────── */

export interface CardListing {
  id: string;
  title: string;
  imageUrl?: string;
  categoryName?: string;
  sellerName?: string;
  condition?: string;
  type: ListingType;
  pricePaise: number;
  auctionId?: string;
  auctionStatus?: AuctionStatus;
  endsAt?: string;
  bidCount?: number;
}

export function sellerDisplayName(seller?: ApiSellerRef | null) {
  return seller?.sellerProfile?.businessName || seller?.profile?.displayName || 'Verified seller';
}

export function toCardListing(l: ApiListing): CardListing {
  const auction = l.auction || undefined;
  return {
    id: l.id,
    title: l.title,
    imageUrl: l.images?.[0]?.imageUrl,
    categoryName: l.category?.name,
    sellerName: l.seller ? sellerDisplayName(l.seller) : undefined,
    condition: l.condition,
    type: l.type,
    pricePaise:
      l.type === 'AUCTION'
        ? auction?.currentHighBidPaise || auction?.startingBidPaise || l.priceInPaise || 0
        : l.priceInPaise || 0,
    auctionId: auction?.id,
    auctionStatus: auction?.status,
    endsAt: auction?.scheduledEndAt,
    bidCount: auction?.bidCount,
  };
}

// Home feed returns auctions with a nested listing rather than listings.
export function auctionToCardListing(a: ApiAuctionSummary & { listing: ApiListing }): CardListing {
  return {
    id: a.listing.id,
    title: a.listing.title,
    imageUrl: a.listing.images?.[0]?.imageUrl,
    categoryName: a.listing.category?.name,
    condition: a.listing.condition,
    type: 'AUCTION',
    pricePaise: a.currentHighBidPaise || a.startingBidPaise || 0,
    auctionId: a.id,
    auctionStatus: a.status,
    endsAt: a.scheduledEndAt,
    bidCount: a.bidCount,
  };
}

export function listingHref(c: Pick<CardListing, 'id' | 'type' | 'auctionId'>) {
  return c.type === 'AUCTION' && c.auctionId ? `/auction/${c.auctionId}` : `/product/${c.id}`;
}

export const isAuctionOpen = (status?: AuctionStatus) => status === 'LIVE' || status === 'CLOSING';

/** Status says open but the clock has run out — waiting for the close job / an admin. */
export const isAwaitingClose = (status?: AuctionStatus, endsAt?: string) =>
  isAuctionOpen(status) && !!endsAt && new Date(endsAt).getTime() <= Date.now();

export const isBiddable = (status?: AuctionStatus, endsAt?: string) => isAuctionOpen(status) && !isAwaitingClose(status, endsAt);
