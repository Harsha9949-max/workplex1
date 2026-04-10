import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingBag, FileText, Wallet, Settings,
  Package, DollarSign, TrendingUp, Users, Camera, Upload,
  ChevronRight, ChevronDown, X, Edit, Trash2, ToggleLeft,
  ToggleRight, Plus, Search, Copy, ExternalLink, Clock,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import {
  doc, onSnapshot, collection, query, where, orderBy,
  limit, getDocs, updateDoc, serverTimestamp, setDoc, addDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { PartnerShop, PartnerProduct, PartnerOrder } from '../types';

interface PartnerDashboardProps {
  user: any;
  userData: any;
}

type TabType = 'dashboard' | 'orders' | 'products' | 'wallet' | 'settings';

export default function PartnerDashboard({ user, userData }: PartnerDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [shopData, setShopData] = useState<PartnerShop | null>(null);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubShop = onSnapshot(doc(db, 'partnerShops', user.uid), (doc) => {
      if (doc.exists()) setShopData(doc.data() as PartnerShop);
      setLoading(false);
    });

    const unsubProducts = onSnapshot(
      collection(db, 'partnerProducts', user.uid, 'products'),
      (snapshot) => {
        setProducts(snapshot.docs.map(d => ({ productId: d.id, ...d.data() } as PartnerProduct)));
      }
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'partnerOrders'), where('partnerId', '==', user.uid), orderBy('orderedAt', 'desc'), limit(50)),
      (snapshot) => {
        setOrders(snapshot.docs.map(d => ({ orderId: d.id, ...d.data() } as PartnerOrder)));
      }
    );

    return () => {
      unsubShop();
      unsubProducts();
      unsubOrders();
    };
  }, [user.uid]);

  const stats = {
    totalOrders: shopData?.totalOrders || 0,
    totalSales: shopData?.totalSales || 0,
    totalMargin: shopData?.totalMarginEarned || 0,
    activeProducts: products.filter(p => p.isActive).length
  };

  const pendingMargin = orders
    .filter(o => o.marginStatus === 'holding' || o.marginStatus === 'pending')
    .reduce((sum, o) => sum + o.totalPartnerMargin, 0);

  const availableMargin = orders
    .filter(o => o.marginStatus === 'earned')
    .reduce((sum, o) => sum + o.totalPartnerMargin, 0);

  const tabItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'orders', label: 'Orders', icon: <FileText size={20} />, badge: orders.filter(o => o.status === 'pending').length },
    { id: 'products', label: 'Products', icon: <ShoppingBag size={20} /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="flex">
        <div className="hidden md:flex flex-col fixed left-0 w-64 h-full bg-[#111111] border-r border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#00C9A7] rounded-xl flex items-center justify-center">
              <ShoppingBag size={20} className="text-black" />
            </div>
            <div>
              <h1 className="font-black text-lg">Partner</h1>
              <p className="text-[10px] text-gray-500">Dashboard</p>
            </div>
          </div>

          <div className="space-y-2">
            {tabItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                    ? 'bg-[#00C9A7] text-black'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                {item.icon}
                <span className="font-bold text-sm">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-black text-[#00C9A7] text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 md:ml-64 p-6 pb-32">
          {activeTab === 'dashboard' && <DashboardTab stats={stats} pendingMargin={pendingMargin} availableMargin={availableMargin} orders={orders} now={now} />}
          {activeTab === 'orders' && <OrdersTab orders={orders} now={now} />}
          {activeTab === 'products' && <ProductsTab user={user} products={products} />}
          {activeTab === 'wallet' && <WalletTab pendingMargin={pendingMargin} availableMargin={availableMargin} user={user} />}
          {activeTab === 'settings' && <SettingsTab user={user} shopData={shopData} />}
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#111111] border-t border-gray-800 px-4 py-3 flex gap-2 overflow-x-auto">
        {tabItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl ${activeTab === item.id ? 'text-[#00C9A7]' : 'text-gray-500'
              }`}
          >
            {item.icon}
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DashboardTab({ stats, pendingMargin, availableMargin, orders, now }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Package size={24} />} label="Total Orders" value={stats.totalOrders} color="#E8B84B" />
        <StatCard icon={<DollarSign size={24} />} label="Total Sales" value={`₹${stats.totalSales}`} color="#00C9A7" />
        <StatCard icon={<TrendingUp size={24} />} label="Total Margin" value={`₹${stats.totalMargin}`} color="#10B981" />
        <StatCard icon={<ShoppingBag size={24} />} label="Active Products" value={stats.activeProducts} color="#A855F7" />
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-3xl p-6">
        <h3 className="font-black text-lg mb-4">Wallet</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-[#0A0A0A] rounded-2xl">
            <p className="text-xs text-gray-500 mb-1">Pending (7-day hold)</p>
            <p className="text-xl font-black text-yellow-500">₹{pendingMargin}</p>
            <p className="text-[10px] text-gray-600 mt-1"> releasing soon</p>
          </div>
          <div className="p-4 bg-[#0A0A0A] rounded-2xl">
            <p className="text-xs text-gray-500 mb-1">Available</p>
            <p className="text-xl font-black text-[#00C9A7]">₹{availableMargin}</p>
            <p className="text-[10px] text-gray-600 mt-1">ready to withdraw</p>
          </div>
          <div className="p-4 bg-[#0A0A0A] rounded-2xl">
            <p className="text-xs text-gray-500 mb-1">Total Earned</p>
            <p className="text-xl font-black text-white">₹{stats.totalMargin}</p>
            <p className="text-[10px] text-gray-600 mt-1">all time</p>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-3xl p-6">
        <h3 className="font-black text-lg mb-4">Recent Orders</h3>
        {orders.length === 0 ? (
          <p className="text-gray-500 text-sm">No orders yet</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map(order => (
              <div key={order.orderId} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-xl">
                <div>
                  <p className="font-bold text-sm">{order.orderId}</p>
                  <p className="text-xs text-gray-500">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{order.totalAmount}</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrdersTab({ orders, now }: any) {
  const [selectedOrder, setSelectedOrder] = useState<PartnerOrder | null>(null);

  const getDaysRemaining = (releaseAt: any) => {
    if (!releaseAt) return 0;
    const release = releaseAt.toDate ? releaseAt.toDate() : new Date(releaseAt);
    const diff = release.getTime() - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black">Orders</h2>

      {orders.length === 0 ? (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-center">
          <Package size={40} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div
              key={order.orderId}
              onClick={() => setSelectedOrder(order)}
              className="bg-[#111111] border border-gray-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-gray-700"
            >
              <div>
                <p className="font-bold">{order.orderId}</p>
                <p className="text-xs text-gray-500">{order.customerName} • {order.orderedAt?.toDate?.().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-[#00C9A7]">₹{order.totalPartnerMargin}</p>
                <StatusBadge status={order.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-[#111111] border border-gray-800 rounded-3xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-xl">{selectedOrder.orderId}</h3>
                  <p className="text-sm text-gray-500">{selectedOrder.orderedAt?.toDate?.().toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white/10 rounded-xl">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-[#0A0A0A] rounded-xl">
                  <p className="text-xs text-gray-500 uppercase mb-2">Customer</p>
                  <p className="font-bold">{selectedOrder.customerName}</p>
                  <p className="text-sm text-gray-400">{selectedOrder.customerPhone}</p>
                </div>

                <div className="p-4 bg-[#0A0A0A] rounded-xl">
                  <p className="text-xs text-gray-500 uppercase mb-2">Products</p>
                  {selectedOrder.products.map((p: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-gray-800 last:border-0">
                      <span className="text-sm">{p.productName} x{p.quantity}</span>
                      <span className="font-bold">₹{p.subtotal}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center p-4 bg-[#0A0A0A] rounded-xl">
                  <span>Your Margin</span>
                  <span className="font-black text-[#00C9A7]">₹{selectedOrder.totalPartnerMargin}</span>
                </div>

                <div className="p-4 bg-[#0A0A0A] rounded-xl">
                  <p className="text-xs text-gray-500 uppercase mb-2">Status</p>
                  <StatusBadge status={selectedOrder.status} />
                </div>

                {selectedOrder.marginStatus === 'holding' && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-3">
                    <Clock size={20} className="text-yellow-500" />
                    <div>
                      <p className="text-sm font-bold text-yellow-500">Margin releases in {getDaysRemaining(selectedOrder.marginReleaseAt)} days</p>
                      <p className="text-xs text-gray-500">Quality check period</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductsTab({ user, products }: { user: any; products: PartnerProduct[] }) {
  const [editingProduct, setEditingProduct] = useState<PartnerProduct | null>(null);

  const toggleActive = async (productId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'partnerProducts', user.uid, 'products', productId), {
      isActive: !currentStatus
    });
  };

  const updatePrice = async (productId: string, newPrice: number) => {
    const product = products.find(p => p.productId === productId);
    if (!product) return;

    await updateDoc(doc(db, 'partnerProducts', user.uid, 'products', productId), {
      partnerSellingPrice: newPrice,
      partnerMargin: newPrice - product.hvrsBasePrice
    });
    setEditingProduct(null);
  };

  const removeProduct = async (productId: string) => {
    if (!confirm('Remove this product from your shop?')) return;
    await updateDoc(doc(db, 'partnerProducts', user.uid, 'products', productId), {
      isActive: false
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Products</h2>
        <button className="bg-[#00C9A7] text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2">
          <Plus size={20} /> Add More
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-8 text-center">
          <ShoppingBag size={40} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">No products in your shop</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map(product => (
            <div key={product.productId} className="bg-[#111111] border border-gray-800 rounded-2xl p-4 flex items-center gap-4">
              {product.images?.[0] && (
                <img src={product.images[0]} alt={product.productName} className="w-16 h-16 rounded-xl object-cover" />
              )}
              <div className="flex-1">
                <p className="font-bold">{product.productName}</p>
                <p className="text-xs text-gray-500">{product.category}</p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <p className="text-[10px] text-gray-500">HVRS Base</p>
                    <p className="text-sm font-mono">₹{product.hvrsBasePrice}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Your Price</p>
                    <p className="text-sm font-mono text-[#00C9A7]">₹{product.partnerSellingPrice}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Your Margin</p>
                    <p className="text-sm font-mono text-green-500">₹{product.partnerMargin}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(product.productId, product.isActive)}
                  className={`p-2 rounded-xl ${product.isActive ? 'text-green-500' : 'text-gray-600'}`}
                >
                  {product.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
                <button
                  onClick={() => setEditingProduct(product)}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => removeProduct(product.productId)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
            onClick={() => setEditingProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-[#111111] border border-gray-800 rounded-3xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-black text-xl mb-4">Edit Price</h3>
              <p className="text-sm text-gray-500 mb-4">{editingProduct.productName}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Your Selling Price</label>
                  <input
                    type="number"
                    defaultValue={editingProduct.partnerSellingPrice}
                    onChange={e => {
                      const newPrice = parseInt(e.target.value);
                      updatePrice(editingProduct.productId, newPrice);
                    }}
                    className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl p-4 font-mono text-xl"
                  />
                </div>

                <div className="p-4 bg-[#0A0A0A] rounded-xl">
                  <p className="text-xs text-gray-500">Your Margin</p>
                  <p className="font-black text-green-500">₹{editingProduct.partnerMargin}</p>
                </div>
              </div>

              <button
                onClick={() => setEditingProduct(null)}
                className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl mt-4"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WalletTab({ pendingMargin, availableMargin, user }: any) {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount < 200 || amount > availableMargin) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'partnerWithdrawals'), {
        partnerId: user.uid,
        amount,
        status: 'pending',
        requestedAt: serverTimestamp()
      });
      setWithdrawAmount('');
      alert('Withdrawal request submitted!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black">Wallet</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
          <p className="text-xs text-gray-500 uppercase mb-2">Pending</p>
          <p className="text-3xl font-black text-yellow-500">₹{pendingMargin}</p>
          <p className="text-xs text-gray-600 mt-2">7-day hold</p>
        </div>
        <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
          <p className="text-xs text-gray-500 uppercase mb-2">Available</p>
          <p className="text-3xl font-black text-[#00C9A7]">₹{availableMargin}</p>
          <p className="text-xs text-gray-600 mt-2">min ₹200</p>
        </div>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
        <h3 className="font-bold mb-4">Request Withdrawal</h3>
        <div className="flex gap-4">
          <input
            type="number"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            placeholder="Amount"
            className="flex-1 bg-[#0A0A0A] border border-gray-800 rounded-xl p-4 font-mono"
          />
          <button
            onClick={handleWithdraw}
            disabled={loading || !withdrawAmount || parseInt(withdrawAmount) < 200}
            className="bg-[#00C9A7] text-black font-bold px-6 rounded-xl disabled:opacity-20"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ user, shopData }: { user: any; shopData: PartnerShop | null }) {
  const [shopName, setShopName] = useState(shopData?.shopName || '');
  const [logo, setLogo] = useState(shopData?.logo || '');
  const [saving, setSaving] = useState(false);

  const shopUrl = `workplex.hvrs.in/shop/${shopData?.shopSlug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shopUrl);
  };

  const shareWhatsApp = () => {
    const text = `Check out my shop: ${shopUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black">Settings</h2>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
        <h3 className="font-bold mb-4">Shop Name</h3>
        <input
          type="text"
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl p-4"
        />
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
        <h3 className="font-bold mb-4">Logo</h3>
        <div className="flex items-center gap-4">
          {logo && <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />}
          <label className="bg-gray-800 px-4 py-2 rounded-xl cursor-pointer">
            <input type="file" hidden accept="image/*" />
            <span className="flex items-center gap-2"><Camera size={20} /> Change</span>
          </label>
        </div>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
        <h3 className="font-bold mb-4">Shop Link</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={shopUrl}
            readOnly
            className="flex-1 bg-[#0A0A0A] border border-gray-800 rounded-xl p-3 font-mono text-sm"
          />
          <button onClick={copyLink} className="bg-gray-800 p-3 rounded-xl">
            <Copy size={20} />
          </button>
          <button onClick={shareWhatsApp} className="bg-[#00C9A7] text-black p-3 rounded-xl">
            <ExternalLink size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#111111] border border-gray-800 rounded-2xl p-4">
      <div style={{ color }} className="mb-2">{icon}</div>
      <p className="text-gray-500 text-xs uppercase">{label}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-500',
    processing: 'bg-blue-500/20 text-blue-500',
    shipped: 'bg-purple-500/20 text-purple-500',
    delivered: 'bg-green-500/20 text-green-500'
  };

  return (
    <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}