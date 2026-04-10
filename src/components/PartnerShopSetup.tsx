import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Camera, Upload, ChevronRight, ChevronLeft, CheckCircle,
  Loader2, AlertCircle, X, Plus, Minus, Trash2, Eye, Search,
  PriceTag, ShoppingBag, DollarSign
} from 'lucide-react';
import { doc, setDoc, getDoc, collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { CatalogProduct, PartnerShop, PartnerProduct } from '../types';
import { Timestamp } from 'firebase/firestore';

interface PartnerShopSetupProps {
  user: any;
  userData: any;
}

export default function PartnerShopSetup({ user, userData }: PartnerShopSetupProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, PartnerProduct>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const totalSteps = 5;

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      const q = query(collection(db, 'products'), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CatalogProduct));
      setCatalogProducts(products);
    } catch (err) {
      console.error('Error loading catalog:', err);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);
  };

  const handleShopNameChange = (name: string) => {
    setShopName(name);
    setShopSlug(generateSlug(name));
  };

  const checkSlugExists = async (slug: string) => {
    const q = query(collection(db, 'partnerShops'), where('shopSlug', '==', slug));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const handleNext = async () => {
    if (step === 1) {
      if (shopName.length < 3 || shopName.length > 50) {
        setError('Shop name must be between 3 and 50 characters');
        return;
      }

      let finalSlug = shopSlug;
      const exists = await checkSlugExists(finalSlug);
      if (exists) {
        finalSlug = `${shopSlug}-${Math.floor(Math.random() * 1000)}`;
      }
      setShopSlug(finalSlug);
    }

    if (step === 3) {
      if (selectedProducts.size === 0) {
        setError('Please select at least one product for your shop');
        return;
      }
    }

    setError(null);
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const handlePrev = () => {
    setStep(s => Math.max(s - 1, 1));
    setError(null);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    try {
      setLoading(true);
      const storageRef = ref(storage, `partnerLogos/${user.uid}/logo`);
      const snapshot = await uploadBytes(storageRef, logoFile);
      const url = await getDownloadURL(snapshot.ref);
      setLogo(url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setLoading(true);

      let logoUrl = logo;
      if (logoFile && !logo) {
        const storageRef = ref(storage, `partnerLogos/${user.uid}/logo`);
        const snapshot = await uploadBytes(storageRef, logoFile);
        logoUrl = await getDownloadURL(snapshot.ref);
      }

      const shopData: PartnerShop = {
        shopName,
        shopSlug,
        logo: logoUrl || '',
        ownerId: user.uid,
        ownerName: userData?.name || '',
        ownerPhone: userData?.phone || '',
        isActive: true,
        totalSales: 0,
        totalOrders: 0,
        totalMarginEarned: 0,
        createdAt: Timestamp.now(),
        lastActiveAt: Timestamp.now()
      };

      await setDoc(doc(db, 'partnerShops', user.uid), shopData);

      for (const [productId, partnerProduct] of selectedProducts) {
        await setDoc(doc(db, 'partnerProducts', user.uid, 'products', productId), {
          ...partnerProduct,
          isActive: true,
          addedAt: Timestamp.now(),
          totalSold: 0
        });
      }

      await setDoc(doc(db, 'users', user.uid), {
        mode: 'Partner',
        shopPublished: true,
        shopSlug
      }, { merge: true });

      navigate('/partner/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to publish shop');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = catalogProducts.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.skuId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(catalogProducts.map(p => p.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="fixed top-0 left-0 w-full h-1 bg-[#111111] z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-[#00C9A7] to-[#E8B84B] shadow-[0_0_15px_rgba(0,201,167,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-[10px] font-black text-[#00C9A7] uppercase tracking-[0.2em] mb-2">Step {step} of {totalSteps}</p>
          <h1 className="text-3xl font-black">
            {step === 1 && 'Name Your Shop'}
            {step === 2 && 'Add Logo (Optional)'}
            {step === 3 && 'Browse Products'}
            {step === 4 && 'Set Your Prices'}
            {step === 5 && 'Preview & Publish'}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Shop Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={e => handleShopNameChange(e.target.value)}
                  placeholder="e.g., Rahul's Fashion Store"
                  maxLength={50}
                  className="w-full bg-[#111111] border border-white/10 rounded-2xl p-4 text-lg focus:border-[#00C9A7] outline-none transition-all"
                />
                <p className="text-gray-500 text-xs mt-2">{shopName.length}/50 characters</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Shop URL</label>
                <div className="flex items-center gap-2 bg-[#111111] border border-white/10 rounded-2xl p-4">
                  <span className="text-gray-500">workplex.hvrs.in/shop/</span>
                  <span className="text-[#00C9A7] font-mono font-bold">{shopSlug || 'your-shop'}</span>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button
                disabled={shopName.length < 3}
                onClick={handleNext}
                className="w-full bg-[#00C9A7] text-black font-black py-5 rounded-2xl shadow-lg shadow-[#00C9A7]/20 disabled:opacity-20 flex items-center justify-center gap-2"
              >
                Continue <ChevronRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div className="w-32 h-32 bg-[#111111] rounded-[32px] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-[#00C9A7]/50">
                    {logo || logoFile ? (
                      logoFile ? (
                        <img src={URL.createObjectURL(logoFile)} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <img src={logo || ''} alt="Logo" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <Camera size={32} className="text-gray-700 group-hover:text-[#00C9A7] transition-colors" />
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 bg-[#00C9A7] text-black p-3 rounded-2xl shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer">
                    <Upload size={20} />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoFile(file);
                          handleLogoUpload();
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-gray-500 text-sm mt-4">Upload your shop logo (optional)</p>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={handlePrev}
                  className="flex-1 bg-[#1A1A1A] text-gray-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 bg-[#00C9A7] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  Skip <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-full bg-[#111111] border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:border-[#00C9A7] outline-none transition-all"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-[#111111] border border-white/10 rounded-2xl px-4 py-3 focus:border-[#00C9A7] outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto">
                {filteredProducts.map(product => {
                  const isSelected = selectedProducts.has(product.id);
                  return (
                    <motion.div
                      key={product.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        if (isSelected) {
                          const newMap = new Map(selectedProducts);
                          newMap.delete(product.id);
                          setSelectedProducts(newMap);
                        } else {
                          const newMap = new Map(selectedProducts);
                          newMap.set(product.id, {
                            productId: product.id,
                            hvrsBasePrice: product.hvrsBasePrice,
                            partnerSellingPrice: product.suggestedRetailPrice,
                            partnerMargin: product.suggestedRetailPrice - product.hvrsBasePrice,
                            productName: product.productName,
                            category: product.category,
                            images: product.images,
                            description: product.description,
                            isActive: true,
                            addedAt: Timestamp.now(),
                            totalSold: 0
                          });
                          setSelectedProducts(newMap);
                        }
                      }}
                      className={`bg-[#111111] border rounded-2xl p-4 cursor-pointer transition-all ${
                        isSelected ? 'border-[#00C9A7] bg-[#00C9A7]/5' : 'border-white/5'
                      }`}
                    >
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.productName}
                          className="w-full h-24 object-cover rounded-xl mb-3"
                        />
                      )}
                      <h4 className="font-bold text-sm truncate">{product.productName}</h4>
                      <p className="text-xs text-gray-500">{product.category}</p>
                      <div className="flex justify-between items-center mt-2">
                        <div>
                          <p className="text-[10px] text-gray-500">HVRS: ₹{product.hvrsBasePrice}</p>
                          <p className="text-[#00C9A7] font-bold text-sm">₹{product.suggestedRetailPrice}</p>
                        </div>
                        {isSelected && <CheckCircle size={20} className="text-[#00C9A7]" />}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-gray-500 text-sm text-center">{selectedProducts.size} products selected</p>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handlePrev}
                  className="flex-1 bg-[#1A1A1A] text-gray-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={selectedProducts.size === 0}
                  className="flex-1 bg-[#00C9A7] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-20"
                >
                  Continue <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {Array.from(selectedProducts.values()).map(product => {
                const margin = product.partnerSellingPrice - product.hvrsBasePrice;
                const marginPercent = (margin / product.hvrsBasePrice) * 100;
                const isHighMargin = marginPercent > 30;

                return (
                  <div key={product.productId} className="bg-[#111111] border border-white/5 rounded-2xl p-4">
                    <div className="flex gap-4">
                      {product.images?.[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.productName}
                          className="w-16 h-16 object-cover rounded-xl"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold">{product.productName}</h4>
                        <p className="text-xs text-gray-500">{product.category}</p>

                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase">HVRS Base Price</p>
                            <p className="text-gray-400 font-mono">₹{product.hvrsBasePrice}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase">Your Selling Price</p>
                            <input
                              type="number"
                              value={product.partnerSellingPrice}
                              onChange={e => {
                                const newPrice = parseInt(e.target.value) || 0;
                                const newMap = new Map(selectedProducts);
                                newMap.set(product.productId, {
                                  ...product,
                                  partnerSellingPrice: newPrice,
                                  partnerMargin: newPrice - product.hvrsBasePrice
                                });
                                setSelectedProducts(newMap);
                              }}
                              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 font-mono focus:border-[#00C9A7] outline-none"
                            />
                          </div>
                        </div>

                        <div className="mt-2 p-2 bg-[#0A0A0A] rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Your Margin</span>
                            <span className="font-bold text-[#00C9A7]">₹{margin}</span>
                          </div>
                          {isHighMargin && (
                            <p className="text-[10px] text-yellow-500 mt-1">High margin may reduce sales</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-4">
                <button
                  onClick={handlePrev}
                  className="flex-1 bg-[#1A1A1A] text-gray-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 bg-[#00C9A7] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  Preview Shop <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-[#111111] border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  {logo && <img src={logo} alt="Logo" className="w-16 h-16 rounded-2xl object-cover" />}
                  <div>
                    <h3 className="text-2xl font-black">{shopName}</h3>
                    <p className="text-gray-500 text-sm">workplex.hvrs.in/shop/{shopSlug}</p>
                  </div>
                </div>

                <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">{selectedProducts.size} Products</p>

                <div className="space-y-3">
                  {Array.from(selectedProducts.values()).map(product => (
                    <div key={product.productId} className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-xl">
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.productName} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="font-bold text-sm">{product.productName}</p>
                          <p className="text-xs text-gray-500">Your margin: ₹{product.partnerMargin}</p>
                        </div>
                      </div>
                      <p className="font-bold text-[#00C9A7]">₹{product.partnerSellingPrice}</p>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handlePrev}
                  className="flex-1 bg-[#1A1A1A] text-gray-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={20} /> Back
                </button>
                <button
                  onClick={handlePublish}
                  disabled={loading}
                  className="flex-1 bg-[#E8B84B] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#E8B84B]/20"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : 'Publish My Shop'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}