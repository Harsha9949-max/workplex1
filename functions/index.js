/**
 * WorkPlex Partner Store Cloud Functions
 * 
 * Deploy with: firebase deploy --only functions
 * 
 * Schedule:
 * - releasePartnerMargins: every day at midnight
 * - checkPartnerActivity: every week on Sunday
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');

admin.initializeApp();
const db = admin.firestore();

/**
 * releasePartnerMargins()
 * 
 * Runs daily at midnight via Cloud Scheduler
 * Checks for orders where marginStatus is "holding" and marginReleaseAt <= now
 * Updates marginStatus to "pending" and creates partnerMargins record
 */
exports.releasePartnerMargins = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Starting margin release job...');

    try {
      const now = admin.firestore.Timestamp.now();
      
      // Get orders where marginStatus is "holding" and marginReleaseAt <= now
      const holdingOrders = await db.collection('partnerOrders')
        .where('marginStatus', '==', 'holding')
        .where('marginReleaseAt', '<=', now)
        .get();

      console.log(`Found ${holdingOrders.size} orders to release margins for`);

      for (const orderDoc of holdingOrders.docs) {
        const order = orderDoc.data();
        
        // Update order marginStatus to "pending"
        await db.collection('partnerOrders').doc(orderDoc.id).update({
          marginStatus: 'pending'
        });

        // Create partnerMargins pending record
        await db.collection('partnerMargins').doc(order.partnerId)
          .collection('pending').add({
            orderId: orderDoc.id,
            amount: order.totalPartnerMargin,
            status: 'pending',
            orderedAt: order.orderedAt,
            releaseAt: now,
            releasedAt: null
          });

        console.log(`Released margin for order ${orderDoc.id}: ₹${order.totalPartnerMargin}`);
      }

      console.log(`Margin release completed for ${holdingOrders.size} orders`);
      return null;

    } catch (error) {
      console.error('Error releasing margins:', error);
      return null;
    }
  });

/**
 * checkPartnerActivity()
 * 
 * Runs weekly to check for inactive partners
 * Marks partners with no orders in 30+ days as inactive
 */
exports.checkPartnerActivity = functions.pubsub
  .schedule('0 0 * * 0')  // Every Sunday at midnight
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    console.log('Starting partner activity check...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);

      // Get all partner shops
      const partners = await db.collection('partnerShops').get();
      let inactiveCount = 0;

      for (const partnerDoc of partners.docs) {
        const partner = partnerDoc.data();

        // Check if partner has any orders in last 30 days
        const recentOrders = await db.collection('partnerOrders')
          .where('partnerId', '==', partner.ownerId)
          .where('orderedAt', '>=', thirtyDaysAgoTimestamp)
          .limit(1)
          .get();

        if (recentOrders.empty) {
          // Mark as inactive
          await db.collection('partnerShops').doc(partner.ownerId).update({
            isActive: false
          });
          inactiveCount++;
          console.log(`Marked inactive: ${partner.shopName}`);
        }
      }

      console.log(`Activity check completed. ${inactiveCount} partners marked inactive`);
      return null;

    } catch (error) {
      console.error('Error checking partner activity:', error);
      return null;
    }
  });

/**
 * processPartnerOrder()
 * 
 * Triggered when a new partner order is created
 * Updates partner stats
 */
exports.processPartnerOrder = functions.firestore
  .document('partnerOrders/{orderId}')
  .onCreate(async (snapshot, context) => {
    const order = snapshot.data();

    try {
      // Update partner stats
      await db.collection('partnerShops').doc(order.partnerId).update({
        totalOrders: admin.firestore.FieldValue.increment(1),
        totalSales: admin.firestore.FieldValue.increment(order.totalAmount),
        lastActiveAt: admin.firestore.Timestamp.now()
      });

      // Update product totalSold
      for (const product of order.products) {
        await db.collection('partnerProducts')
          .doc(order.partnerId)
          .collection('products')
          .doc(product.productId)
          .update({
            totalSold: admin.firestore.FieldValue.increment(product.quantity)
          });
      }

      console.log(`Processed order ${snapshot.id}`);
      return null;

    } catch (error) {
      console.error('Error processing order:', error);
      return null;
    }
  });

