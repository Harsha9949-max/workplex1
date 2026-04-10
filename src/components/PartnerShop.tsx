import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, ShoppingBag, ChevronRight, ChevronLeft, X, Plus, Minus, Trash2,
  CheckCircle, AlertCircle, Loader2, MapPin, Phone, Mail
} from 'lucide-react';
import {
  doc, getDoc, collection, getDocs, query, where, addDoc, serverTimestamp, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { PartnerShop, PartnerProduct, PartnerOrder } from '../types';

interface CartItem {
  product: PartnerProduct;
  quantity: number;
}

export default function PartnerShopPublic() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<PartnerShop | null>(null);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PartnerProduct | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadShop();
  }, [shopSlug]);

  const loadShop = async () => {
    if (!shopSlug) return;

    try {
      const shopQuery = query(collection(db, 'partnerShops'), where('shopSlug', '==', shopSlug));
      const shopSnap = await getDocs(shopQuery);

      if (shopSnap.empty) {
        setError('Shop not found');
        setLoading(false);
        return;
      }

      const shopData = shopSnap.docs[0].data() as PartnerShop;
      setShop(shopData);

      if (!shopData.isActive) {
        setError('Shop is currently closed');
        setLoading(false);
        return;
      }

      const productsQuery = query(
        collection(db, 'partnerProducts', shopData.ownerId, 'products'),
        where('isActive', '==', true)
      );
      const productsSnap = await getDocs(productsQuery);
      setProducts(productsSnap.docs.map(d => ({ productId: d.id, ...d.data() } as PartnerProduct)));

      setLoading(false);
    } catch (err) {
      setError('Failed to load shop');
      setLoading(false);
    }
  };

  const addToCart = (product: PartnerProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.productId === product.productId);
      if (existing) {
        return prev.map(item =>
          item.product.productId === product.productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.productId === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : item;
          }
          return item;
        })
        .filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.partnerSellingPrice * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (!shop) return;

    try {
      setOrdering(true);

      const orderId = `PO-${Date.now()}`;
      const orderProducts = cart.map(item => ({
        productId: item.product.productId,
        productName: item.product.productName,
        quantity: item.quantity,
        hvrsBasePrice: item.product.hvrsBasePrice,
        partnerSellingPrice: item.product.partnerSellingPrice,
        partnerMargin: item.product.partnerMargin,
        subtotal: item.product.partnerSellingPrice * item.quantity
      }));

      const totalAmount = cart.reduce((sum, item) => sum + item.product.partnerSellingPrice * item.quantity, 0);
      const totalMargin = cart.reduce((sum, item) => sum + item.product.partnerMargin * item.quantity, 0);
      const totalHVRS = cart.reduce((sum, item) => sum + item.product.hvrsBasePrice * item.quantity, 0);

      const marginReleaseAt = new Date();
      marginReleaseAt.setDate(marginReleaseAt.getDate() + 7);

      const orderData: Omit<PartnerOrder, 'orderId'> = {
        partnerId: shop.ownerId,
        partnerShopName: shop.shopName,
        customerId: '',
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        products: orderProducts,
        totalAmount,
        totalPartnerMargin: totalMargin,
        totalHVRSAmount: totalHVRS,
        status: 'pending',
        paymentStatus: 'pending',
        orderedAt: serverTimestamp(),
        deliveredAt: null,
        marginReleaseAt: serverTimestamp(),
        marginStatus: 'holding',
        shippingAddress: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          address: customerInfo.address,
          city: customerInfo.city,
          state: customerInfo.state,
          pincode: customerInfo.pincode
        }
      };

      await setDoc(doc(db, 'partnerOrders', orderId), orderData);

      setOrderSuccess(orderId);
      setCart([]);
      setCheckoutStep(0);
    } catch (err) {
      console.error(err);
    } finally {
      setOrdering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 size={40} className="text-[#00C9A7] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center p-6">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <p className="text-white font-bold">{error}</p>
        </div>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4">Order Placed!</h2>
          <p className="text-gray-400 mb-2">Order ID: {orderSuccess}</p>
          <p className="text-gray-500 text-sm mb-8">You'll receive confirmation soon.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-[#00C9A7] text-black font-bold px-8 py-4 rounded-2xl"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
        <div className="flex items-center gap-4 mb-6">
          {shop?.logo && (
            <img src={shop.logo} alt={shop.shopName} className="w-14 h-14 rounded-2xl object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-black">{shop?.shopName}</h1>
            <p className="text-gray-500 text-sm">workplex.hvrs.in/shop/{shop?.shopSlug}</p>
          </div>
        </div>

        {shop?.ownerPhone && (
          <a
            href={`https://wa.me/${shop.ownerPhone.replace(/\D/g, '')}`}
            className="bg-[#00C9A7] text-black font-bold px-4 py-2 rounded-xl inline-flex items-center gap-2 mb-6"
          >
            <Phone size={18} /> Contact Seller
          </a>
        )}

        <div className="grid grid-cols-2 gap-4">
          {products.map(product => (
            <motion.div
              key={product.productId}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedProduct(product)}
              className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden cursor-pointer"
            >
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.productName}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-bold text-sm line-clamp-2">{product.productName}</h3>
                <p className="text-[#00C9A7] font-black text-xl mt-2">₹{product.partnerSellingPrice}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product);
                  }}
                  className="w-full bg-white text-black font-bold py-2 rounded-lg mt-3 text-sm"
                >
                  Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag size={40} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No products available</p>
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 bg-[#111111] border-t border-gray-800 p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-[#00C9A7] text-black w-8 h-8 rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </div>
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-black">₹{cartTotal}</p>
              </div>
            </div>
            <button
              onClick={() => setCheckoutStep(1)}
              className="bg-[#00C9A7] text-black font-bold px-6 py-3 rounded-xl"
            >
              Checkout
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-end"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-md bg-[#0A0A0A] h-full overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 p-2"
                >
                  <X size={24} />
                </button>

                {selectedProduct.images?.[0] && (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.productName}
                    className="w-full h-64 object-cover rounded-2xl mb-4"
                  />
                )}

                <h2 className="text-2xl font-black mb-2">{selectedProduct.productName}</h2>
                <p className="text-gray-500 text-sm mb-4">{selectedProduct.category}</p>
                <p className="text-[#00C9A7] text-3xl font-black mb-4">₹{selectedProduct.partnerSellingPrice}</p>

                {selectedProduct.description && (
                  <p className="text-gray-400 text-sm mb-6">{selectedProduct.description}</p>
                )}

                <button
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="w-full bg-[#00C9A7] text-black font-black py-4 rounded-2xl"
                >
                  Add to Cart
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {checkoutStep > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0A0A0A] z-50 overflow-y-auto"
          >
            <div className="max-w-md mx-auto px-4 py-6">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCheckoutStep(0)}>
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-xl font-black">Checkout</h2>
                <div className="w-8" />
              </div>

              {checkoutStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Name</label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      className="w-full bg-[#111111] border border-gray-800 rounded-xl p-4"
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      className="w-full bg-[#111111] border border-gray-800 rounded-xl p-4"
                      placeholder="10-digit mobile"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Email</label>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      className="w-full bg-[#111111] border border-gray-800 rounded-xl p-4"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Address</label>
                    <textarea
                      value={customerInfo.address}
                      onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                      className="w-full bg-[#111111] border border-gray-800 rounded-xl p-4"
                      placeholder="Full address"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">City</label>
                      <input
                        type="text"
                        value={customerInfo.city}
                        onChange={e => setCustomerInfo({ ...customerInfo, city: e.target.value })}
                        className="w-full bg-[#111111] border border-gray-800 rounded-xl p-4"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">State</label>
                      <input
                        type="text"
                        value={customerInfo.state}
                        onChange={e => setCustomerInfo({ ...customerInfo, state: e.target.value })}
                        className="w-full bg-[#111111] border border-gray-800 rounded-xl p-4"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">PIN Code</label>
                    <input
                      type="text"
                      value={customerInfo.pincode}
                      onChange={e => setCustomerInfo({ ...customerInfo, pincode: e.target.value })}
                      className="w-full bg-[#111111] border border-gray-800 rounded-xl p-4"
                      maxLength={6}
                    />
                  </div>

                  <button
                    onClick={() => setCheckoutStep(2)}
                    disabled={!customerInfo.name || !customerInfo.phone || !customerInfo.address}
                    className="w-full bg-[#00C9A7] text-black font-black py-4 rounded-2xl disabled:opacity-20"
                  >
                    Review Order
                  </button>
                </div>
              )}

              {checkoutStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4">
                    <h3 className="font-bold mb-3">Delivery Address</h3>
                    <p className="text-gray-400 text-sm">{customerInfo.name}</p>
                    <p className="text-gray-400 text-sm">{customerInfo.address}</p>
                    <p className="text-gray-400 text-sm">{customerInfo.city}, {customerInfo.state} {customerInfo.pincode}</p>
                    <p className="text-gray-400 text-sm">{customerInfo.phone}</p>
                  </div>

                  <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4">
                    <h3 className="font-bold mb-3">Order Summary</h3>
                    {cart.map(item => (
                      <div key={item.product.productId} className="flex justify-between py-2 border-b border-gray-800 last:border-0">
                        <span className="text-sm">{item.product.productName} x{item.quantity}</span>
                        <span className="font-bold">₹{item.product.partnerSellingPrice * item.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 mt-3 border-t border-gray-800">
                      <span className="font-black">Total</span>
                      <span className="font-black text-[#00C9A7]">₹{cartTotal}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={ordering}
                    className="w-full bg-[#00C9A7] text-black font-black py-4 rounded-2xl disabled:opacity-20 flex items-center justify-center gap-2"
                  >
                    {ordering ? <Loader2 size={20} className="animate-spin" /> : 'Place Order (COD)'}
                  </button>

                  <p className="text-center text-xs text-gray-500">
                    Cash on Delivery • Payment powered by HVRS
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}