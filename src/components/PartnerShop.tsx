/**
 * WorkPlex Phase 11 — Partner Store System (Complete E-Commerce Engine)
 * Public shop pages, product catalog, cart, checkout, orders, margin release
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, Minus, Trash2, CheckCircle, AlertCircle,
  ChevronRight, X, Copy, Share2, Phone, Package, Search
} from 'lucide-react';
import {
  doc, getDoc, collection, query, where, getDocs, addDoc,
  serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { formatCurrency, generateId } from '../types';

interface CartItem {
  product: any;
  quantity: number;
}

export default function PartnerShopPublic() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({
    name: '', phone: '', email: '', address: '', city: '', state: '', pincode: ''
  });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'newest'>('newest');

  // Load shop data
  useEffect(() => {
    const loadShop = async () => {
      try {
        const shopsQuery = query(collection(db, 'partnerShops'), where('shopSlug', '==', shopSlug), where('isActive', '==', true));
        const shopsSnapshot = await getDocs(shopsQuery);

        if (shopsSnapshot.empty) {
          setError('Shop not found');
          setLoading(false);
          return;
        }

        const shopData = { id: shopsSnapshot.docs[0].id, ...shopsSnapshot.docs[0].data() };
        setShop(shopData);

        const productsQuery = query(
          collection(db, 'partnerProducts'),
          where('partnerId', '==', shopsSnapshot.docs[0].id),
          where('isActive', '==', true)
        );
        const productsSnapshot = await getDocs(productsQuery);
        setProducts(productsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      } catch (err) {
        setError('Failed to load shop');
        setLoading(false);
      }
    };

    if (shopSlug) loadShop();
  }, [shopSlug]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.partnerSellingPrice * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.partnerSellingPrice - b.partnerSellingPrice;
      if (sortBy === 'price-desc') return b.partnerSellingPrice - a.partnerSellingPrice;
      return 0;
    });

  const categories = ['all', ...new Set(products.map(p => p.category))];

  const handleCheckout = async () => {
    try {
      const orderId = `PO-${Date.now()}`;
      const marginReleaseAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const orderData = {
        orderId,
        partnerId: shop.id,
        partnerShopName: shop.shopName,
        customerId: generateId(),
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        products: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.productName,
          quantity: item.quantity,
          hvrsBasePrice: item.product.hvrsBasePrice,
          partnerSellingPrice: item.product.partnerSellingPrice,
          partnerMargin: item.product.partnerMargin,
          subtotal: item.product.partnerSellingPrice * item.quantity
        })),
        totalAmount: cartTotal,
        totalPartnerMargin: cart.reduce((sum, item) => sum + (item.product.partnerMargin * item.quantity), 0),
        totalHVRSAmount: cart.reduce((sum, item) => sum + (item.product.hvrsBasePrice * item.quantity), 0),
        status: 'pending',
        paymentStatus: 'pending',
        orderedAt: serverTimestamp(),
        marginReleaseAt,
        marginStatus: 'holding',
        shippingAddress: {
          name: customerInfo.name, phone: customerInfo.phone,
          address: customerInfo.address, city: customerInfo.city,
          state: customerInfo.state, pincode: customerInfo.pincode
        }
      };

      await addDoc(collection(db, 'partnerOrders'), orderData);
      await updateDoc(doc(db, 'partnerShops', shop.id), {
        totalOrders: (shop.totalOrders || 0) + 1,
        totalSales: (shop.totalSales || 0) + cartTotal,
        lastActiveAt: serverTimestamp()
      });

      setOrderPlaced(true);
      setCart([]);
      setCheckoutStep(0);
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to place order. Please try again.');
    }
  };

  const shareShop = () => {
    const url = `${window.location.origin}/shop/${shopSlug}`;
    if (navigator.share) {
      navigator.share({ title: shop?.shopName, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-12 h-12 border-4 border-[#00C9A7]/30 border-t-[#00C9A7] rounded-full" />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">{error || 'Shop not found'}</h2>
          <button onClick={() => navigate('/')} className="bg-[#00C9A7] text-black font-bold px-6 py-3 rounded-xl mt-4">Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Shop Header */}
      <div className="bg-gradient-to-br from-[#00C9A7]/20 to-[#111111] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {shop.logo && (
              <img src={shop.logo} alt={shop.shopName} className="w-24 h-24 rounded-2xl object-cover border-2 border-[#00C9A7]/30" />
            )}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-black mb-2">{shop.shopName}</h1>
              <p className="text-gray-400">{shop.description || `Shop by ${shop.ownerName}`}</p>
              <div className="flex items-center gap-4 mt-3 justify-center md:justify-start">
                <span className="text-sm text-[#00C9A7]">{products.length} Products</span>
                <span className="text-sm text-gray-500">{shop.totalOrders || 0} Orders</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={shareShop} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <a href={`https://wa.me/${shop.ownerPhone}`} target="_blank" rel="noopener noreferrer" className="bg-[#00C9A7] text-black px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-[#00b395] transition-colors">
                <Phone className="w-4 h-4" /> Contact
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#111111] border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00C9A7]" />
          </div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00C9A7]">
            {categories.map(cat => (<option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>))}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#00C9A7]">
            <option value="newest">Newest</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1A1A1A] rounded-2xl border border-gray-800 overflow-hidden hover:border-[#00C9A7]/30 transition-all cursor-pointer" onClick={() => setSelectedProduct(product)}>
                <div className="aspect-square bg-gradient-to-br from-[#111111] to-[#0A0A0A] flex items-center justify-center">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.productName} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-gray-600" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm mb-1 truncate">{product.productName}</h3>
                  <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-black text-[#00C9A7]">{formatCurrency(product.partnerSellingPrice)}</p>
                    <button onClick={(e) => { e.stopPropagation(); addToCart(product); }} className="bg-[#00C9A7] text-black w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#00b395] transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>

      {/* Cart Bar */}
      {cartCount > 0 && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-0 left-0 right-0 bg-[#111111] border-t border-gray-800 p-4 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-bold">{cartCount} items</p>
              <p className="text-[#00C9A7] font-black">{formatCurrency(cartTotal)}</p>
            </div>
            <button onClick={() => setCheckoutStep(1)} className="bg-[#00C9A7] text-black font-bold px-6 py-3 rounded-xl hover:bg-[#00b395] transition-colors">Checkout</button>
          </div>
        </motion.div>
      )}

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedProduct(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="bg-[#1A1A1A] w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <div className="aspect-square bg-gradient-to-br from-[#111111] to-[#0A0A0A] flex items-center justify-center">
                  {selectedProduct.images?.[0] ? (
                    <img src={selectedProduct.images[0]} alt={selectedProduct.productName} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-24 h-24 text-gray-600" />
                  )}
                </div>
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <h2 className="text-2xl font-black mb-2">{selectedProduct.productName}</h2>
                <p className="text-gray-400 mb-4">{selectedProduct.description}</p>
                <p className="text-3xl font-black text-[#00C9A7] mb-6">{formatCurrency(selectedProduct.partnerSellingPrice)}</p>
                <button onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} className="w-full bg-[#00C9A7] text-black font-bold py-4 rounded-2xl hover:bg-[#00b395] transition-colors">
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {checkoutStep > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={() => setCheckoutStep(0)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} className="bg-[#1A1A1A] w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto border border-gray-800" onClick={(e) => e.stopPropagation()}>
              {orderPlaced ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-20 h-20 text-[#00C9A7] mx-auto mb-4" />
                  <h2 className="text-2xl font-black mb-2">Order Placed!</h2>
                  <p className="text-gray-400 mb-6">You'll receive confirmation soon.</p>
                  <button onClick={() => { setOrderPlaced(false); setCheckoutStep(0); }} className="bg-[#00C9A7] text-black font-bold px-8 py-3 rounded-xl">Continue Shopping</button>
                </div>
              ) : checkoutStep === 1 ? (
                <>
                  <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-xl font-black">Checkout</h3>
                    <button onClick={() => setCheckoutStep(0)}><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                    <h4 className="font-bold mb-3">Your Cart</h4>
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center justify-between bg-[#111111] rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-[#0A0A0A] rounded-lg flex items-center justify-center">
                            {item.product.images?.[0] ? <img src={item.product.images[0]} alt="" className="w-full h-full object-cover rounded-lg" /> : <Package className="w-6 h-6 text-gray-600" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{item.product.productName}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#00C9A7]">{formatCurrency(item.product.partnerSellingPrice * item.quantity)}</span>
                          <button onClick={() => removeFromCart(item.product.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-gray-800 pt-4 flex items-center justify-between">
                      <span className="font-bold">Total</span>
                      <span className="text-2xl font-black text-[#00C9A7]">{formatCurrency(cartTotal)}</span>
                    </div>
                    <button onClick={() => setCheckoutStep(2)} className="w-full bg-[#00C9A7] text-black font-bold py-4 rounded-2xl hover:bg-[#00b395] transition-colors">Continue</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-xl font-black">Delivery Details</h3>
                    <button onClick={() => setCheckoutStep(1)}><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Name</label>
                      <input type="text" value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })} className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00C9A7]" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Phone</label>
                      <input type="tel" value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })} className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00C9A7]" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Email</label>
                      <input type="email" value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00C9A7]" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Address</label>
                      <textarea value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })} rows={3} className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00C9A7] resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold mb-2">City</label>
                        <input type="text" value={customerInfo.city} onChange={(e) => setCustomerInfo({ ...customerInfo, city: e.target.value })} className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00C9A7]" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Pincode</label>
                        <input type="text" value={customerInfo.pincode} onChange={(e) => setCustomerInfo({ ...customerInfo, pincode: e.target.value })} className="w-full bg-[#111111] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00C9A7]" />
                      </div>
                    </div>
                    <button onClick={handleCheckout} disabled={!customerInfo.name || !customerInfo.phone || !customerInfo.address} className="w-full bg-[#00C9A7] text-black font-bold py-4 rounded-2xl hover:bg-[#00b395] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      Place Order • {formatCurrency(cartTotal)}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
