/**
 * WorkPlex Phase 6 — Partner Store System
 * Complete e-commerce engine: Shop Setup, Product Catalog, Cart, Checkout, Orders
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Plus, Minus, Trash2, CheckCircle, AlertCircle,
  ChevronRight, Copy, Share2, QrCode, Camera, Upload, X,
  Package, DollarSign, TrendingUp, BarChart3, MapPin, Phone
} from 'lucide-react';
import {
  collection, query, where, orderBy, limit, onSnapshot,
  addDoc, doc, setDoc, updateDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { UserProfile, ShopCategory, generateSlug, formatCurrency } from '../types';

interface PartnerShopSetupProps {
  user: any;
  userData: UserProfile;
  onComplete: () => void;
}

const CATEGORIES: ShopCategory[] = ['Fashion', 'Electronics', 'Home', 'Beauty', 'Sports'];

// Sample catalog products for demo
const SAMPLE_CATALOG = [
  { id: '1', name: 'Wireless Earbuds', category: 'Electronics', basePrice: 800, image: '🎧' },
  { id: '2', name: 'Cotton T-Shirt', category: 'Fashion', basePrice: 350, image: '👕' },
  { id: '3', name: 'Water Bottle', category: 'Home', basePrice: 250, image: '🍶' },
  { id: '4', name: 'Face Serum', category: 'Beauty', basePrice: 450, image: '✨' },
  { id: '5', name: 'Yoga Mat', category: 'Sports', basePrice: 600, image: '🧘' },
  { id: '6', name: 'Phone Case', category: 'Electronics', basePrice: 200, image: '📱' }
];

export default function PartnerShopSetup({ user, userData, onComplete }: PartnerShopSetupProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [shopLogo, setShopLogo] = useState<File | null>(null);
  const [logoURL, setLogoURL] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<ShopCategory[]>([]);
  const [commission, setCommission] = useState(10);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [uploadProgress, setUploadProgress] = useState(0);

  // Auto-generate slug from shop name
  useEffect(() => {
    if (shopName) {
      setShopSlug(generateSlug(shopName));
    }
  }, [shopName]);

  const toggleCategory = (cat: ShopCategory) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else if (selectedCategories.length < 3) {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const toggleProduct = (productId: string) => {
    const newProducts = new Map(selectedProducts);
    if (newProducts.has(productId)) {
      newProducts.delete(productId);
    } else {
      newProducts.set(productId, 1);
    }
    setSelectedProducts(newProducts);
  };

  const updateProductPrice = (productId: string, price: number) => {
    const newProducts = new Map(selectedProducts);
    newProducts.set(productId, price);
    setSelectedProducts(newProducts);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 2 * 1024 * 1024) {
      setShopLogo(file);
    }
  };

  const handlePublish = async () => {
    if (!shopName || selectedCategories.length === 0) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      let logoUrl = '';

      // Upload logo if provided
      if (shopLogo) {
        const logoRef = ref(storage, `shops/${user.uid}/logo.jpg`);
        const snapshot = await uploadBytes(logoRef, shopLogo);
        logoUrl = await getDownloadURL(snapshot.ref);
        setUploadProgress(50);
      }

      // Create shop document
      await setDoc(doc(db, 'partnerShops', user.uid), {
        shopName,
        shopSlug,
        logo: logoUrl,
        categories: selectedCategories,
        defaultCommission: commission,
        ownerId: user.uid,
        ownerName: userData.name,
        ownerPhone: userData.phone,
        isActive: true,
        totalSales: 0,
        totalOrders: 0,
        totalMarginEarned: 0,
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      });

      setUploadProgress(75);

      // Add selected products
      const batch = selectedProducts.entries();
      for (const [productId, price] of batch) {
        const catalogProduct = SAMPLE_CATALOG.find(p => p.id === productId);
        if (!catalogProduct) continue;

        const margin = price - catalogProduct.basePrice;
        await setDoc(doc(db, 'partnerProducts', `${user.uid}_${productId}`), {
          productId,
          partnerId: user.uid,
          hvrsBasePrice: catalogProduct.basePrice,
          partnerSellingPrice: price,
          partnerMargin: margin,
          productName: catalogProduct.name,
          category: catalogProduct.category,
          images: [],
          description: '',
          isActive: true,
          addedAt: serverTimestamp(),
          totalSold: 0
        });
      }

      setUploadProgress(100);

      // Update user profile
      await updateDoc(doc(db, 'users', user.uid), {
        shopName,
        shopSlug,
        shopLogo: logoUrl,
        categories: selectedCategories,
        defaultCommission: commission,
        shopPublished: true,
        mode: 'Partner'
      });

      // Add initial wallet bonus
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'signup_bonus',
        amount: 27,
        status: 'pending',
        description: 'Partner signup bonus',
        createdAt: serverTimestamp()
      });

      onComplete();
    } catch (error) {
      console.error('Shop publish error:', error);
      alert('Failed to publish shop. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-[#1A1A1A] z-50">
        <motion.div
          className="h-full bg-[#00C9A7]"
          initial={{ width: 0 }}
          animate={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      <div className="max-w-2xl mx-auto p-4 pt-8">
        {/* Step 1: Shop Name */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-black mb-6">Name Your Shop</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Shop Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g., Trendy Finds"
                  className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00C9A7]"
                />
              </div>
              {shopSlug && (
                <div className="bg-[#111111] rounded-xl p-3 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Your shop URL:</span>
                  <span className="text-xs text-[#00C9A7]">workplex.hvrs.in/shop/{shopSlug}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Logo & Categories */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-black mb-6">Logo & Categories</h2>
            <div className="space-y-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-bold mb-2">Shop Logo (Optional)</label>
                <div
                  onClick={() => document.getElementById('logoInput')?.click()}
                  className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-[#00C9A7]/50 transition-colors"
                >
                  {shopLogo ? (
                    <div className="space-y-2">
                      <CheckCircle className="w-8 h-8 text-[#00C9A7] mx-auto" />
                      <p className="text-sm font-bold">{shopLogo.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-gray-600 mx-auto" />
                      <p className="text-sm text-gray-400">Tap to upload logo</p>
                      <p className="text-xs text-gray-600">Max 2MB</p>
                    </div>
                  )}
                </div>
                <input id="logoInput" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-bold mb-3">Select Categories (up to 3)</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`p-3 rounded-xl border text-sm font-bold transition-all ${selectedCategories.includes(cat)
                          ? 'border-[#00C9A7] bg-[#00C9A7]/10 text-[#00C9A7]'
                          : 'border-gray-800 bg-[#1A1A1A] text-gray-500'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commission Slider */}
              <div>
                <label className="block text-sm font-bold mb-2">Default Commission: {commission}%</label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={commission}
                  onChange={(e) => setCommission(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#00C9A7' }}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-600">5%</span>
                  <span className="text-xs text-gray-600">30%</span>
                </div>
                {commission > 25 && (
                  <p className="text-xs text-yellow-500 mt-2">⚠️ High commission may reduce sales</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Select Products */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-black mb-6">Select Products</h2>
            <div className="space-y-3">
              {SAMPLE_CATALOG.map((product) => {
                const isSelected = selectedProducts.has(product.id);
                const price = selectedProducts.get(product.id) || product.basePrice + (product.basePrice * commission / 100);
                return (
                  <div
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={`bg-[#1A1A1A] rounded-xl p-4 border cursor-pointer transition-all ${isSelected ? 'border-[#00C9A7]' : 'border-gray-800'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{product.image}</span>
                        <div>
                          <p className="font-bold">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.category}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${isSelected ? 'bg-[#00C9A7]/20 text-[#00C9A7]' : 'bg-gray-800 text-gray-500'
                        }`}>
                        {isSelected ? 'Added' : 'Tap to add'}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-800">
                        <span className="text-xs text-gray-500">Base: ₹{product.basePrice}</span>
                        <input
                          type="number"
                          value={Math.round(price)}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateProductPrice(product.id, parseInt(e.target.value) || product.basePrice);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#111111] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-24"
                        />
                        <span className="text-xs text-[#00C9A7]">
                          Margin: ₹{Math.round(price - product.basePrice)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 4: Review & Publish */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h2 className="text-2xl font-black mb-6">Review & Publish</h2>
            <div className="space-y-4">
              <div className="bg-[#1A1A1A] rounded-xl p-4">
                <h3 className="font-bold mb-3">Shop Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span>{shopName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">URL:</span>
                    <span className="text-[#00C9A7]">/shop/{shopSlug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Categories:</span>
                    <span>{selectedCategories.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Commission:</span>
                    <span>{commission}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Products:</span>
                    <span>{selectedProducts.size}</span>
                  </div>
                </div>
              </div>

              {uploadProgress > 0 && (
                <div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#00C9A7]"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">Publishing shop... {uploadProgress}%</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 bg-gray-800 text-gray-400 font-bold py-3 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !shopName) ||
                (step === 2 && selectedCategories.length === 0) ||
                (step === 3 && selectedProducts.size === 0)
              }
              className="flex-1 bg-[#00C9A7] text-black font-bold py-3 rounded-xl hover:bg-[#00b395] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handlePublish}
              disabled={loading}
              className="flex-1 bg-[#00C9A7] text-black font-bold py-3 rounded-xl hover:bg-[#00b395] transition-colors disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Shop'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
