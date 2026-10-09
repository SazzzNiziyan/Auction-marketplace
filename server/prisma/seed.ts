import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database with platform data, categories, users, and live auction catalog...');

  // Platform settings
  await prisma.platformSetting.createMany({
    skipDuplicates: true,
    data: [
      { key: 'platform_commission_percent', value: '5', dataType: 'number' },
      { key: 'caution_deposit_amount_paise', value: '50000', dataType: 'number' },
      { key: 'anti_snip_extension_mins', value: '5', dataType: 'number' },
      { key: 'max_anti_snip_extensions', value: '3', dataType: 'number' },
      { key: 'winner_payment_deadline_hours', value: '24', dataType: 'number' },
      { key: 'maintenance_mode', value: 'false', dataType: 'boolean' },
    ],
  });

  // Admin user
  const adminHash = await bcrypt.hash('Admin@1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@auctio.in' },
    update: {},
    create: {
      email: 'admin@auctio.in',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: 'Platform Admin',
          city: 'Mumbai',
          state: 'Maharashtra',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300',
        },
      },
      notificationPrefs: { create: {} },
    },
  });

  // Test buyer
  const buyerHash = await bcrypt.hash('Buyer@1234!', 12);
  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@test.com' },
    update: {},
    create: {
      email: 'buyer@test.com',
      passwordHash: buyerHash,
      role: 'BUYER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: 'Rahul Sharma',
          phone: '+919876543210',
          city: 'Bengaluru',
          state: 'Karnataka',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300',
        },
      },
      notificationPrefs: { create: {} },
    },
  });

  // Test seller
  const sellerHash = await bcrypt.hash('Seller@1234!', 12);
  const seller = await prisma.user.upsert({
    where: { email: 'seller@test.com' },
    update: {},
    create: {
      email: 'seller@test.com',
      passwordHash: sellerHash,
      role: 'SELLER',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          displayName: 'Heritage Horology & Arts',
          phone: '+919811223344',
          city: 'New Delhi',
          state: 'Delhi',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300',
        },
      },
      sellerProfile: {
        create: {
          businessName: 'Heritage Horology & Arts',
          businessType: 'private_limited',
          isVerified: true,
          avgRating: 4.95,
          totalRatings: 142,
          totalSales: 384,
          returnPolicy: '7-day inspection guarantee with full refund on verified authenticity defects.',
          shippingPolicy: 'Insured express courier delivery across India within 48 hours.',
        },
      },
      notificationPrefs: { create: {} },
    },
    include: { sellerProfile: true },
  });

  const allSellers = [seller];

  // 10 more sellers
  for (let i = 1; i <= 10; i++) {
    const s = await prisma.user.upsert({
      where: { email: `seller${i}@test.com` },
      update: {},
      create: {
        email: `seller${i}@test.com`,
        passwordHash: sellerHash,
        role: 'SELLER',
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            displayName: `Auctio Merchant ${i}`,
            phone: `+9198000000${i.toString().padStart(2, '0')}`,
            city: 'Mumbai',
            state: 'Maharashtra',
            avatarUrl: `https://loremflickr.com/300/300/face?lock=${i}`,
          },
        },
        sellerProfile: {
          create: {
            businessName: `Auctio Merchant ${i} Pvt Ltd`,
            businessType: 'private_limited',
            isVerified: true,
            avgRating: 4.5 + Math.random() * 0.5,
            totalRatings: Math.floor(Math.random() * 100) + 10,
            totalSales: Math.floor(Math.random() * 500) + 50,
            returnPolicy: '7-day inspection guarantee.',
            shippingPolicy: 'Insured express courier delivery.',
          },
        },
        notificationPrefs: { create: {} },
      },
      include: { sellerProfile: true },
    });
    allSellers.push(s);
  }

  // Expanded Categories
  const categoryData = [
    { name: 'Electronics & Audio', slug: 'electronics', description: 'Vintage audio, precision cameras, and flagship devices', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600' },
    { name: 'Fashion & Luxury', slug: 'fashion', description: 'Handcrafted textiles, heritage shawls, and bespoke couture', imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600' },
    { name: 'Collectibles & Fine Art', slug: 'collectibles', description: 'Rare horology, numismatics, antiquities, and paintings', imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600' },
    { name: 'Home & Living', slug: 'home-living', description: 'Architectural furniture, artisan cutlery, and studio decor', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600' },
    { name: 'Automotive & Parts', slug: 'automotive', description: 'Classic cars, performance parts, and motoring memorabilia', imageUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=600' },
    { name: 'Jewelry & Watches', slug: 'jewelry', description: 'Diamonds, precious stones, and haute horlogerie', imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600' },
    { name: 'Books & Manuscripts', slug: 'books', description: 'First editions, signed copies, and historical documents', imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600' },
    { name: 'Sports Memorabilia', slug: 'sports', description: 'Game-worn jerseys, signed equipment, and trading cards', imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600' },
    { name: 'Musical Instruments', slug: 'instruments', description: 'Vintage guitars, classical strings, and synthesizers', imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600' },
    { name: 'Toys & Hobbies', slug: 'toys', description: 'Diecast models, action figures, and remote control', imageUrl: 'https://images.unsplash.com/photo-1558060370-d64111d20163?w=600' },
    { name: 'Antiques', slug: 'antiques', description: 'Period furniture, bronze sculptures, and ceramics', imageUrl: 'https://images.unsplash.com/photo-1506544777-64cfbea75b8e?w=600' },
    { name: 'Coins & Stamps', slug: 'coins-stamps', description: 'Rare numismatics, bullion, and philately', imageUrl: 'https://images.unsplash.com/photo-1588636411516-7243c983d5a1?w=600' },
    { name: 'Photography', slug: 'photography', description: 'Film cameras, vintage lenses, and darkroom equipment', imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600' },
    { name: 'Industrial & Scientific', slug: 'industrial', description: 'Lab equipment, precision tools, and testing gear', imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600' },
    { name: 'Real Estate', slug: 'real-estate', description: 'Commercial properties, land, and luxury homes', imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600' },
    { name: 'Business & Office', slug: 'business', description: 'Commercial printers, office furniture, and supplies', imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600' },
    { name: 'Health & Beauty', slug: 'health-beauty', description: 'Fragrances, grooming tools, and wellness products', imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600' },
    { name: 'Pet Supplies', slug: 'pets', description: 'Premium accessories, habitats, and grooming supplies', imageUrl: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600' },
    { name: 'Garden & Outdoor', slug: 'garden', description: 'Patio furniture, landscaping tools, and plants', imageUrl: 'https://images.unsplash.com/photo-1416879598555-220b8fa01a75?w=600' },
    { name: 'Wine & Spirits', slug: 'wine', description: 'Vintage wines, aged whiskey, and cellar collections', imageUrl: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600' },
    { name: 'Artisan Crafts', slug: 'crafts', description: 'Handmade pottery, woodworking, and custom art', imageUrl: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600' },
    { name: 'Tech Gadgets', slug: 'gadgets', description: 'Smart home, wearables, and cutting-edge devices', imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600' },
    { name: 'Travel & Experiences', slug: 'travel', description: 'Luxury stays, guided tours, and exclusive access', imageUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600' },
    { name: 'Everything Else', slug: 'other', description: 'Unique, bizarre, and uncategorized items', imageUrl: 'https://images.unsplash.com/photo-1513530534585-c7b13d4c1678?w=600' },
  ];

  const categoryRecords: any = {};
  for (const cat of categoryData) {
    categoryRecords[cat.slug] = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  const catCollectibles = categoryRecords['collectibles'];
  const catElectronics = categoryRecords['electronics'];
  const catFashion = categoryRecords['fashion'];
  const catHome = categoryRecords['home-living'];


  console.log('✅ Categories and Users established.');

  // Listings & Auctions seed
  const itemsToCreate = [
    {
      title: "1968 Vintage Rolex Submariner 5513 'Meters First'",
      slug: '1968-vintage-rolex-submariner-5513-meters-first',
      description: 'Museum-grade collectors vintage timepiece with original domed plexiglass, unpolished bevels, and creamy tritium patina dial. Accompanied by original box and archive papers.',
      condition: 'good',
      type: 'AUCTION' as const,
      categoryId: catCollectibles.id,
      priceInPaise: 58000000,
      stockQuantity: 1,
      shippingNote: 'Armored courier transport with full value insurance.',
      tags: ['rolex', 'vintage', 'watches', 'luxury', 'submariner'],
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1000',
      auction: {
        startingBidPaise: 45000000,
        currentHighBidPaise: 58000000,
        reservePricePaise: 50000000,
        depositAmountPaise: 2500000, // ₹25,000 caution deposit
        scheduledStartAt: new Date(Date.now() - 3600000 * 20),
        scheduledEndAt: new Date(Date.now() + 3600000 * 6), // 6 hours remaining
        bidCount: 14,
      },
    },
    {
      title: 'Leica M6 Classic 35mm Rangefinder Camera (Mint 1984)',
      slug: 'leica-m6-classic-35mm-rangefinder-mint-1984',
      description: 'Iconic mechanical 35mm film rangefinder in pristine black chrome finish with matching Summicron 50mm f/2 lens. Serviced by Leica Wetzlar certified technician in 2025.',
      condition: 'like_new',
      type: 'AUCTION' as const,
      categoryId: catElectronics.id,
      priceInPaise: 24500000,
      stockQuantity: 1,
      shippingNote: 'Shipped in Pelican hardcase with sealed tamper-evident seals.',
      tags: ['leica', 'camera', 'photography', 'rangefinder', 'film'],
      imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000',
      auction: {
        startingBidPaise: 18000000,
        currentHighBidPaise: 24500000,
        reservePricePaise: 20000000,
        depositAmountPaise: 1500000,
        scheduledStartAt: new Date(Date.now() - 3600000 * 48),
        scheduledEndAt: new Date(Date.now() + 1000 * 60 * 22), // 22 minutes remaining! (Live / Ending soon)
        bidCount: 9,
      },
    },
    {
      title: 'Hand-Crafted Pure Pashmina Kashmiri Shawl with Fine Sozni Needlework',
      slug: 'hand-crafted-pure-pashmina-kashmiri-shawl-sozni',
      description: 'Masterpiece 100% authentic Changthangi cashmere handwoven on traditional pit looms in Srinagar. Features intricate hand needlework that required over 14 months of artisanal dedication.',
      condition: 'new',
      type: 'FIXED_PRICE' as const,
      categoryId: catFashion.id,
      priceInPaise: 4850000, // ₹48,500
      stockQuantity: 4,
      shippingNote: 'Delivered in silk protective presentation box with GI certification tag.',
      tags: ['pashmina', 'cashmere', 'handmade', 'textile', 'kashmir'],
      imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=1000',
    },
    {
      title: 'Rare 1947 British India King George VI 10 Rupee Banknote (Uncirculated)',
      slug: 'rare-1947-british-india-king-george-vi-10-rupee',
      description: 'Historical currency specimen with Deshmukh signature, pristine watermarks, and vivid intaglio printing. Graded PMG 66 EPQ Gem Uncirculated.',
      condition: 'like_new',
      type: 'AUCTION' as const,
      categoryId: catCollectibles.id,
      priceInPaise: 3800000,
      stockQuantity: 1,
      shippingNote: 'Shipped in certified archival PMG holder.',
      tags: ['numismatics', 'rare coins', 'banknote', 'history', 'india'],
      imageUrl: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=1000',
      auction: {
        startingBidPaise: 1500000,
        currentHighBidPaise: 3800000,
        reservePricePaise: 2500000,
        depositAmountPaise: 500000, // ₹5,000
        scheduledStartAt: new Date(Date.now() - 3600000 * 12),
        scheduledEndAt: new Date(Date.now() + 3600000 * 2), // 2 hours remaining
        bidCount: 18,
      },
    },
    {
      title: 'Mid-Century Architectural Solid Teakwood Credenza & Coffee Table',
      slug: 'mid-century-architectural-teakwood-credenza',
      description: 'Original 1960s Chandigarh style handcrafted reclaimed plantation teak credenza. Fluted tambours, solid brass joinery, and natural organic hand-rubbed wax finish.',
      condition: 'like_new',
      type: 'FIXED_PRICE' as const,
      categoryId: catHome.id,
      priceInPaise: 6800000, // ₹68,000
      stockQuantity: 2,
      shippingNote: 'Crated white-glove home delivery included.',
      tags: ['furniture', 'teak', 'chandigarh', 'mid-century', 'decor'],
      imageUrl: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1000',
    },
    {
      title: 'Apple Mac Studio M2 Ultra (128GB RAM, 2TB SSD)',
      slug: 'apple-mac-studio-m2-ultra-128gb-ram',
      description: 'Powerhouse workstation for video engineering and 3D simulation. Flawless cosmetic and operational health with AppleCare+ coverage active until 2027.',
      condition: 'like_new',
      type: 'FIXED_PRICE' as const,
      categoryId: catElectronics.id,
      priceInPaise: 34990000, // ₹3,49,900
      stockQuantity: 2,
      shippingNote: 'Ships in original Apple factory packaging.',
      tags: ['apple', 'mac', 'studio', 'workstation', 'm2 ultra'],
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1000',
    },
  ];

  const adjectives = ['Vintage', 'Rare', 'Premium', 'Exclusive', 'Limited Edition', 'Authentic', 'Mint Condition', 'Antique', 'Signature', 'Bespoke'];
  const qualities = ['exceptional', 'museum-quality', 'flawless', 'highly sought-after', 'meticulously preserved', 'pristine'];

  // Dynamically add 10 items for each category
  for (const catSlug in categoryRecords) {
    const cat = categoryRecords[catSlug];
    for (let i = 1; i <= 10; i++) {
      const type = Math.random() > 0.5 ? 'AUCTION' : 'FIXED_PRICE';
      const price = Math.floor(Math.random() * 500000) * 100 + 50000;
      
      const adjective = adjectives[(i * cat.name.length) % adjectives.length];
      const quality = qualities[(i * 7 + cat.name.length) % qualities.length];
      
      const item = {
        title: `${adjective} ${cat.name} - Edition ${i}`,
        slug: `unique-${cat.slug}-piece-${i}-${Math.random().toString(36).substr(2, 5)}`,
        description: `This is a ${quality} ${cat.name} item. It is guaranteed to be authentic and in excellent condition. A perfect addition for serious collectors and enthusiasts who appreciate ${adjective.toLowerCase()} items.`,
        condition: 'like_new' as const,
        type: type as any,
        categoryId: cat.id,
        priceInPaise: price,
        stockQuantity: type === 'AUCTION' ? 1 : Math.floor(Math.random() * 5) + 1,
        shippingNote: 'Fully insured shipping with priority white-glove handling.',
        tags: [cat.slug, adjective.toLowerCase(), 'premium', 'authentic'],
        imageUrl: `https://picsum.photos/seed/${cat.slug}-${i}-auctio/800/800`,
        auction: type === 'AUCTION' ? {
          startingBidPaise: Math.floor(price * 0.7),
          currentHighBidPaise: price,
          reservePricePaise: Math.floor(price * 0.9),
          depositAmountPaise: Math.floor(price * 0.05),
          scheduledStartAt: new Date(Date.now() - 3600000 * Math.floor(Math.random() * 48)),
          scheduledEndAt: new Date(Date.now() + 3600000 * Math.floor(Math.random() * 72)),
          bidCount: Math.floor(Math.random() * 20) + 1,
        } : undefined,
      };
      itemsToCreate.push(item);
    }
  }

  for (const item of itemsToCreate) {
    const existing = await prisma.productListing.findUnique({ where: { slug: item.slug } });
    if (!existing) {
      const randomSeller = allSellers[Math.floor(Math.random() * allSellers.length)];
      const listing = await prisma.productListing.create({
        data: {
          sellerId: randomSeller.id,
          sellerProfileId: randomSeller.sellerProfile?.id,
          categoryId: item.categoryId,
          type: item.type,
          status: 'ACTIVE',
          title: item.title,
          slug: item.slug,
          description: item.description,
          condition: item.condition,
          priceInPaise: item.priceInPaise,
          stockQuantity: item.stockQuantity,
          shippingNote: item.shippingNote,
          tags: item.tags,
          publishedAt: new Date(),
          images: {
            create: [
              { imageUrl: item.imageUrl, isPrimary: true, sortOrder: 0 },
            ],
          },
        },
      });

      if (item.type === 'AUCTION' && item.auction) {
        const auction = await prisma.auction.create({
          data: {
            listingId: listing.id,
            status: 'LIVE',
            startingBidPaise: item.auction.startingBidPaise,
            currentHighBidPaise: item.auction.currentHighBidPaise,
            reservePricePaise: item.auction.reservePricePaise,
            depositAmountPaise: item.auction.depositAmountPaise,
            scheduledStartAt: item.auction.scheduledStartAt,
            scheduledEndAt: item.auction.scheduledEndAt,
            depositDeadlineAt: item.auction.scheduledEndAt,
            currentHighBidderId: buyer.id,
            bidCount: item.auction.bidCount,
          },
        });

        // Seed caution deposit for buyer
        await prisma.auctionDeposit.create({
          data: {
            auctionId: auction.id,
            userId: buyer.id,
            amountPaise: item.auction.depositAmountPaise,
            status: 'PAID',
            paidAt: new Date(),
          },
        });

        // Seed initial bid
        await prisma.bid.create({
          data: {
            auctionId: auction.id,
            userId: buyer.id,
            amountPaise: item.auction.currentHighBidPaise,
            status: 'ACTIVE',
            placedAt: new Date(Date.now() - 3600000 * 2),
          },
        });
      }
    }
  }

  console.log('🎉 Seed complete! Catalog and live auctions are fully populated.');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
