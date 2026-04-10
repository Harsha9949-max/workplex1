import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShoppingBag, FileText, Wallet, Settings,
  Package, DollarSign, TrendingUp, Users, Search, Filter,
  ChevronRight, ChevronDown, X, Edit, Trash2, ToggleLeft,
  ToggleRight, Plus, Eye, ExternalLink, Clock, CheckCircle,
  AlertCircle, Loader2, Upload, Download
} from 'lucide-react';
import {
  doc, onSnapshot, collection, query, where, orderBy,
  limit, getDocs, updateDoc, serverTimestamp, setDoc, addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { PartnerShop, PartnerOrder, PartnerWithdrawalRequest, CatalogProduct } from '../types';
import { Timestamp } from 'firebase/firestore';

interface AdminPartnerManagementProps {
  user: any;
}

type TabType = 'partners' | 'orders' | 'withdrawals' | 'catalog';

export default function AdminPartnerManagement({ user }: AdminPartnerManagementProps) {
  const [activeTab, setActiveTab] = useState<TabType>('partners');
  const [partners, setPartners] = useState<PartnerShop[]>([]);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<PartnerWithdrawalRequest[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<PartnerShop | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'partners') {
      const unsub = onSnapshot(collection(db, 'partnerShops'), (snapshot) => {
        setPartners(snapshot.docs.map(d => ({ shopSlug: d.id, ...d.data() } as PartnerShop)));
      });
      return () => unsub();
    }

    if (activeTab === 'orders') {
      const unsub = onSnapshot(
        query(collection(db, 'partnerOrders'), orderBy('orderedAt', 'desc'), limit(100)),
        (snapshot) => {
          setOrders(snapshot.docs.map(d => ({ orderId: d.id, ...d.data() } as PartnerOrder)));
        }
      );
      return () => unsub();
    }

    if (activeTab === 'withdrawals') {
      const unsub = onSnapshot(
        query(collection(db, 'partnerWithdrawals'), where('status', '==', 'pending')),
        (snapshot) => {
          setWithdrawals(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PartnerWithdrawalRequest)));
        }
      );
      return () => unsub();
    }

    if (activeTab === 'catalog') {
      const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
        setCatalog(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CatalogProduct)));
      });
      return () => unsub();
    }
  }, [activeTab]);

  const tabItems = [
    { id: 'partners', label: 'Partner Shops', icon: <ShoppingBag size={20} />, badge: partners.filter(p => p.isActive).length },
    { id: 'orders', label: 'Orders', icon: <FileText size={20} />, badge: orders.filter(o => o.status === 'pending').length },
    { id: 'withdrawals', label: 'Withdrawals', icon: <Wallet size={20} />, badge: withdrawals.length },
    { id: 'catalog', label: 'Catalog', icon: <Package size={20} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#00C9A7] rounded-xl flex items-center justify-center">
          <ShoppingBag size={20} className="text-black" />
        </div>
        <div>
          <h1 className="font-black text-2xl">Partner Management</h1>
          <p className="text-xs text-gray-500">Manage partner shops, orders & payouts</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
              activeTab === item.id
                ? 'bg-[#00C9A7] text-black'
                : 'bg-[#111111] text-gray-400 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="font-bold text-sm">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="bg-black text-[#00C9A7] text-xs font-bold px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'partners' && (
        <PartnersTab partners={partners} onSelect={setSelectedPartner} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      )}
      {activeTab === 'orders' && <OrdersTab orders={orders} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />}
      {activeTab === 'withdrawals' && <WithdrawalsTab withdrawals={withdrawals} />}
      {activeTab === 'catalog' && <CatalogTab catalog={catalog} />}

      <AnimatePresence>
        {selectedPartner && (
          <PartnerDetailDrawer partner={selectedPartner} onClose={() => setSelectedPartner(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function PartnersTab({ partners, onSelect, searchQuery, setSearchQuery }: any) {
  const filteredPartners = partners.filter(p =>
    p.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.ownerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search partners..."
            className="w-full bg-[#111111] border border-gray-800 rounded-xl py-3 pl-12 pr-4"
          />
        </div>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-800">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Shop Name</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Sales</th>
              <th className="px-4 py-3">Margin</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPartners.map(partner => (
              <tr key={partner.ownerId} className="border-b border-gray-800 last:border-0">
                <td className="px-4 py-3 font-bold">{partner.shopName}</td>
                <td className="px-4 py-3 text-gray-400">{partner.ownerName}</td>
                <td className="px-4 py-3">{partner.totalOrders}</td>
                <td className="px-4 py-3">₹{partner.totalSales}</td>
                <td className="px-4 py-3 text-[#00C9A7]">₹{partner.totalMarginEarned}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${partner.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {partner.isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onSelect(partner)}
                    className="text-[#00C9A7] text-sm font-bold flex items-center gap-1"
                  >
                    View <ChevronRight size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPartners.length === 0 && (
        <div className="text-center py-8 text-gray-500">No partners found</div>
      )}
    </div>
  );
}

function OrdersTab({ orders, searchQuery, setSearchQuery }: any) {
  const filteredOrders = orders.filter(o =>
    o.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.partnerShopName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const updateStatus = async (orderId: string, newStatus: string) => {
    await updateDoc(doc(db, 'partnerOrders', orderId), {
      status: newStatus,
      ...(newStatus === 'delivered' ? { deliveredAt: serverTimestamp() } : {})
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search orders..."
            className="w-full bg-[#111111] border border-gray-800 rounded-xl py-3 pl-12 pr-4"
          />
        </div>
      </div>

      <div className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-800">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Order ID</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Margin</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.orderId} className="border-b border-gray-800 last:border-0">
                <td className="px-4 py-3 font-mono text-sm">{order.orderId}</td>
                <td className="px-4 py-3 text-sm">{order.partnerShopName}</td>
                <td className="px-4 py-3">
                  <p className="font-bold">{order.customerName}</p>
                  <p className="text-xs text-gray-500">{order.customerPhone}</p>
                </td>
                <td className="px-4 py-3 font-bold">₹{order.totalAmount}</td>
                <td className="px-4 py-3 text-[#00C9A7]">₹{order.totalPartnerMargin}</td>
                <td className="px-4 py-3">
                  <select
                    value={order.status}
                    onChange={e => updateStatus(order.orderId, e.target.value)}
                    className="bg-[#0A0A0A] border border-gray-800 rounded-lg px-2 py-1 text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {order.orderedAt?.toDate?.().toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WithdrawalsTab({ withdrawals }: { withdrawals: PartnerWithdrawalRequest[] }) {
  const approveWithdrawal = async (id: string) => {
    await updateDoc(doc(db, 'partnerWithdrawals', id), {
      status: 'approved',
      processedAt: serverTimestamp()
    });
  };

  const rejectWithdrawal = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    await updateDoc(doc(db, 'partnerWithdrawals', id), {
      status: 'rejected',
      rejectionReason: reason,
      processedAt: serverTimestamp()
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111111] border border-gray-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-gray-800">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">UPI ID</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map(w => (
              <tr key={w.id} className="border-b border-gray-800 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-bold">{w.partnerName}</p>
                  <p className="text-xs text-gray-500">{w.partnerShopName}</p>
                </td>
                <td className="px-4 py-3 font-black text-[#00C9A7]">₹{w.amount}</td>
                <td className="px-4 py-3 font-mono text-sm">{w.upiId}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {w.requestedAt?.toDate?.().toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveWithdrawal(w.id)}
                      className="bg-green-500 text-black px-3 py-1 rounded-lg text-sm font-bold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectWithdrawal(w.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {withdrawals.length === 0 && (
        <div className="text-center py-8 text-gray-500">No pending withdrawals</div>
      )}
    </div>
  );
}

function CatalogTab({ catalog }: { catalog: CatalogProduct[] }) {
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredCatalog = catalog.filter(p => {
    const matchesSearch = p.productName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.skuId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(catalog.map(p => p.category).filter(Boolean))];

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      alert('Excel upload functionality requires xlsx library. Please use manual entry for now.');
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">Product Catalog</h3>
            <p className="text-sm text-gray-500">{catalog.length} products</p>
          </div>
          <label className="bg-[#00C9A7] text-black font-bold px-4 py-2 rounded-xl cursor-pointer flex items-center gap-2">
            <Upload size={20} />
            Upload Excel
            <input type="file" hidden accept=".xlsx" onChange={handleExcelUpload} />
          </label>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-[#111111] border border-gray-800 rounded-xl py-3 pl-12 pr-4"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-[#111111] border border-gray-800 rounded-xl px-4"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filteredCatalog.map(product => (
          <div key={product.id} className="bg-[#111111] border border-gray-800 rounded-2xl p-4">
            {product.images?.[0] && (
              <img src={product.images[0]} alt={product.productName} className="w-full h-24 object-cover rounded-xl mb-3" />
            )}
            <h4 className="font-bold text-sm truncate">{product.productName}</h4>
            <p className="text-xs text-gray-500">{product.category}</p>
            <div className="flex justify-between mt-2">
              <div>
                <p className="text-[10px] text-gray-500">Base</p>
                <p className="font-mono text-sm">₹{product.hvrsBasePrice}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Retail</p>
                <p className="font-mono text-sm text-[#00C9A7]">₹{product.suggestedRetailPrice}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnerDetailDrawer({ partner, onClose }: { partner: PartnerShop; onClose: () => void }) {
  const [orders, setOrders] = useState<PartnerOrder[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'partnerOrders'), where('partnerId', '==', partner.ownerId), orderBy('orderedAt', 'desc'), limit(20)),
      (snapshot) => {
        setOrders(snapshot.docs.map(d => ({ orderId: d.id, ...d.data() } as PartnerOrder)));
      }
    );
    return () => unsub();
  }, [partner.ownerId]);

  const toggleActive = async () => {
    await updateDoc(doc(db, 'partnerShops', partner.ownerId), {
      isActive: !partner.isActive
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="w-full max-w-lg bg-[#0A0A0A] h-full overflow-y-auto border-l border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-black">{partner.shopName}</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[#111111] p-4 rounded-2xl">
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="text-2xl font-black">{partner.totalOrders}</p>
            </div>
            <div className="bg-[#111111] p-4 rounded-2xl">
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="text-2xl font-black">₹{partner.totalSales}</p>
            </div>
            <div className="bg-[#111111] p-4 rounded-2xl">
              <p className="text-xs text-gray-500">Margin Earned</p>
              <p className="text-2xl font-black text-[#00C9A7]">₹{partner.totalMarginEarned}</p>
            </div>
            <div className="bg-[#111111] p-4 rounded-2xl">
              <p className="text-xs text-gray-500">Status</p>
              <p className={`text-lg font-bold ${partner.isActive ? 'text-green-500' : 'text-red-500'}`}>
                {partner.isActive ? 'Active' : 'Suspended'}
              </p>
            </div>
          </div>

          <div className="bg-[#111111] p-4 rounded-2xl mb-4">
            <p className="text-xs text-gray-500 mb-2">Owner Details</p>
            <p className="font-bold">{partner.ownerName}</p>
            <p className="text-sm text-gray-400">{partner.ownerPhone}</p>
          </div>

          <div className="flex gap-2 mb-6">
            <a
              href={`/shop/${partner.shopSlug}`}
              target="_blank"
              className="flex-1 bg-[#111111] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Eye size={20} /> View Shop
            </a>
            <button
              onClick={toggleActive}
              className={`flex-1 font-bold py-3 rounded-xl flex items-center justify-center gap-2 ${
                partner.isActive ? 'bg-red-500 text-white' : 'bg-green-500 text-black'
              }`}
            >
              {partner.isActive ? <><ToggleLeft size={20} /> Suspend</> : <><ToggleRight size={20} /> Activate</>}
            </button>
          </div>

          <h3 className="font-bold mb-4">Recent Orders</h3>
          <div className="space-y-2">
            {orders.map(order => (
              <div key={order.orderId} className="bg-[#111111] p-3 rounded-xl flex justify-between">
                <div>
                  <p className="font-mono text-sm">{order.orderId}</p>
                  <p className="text-xs text-gray-500">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{order.totalAmount}</p>
                  <span className="text-xs text-gray-500">{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}