/**
 * handleOrderDelivery()
 * 
 * Triggered when order status changes to "delivered"
 * Sets margin release date to 7 days from delivery
 */
exports.handleOrderDelivery = functions.firestore
  .document('partnerOrders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes to "delivered"
    if (before.status !== 'delivered' && after.status === 'delivered') {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      await db.collection('partnerOrders').doc(context.params.orderId).update({
        marginReleaseAt: admin.firestore.Timestamp.fromDate(deliveryDate),
        marginStatus: 'holding'
      });

      console.log(`Set margin release for order ${context.params.orderId}`);
    }

    return null;
  });

/**
 * processWithdrawal()
 * 
 * Triggered when withdrawal is approved
 * Transfers margin from pending to withdrawn
 */
exports.processWithdrawal = functions.firestore
  .document('partnerWithdrawals/{withdrawalId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only process when status changes to "approved"
    if (before.status !== 'approved' && after.status === 'approved') {
      const partnerId = after.partnerId;
      const amount = after.amount;

      // Update partner's total withdrawn
      await db.collection('partnerShops').doc(partnerId).update({
        totalWithdrawn: admin.firestore.FieldValue.increment(amount)
      });

      console.log Processed withdrawal for partner ${partnerId}: ₹${amount}`);
    }

    return null;
  });

/**
 * createDefaultPartnerMargins()
 * 
 * HTTP function to manually trigger margin release (for testing)
 */
exports.createDefaultPartnerMargins = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth || context.auth.token.email !== 'marateyh@gmail.com') {
    throw new functions.https.HttpsError('unauthenticated', 'Admin only');
  }

  const now = admin.firestore.Timestamp.now();
  
  // Get orders where marginStatus is "holding" and marginReleaseAt <= now
  const holdingOrders = await db.collection('partnerOrders')
    .where('marginStatus', '==', 'holding')
    .where('marginReleaseAt', '<=', now)
    .get();

  const results = [];

  for (const orderDoc of holdingOrders.docs) {
    const order = orderDoc.data();
    
    await db.collection('partnerOrders').doc(orderDoc.id).update({
      marginStatus: 'pending'
    });

    await db.collection('partnerMargins').doc(order.partnerId)
      .collection('pending').add({
        orderId: orderDoc.id,
        amount: order.totalPartnerMargin,
        status: 'pending',
        orderedAt: order.orderedAt,
        releaseAt: now,
        releasedAt: null
      });

    results.push({ orderId: orderDoc.id, amount: order.totalPartnerMargin });
  }

  return {
    success: true,
    released: results.length,
    orders: results
  };
});

/**
 * getPartnerStats()
 * 
 * HTTP function to get partner statistics
 */
exports.getPartnerStats = functions.https.onCall(async (data, context) => {
  const { partnerId } = data;

  if (!partnerId) {
    throw new functions.https.HttpsError('invalid-argument', 'partnerId required');
  }

  const shopDoc = await db.collection('partnerShops').doc(partnerId).get();
  if (!shopDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Partner not found');
  }

  const shop = shopDoc.data();

  const ordersSnapshot = await db.collection('partnerOrders')
    .where('partnerId', '==', partnerId)
    .get();

  const pendingMargins = await db.collection('partnerMargins')
    .doc(partnerId)
    .collection('pending')
    .where('status', '==', 'pending')
    .get();

  const availableMargin = pendingMargins.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

  return {
    totalOrders: shop.totalOrders || 0,
    totalSales: shop.totalSales || 0,
    totalMarginEarned: shop.totalMarginEarned || 0,
    pendingMargin: ordersSnapshot.docs
      .filter(d => d.data().marginStatus === 'holding' || d.data().marginStatus === 'pending')
      .reduce((sum, d) => sum + (d.data().totalPartnerMargin || 0), 0),
    availableMargin,
    totalWithdrawn: shop.totalWithdrawn || 0
  };
});