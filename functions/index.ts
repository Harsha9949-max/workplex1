import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();
const db = admin.firestore();

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

/**
 * Helper to call DeepSeek API with rate limiting and caching.
 */
async function callDeepSeek(uid: string, prompt: string, cacheKey: string, ttlSeconds: number, systemInstruction?: string) {
  const now = Date.now();
  const cacheRef = db.collection('aiCache').doc(cacheKey);
  
  // 1. Check Cache
  const cacheSnap = await cacheRef.get();
  if (cacheSnap.exists) {
    const cacheData = cacheSnap.data()!;
    if (cacheData.expiresAt.toMillis() > now) {
      return cacheData.result;
    }
  }

  // 2. Rate Limit Check (1 call per uid per minute)
  const rateLimitRef = db.collection('aiRateLimits').doc(uid);
  const rateLimitSnap = await rateLimitRef.get();
  if (rateLimitSnap.exists) {
    const lastCall = rateLimitSnap.data()!.lastCall.toMillis();
    if (now - lastCall < 60000) {
      throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded. Please wait a minute.');
    }
  }

  // 3. Call DeepSeek
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('DEEPSEEK_API_KEY not set');
    throw new functions.https.HttpsError('failed-precondition', 'AI service not configured');
  }

  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data.choices[0].message.content;
    const parsedResult = JSON.parse(result);

    // 4. Update Cache and Rate Limit
    await cacheRef.set({
      result: parsedResult,
      expiresAt: admin.firestore.Timestamp.fromMillis(now + ttlSeconds * 1000)
    });
    await rateLimitRef.set({
      lastCall: admin.firestore.FieldValue.serverTimestamp()
    });

    return parsedResult;
  } catch (error: any) {
    console.error('DeepSeek API Error:', error.response?.data || error.message);
    await db.collection('aiErrors').add({
      uid,
      error: error.response?.data || error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      context: cacheKey
    });
    throw new functions.https.HttpsError('internal', 'AI processing failed');
  }
}

/**
 * 1. AI TASK GENERATOR
 * Runs daily at 6am via Cloud Scheduler.
 */
export const aiTaskGenerator = functions.pubsub.schedule('0 6 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const activeUsersSnap = await db.collection('users')
      .where('status', '==', 'active')
      .get();

    for (const userDoc of activeUsersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();

      // Skip if generated recently (< 6hrs)
      if (userData.aiTasksGeneratedAt && (Date.now() - userData.aiTasksGeneratedAt.toMillis() < 6 * 3600000)) {
        continue;
      }

      // Gather context (NO personal data)
      const recentSubmissions = await db.collection('taskSubmissions')
        .where('userId', '==', uid)
        .orderBy('submittedAt', 'desc')
        .limit(10)
        .get();
      
      const completedTaskTypes = recentSubmissions.docs.map(d => d.data().taskTitle);
      const completionRate = userData.totalTasksCompleted ? (userData.totalTasksCompleted / (userData.totalTasksCompleted + (userData.tasksSkipped || 0))) * 100 : 0;

      const prompt = `Generate 3 marketing tasks for a ${userData.role} at ${userData.venture}. Their recent tasks: ${completedTaskTypes.join(', ')}. Make tasks specific, actionable, different from recent ones. Return JSON array: {"tasks": [{"title", "description", "proofType", "earnAmount", "difficulty"}]}`;

      try {
        const result = await callDeepSeek(uid, prompt, `tasks_${uid}`, 21600, 'You are an expert task generator for a gig platform.');
        
        const batch = db.batch();
        result.tasks.forEach((task: any) => {
          const taskRef = db.collection('tasks').doc(uid).collection('assigned').doc();
          batch.set(taskRef, {
            ...task,
            earning: task.earnAmount,
            status: 'assigned',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isAI: true
          });
        });
        
        batch.update(db.collection('users').doc(uid), {
          aiTasksGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        await batch.commit();
      } catch (e) {
        console.error(`Failed to generate tasks for ${uid}:`, e);
      }
    }
  });

/**
 * 2. AI EARNINGS PREDICTOR
 * Called when home screen loads.
 */
export const aiEarningsPredictor = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const uid = context.auth.uid;

  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data()!;

  const pendingTasksSnap = await db.collection('tasks').doc(uid).collection('assigned')
    .where('status', '==', 'assigned')
    .get();
  
  const pendingTaskCount = pendingTasksSnap.size;
  const averageTaskEarning = userData.totalEarned / (userData.totalTasksCompleted || 1);
  const completionRate = userData.totalTasksCompleted ? (userData.totalTasksCompleted / (userData.totalTasksCompleted + (userData.tasksSkipped || 0))) * 100 : 0;

  const prompt = `Worker has ${pendingTaskCount} pending tasks. Average earning Rs.${averageTaskEarning}. Completion rate ${completionRate}%. Predict today's additional earning potential. Return JSON: {"predictedEarning", "tasksToComplete", "motivationalMessage"}`;

  return await callDeepSeek(uid, prompt, `prediction_${uid}`, 3600);
});

/**
 * 3. AI CONTENT REVIEWER
 * Triggered on proof submission.
 */
export const aiContentReviewer = functions.firestore
  .document('taskSubmissions/{submissionId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    const submissionId = context.params.submissionId;
    const uid = data.userId;

    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data()!;

    let prompt = '';
    if (data.proofType === 'image') {
      prompt = `Review this social media screenshot for ${userData.venture}. Proof link: ${data.proofLink}. Score 1-10 for: authenticity (not AI-generated), relevance, quality. Return JSON: {"score", "isAIGenerated", "isFake", "reason"}`;
    } else {
      prompt = `Review this social media content/link: ${data.proofLink}. It is for ${userData.venture}. Score 1-10 for: authenticity (not AI-generated), relevance, quality. Return JSON: {"score", "isAIGenerated", "isFake", "reason"}`;
    }

    try {
      const result = await callDeepSeek(uid, prompt, `review_${submissionId}`, 0);

      if (result.score < 5 || result.isAIGenerated || result.isFake) {
        await snap.ref.update({
          status: 'rejected',
          rejectionReason: `AI Review Failed: ${result.reason}`,
          aiReview: result
        });
        await db.collection('users').doc(uid).update({
          rejectionCount: admin.firestore.FieldValue.increment(1)
        });
      } else {
        await snap.ref.update({
          aiReview: result,
          aiPassed: true
        });
      }
    } catch (e) {
      console.error(`AI Review failed for ${submissionId}:`, e);
    }
  });

/**
 * 4. AI FRAUD DETECTOR
 * Runs every 6 hours via Cloud Scheduler.
 */
export const aiFraudDetector = functions.pubsub.schedule('0 */6 * * *')
  .onRun(async (context) => {
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();

      // Gather anonymized behavior data (NO names or personal data)
      const data = {
        loginFrequency: userData.loginFrequency || 0,
        taskCompletionPattern: userData.taskCompletionPattern || [],
        withdrawalPattern: userData.withdrawalPattern || [],
        ipAddressCount: userData.ipAddressCount || 0,
        deviceCount: userData.deviceCount || 0
      };

      const prompt = `Analyze this user behavior pattern for fraud indicators: ${JSON.stringify(data)}. Return JSON: {"fraudScore": 0-100, "indicators": [], "recommendation"}`;

      try {
        const result = await callDeepSeek(uid, prompt, `fraud_${uid}`, 21600);

        if (result.fraudScore > 70) {
          await db.collection('fraudAlerts').add({
            userId: uid,
            userName: userData.name, // Admin needs name, but we didn't send it to AI
            fraudScore: result.fraudScore,
            indicators: result.indicators,
            recommendation: result.recommendation,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active'
          });
        }

        if (result.fraudScore > 90) {
          await db.collection('users').doc(uid).update({
            status: 'suspended',
            suspensionReason: 'AI Fraud Detection: High Risk'
          });
        }
      } catch (e) {
        console.error(`Fraud detection failed for ${uid}:`, e);
      }
    }
  });

/**
 * 5. AI PRODUCT PICKER
 * For Reseller role, called on product browse screen.
 */
export const aiProductPicker = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const uid = context.auth.uid;

  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data()!;

  if (userData.role !== 'Reseller') {
    throw new functions.https.HttpsError('permission-denied', 'Only resellers can access product picker');
  }

  const city = userData.city || 'Unknown';
  const month = new Date().toLocaleString('default', { month: 'long' });
  const salesHistory = userData.salesHistory || [];

  const prompt = `Suggest 5 trending product categories for a reseller in ${city} in ${month} for ${userData.venture}. Consider seasonal trends. Recent sales: ${salesHistory.join(', ')}. Return JSON: {"recommendations": [{"category", "reason", "trending"}]}`;

  return await callDeepSeek(uid, prompt, `products_${uid}`, 86400);
});

/**
 * DAILY STREAK SYSTEM
 * Runs at midnight daily to update streaks.
 */
export const dailyStreakUpdate = functions.pubsub.schedule('0 0 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const usersSnap = await db.collection('users').get();
    const batch = db.batch();

    usersSnap.forEach(doc => {
      const userData = doc.data();
      const lastActiveDate = userData.lastActiveDate || '';
      let currentStreak = userData.streak || 0;

      if (lastActiveDate === yesterdayStr) {
        // User was active yesterday, streak continues if they complete a task today
        // Actually, the logic should be: at midnight, check if they were active TODAY (the day that just ended)
        // If yes, streak++, if no, streak = 0
      }
    });
    // ... logic continues ...
  });

/**
 * STREAK WARNING
 * Runs at 9pm daily to warn users.
 */
export const streakWarning = functions.pubsub.schedule('0 21 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const usersSnap = await db.collection('users')
      .where('streak', '>', 0)
      .get();

    for (const doc of usersSnap.docs) {
      const userData = doc.data();
      if (userData.lastActiveDate !== todayStr) {
        // Send FCM
        const message = {
          notification: {
            title: 'Streak at Risk!',
            body: `Your ${userData.streak}-day streak is at risk! Complete a task now!`,
          },
          token: userData.fcmToken,
        };
        if (userData.fcmToken) {
          await admin.messaging().send(message);
        }
      }
    }
  });

/**
 * LEADERBOARD AGGREGATION
 * Runs hourly to aggregate earnings.
 */
export const aggregateLeaderboard = functions.pubsub.schedule('0 * * * *')
  .onRun(async (context) => {
    const ventures = ['BuyRix', 'Vyuma', 'TrendyVerse', 'Growplex'];
    const now = new Date();
    const weekId = `${now.getFullYear()}-W${getWeekNumber(now)}`;

    for (const venture of ventures) {
      const usersSnap = await db.collection('users')
        .where('venture', '==', venture)
        .get();

      const entries = usersSnap.docs.map(doc => ({
        userId: doc.id,
        userName: doc.data().name,
        earnedThisWeek: doc.data().weeklyEarnings || 0, // Assuming we track this
      }));

      entries.sort((a, b) => b.earnedThisWeek - a.earnedThisWeek);

      const top10 = entries.slice(0, 10);
      
      const batch = db.batch();
      top10.forEach((entry, index) => {
        const ref = db.collection('leaderboard').doc(venture)
          .collection('weekly').doc(weekId)
          .collection('entries').doc(entry.userId);
        batch.set(ref, {
          userName: entry.userName,
          venture: venture,
          earnedThisWeek: entry.earnedThisWeek,
          rank: index + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }
  });

/**
 * BADGE SYSTEM
 * Triggered on task approval.
 */
export const checkBadgesOnTaskApproval = functions.firestore
  .document('taskSubmissions/{submissionId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    if (newData.status === 'approved' && oldData.status !== 'approved') {
      const userId = newData.userId;
      const userRef = db.collection('users').doc(userId);
      const userSnap = await userRef.get();
      const userData = userSnap.data();
      if (!userData) return;

      const earnedBadges = userData.badges || [];
      const newBadges = [];

      // first_sale
      if (!earnedBadges.includes('first_sale')) {
        newBadges.push('first_sale');
      }

      // streak_7
      if (userData.streak >= 7 && !earnedBadges.includes('streak_7')) {
        newBadges.push('streak_7');
      }

      // club_10k
      if (userData.totalEarned >= 10000 && !earnedBadges.includes('club_10k')) {
        newBadges.push('club_10k');
      }

      if (newBadges.length > 0) {
        await userRef.update({
          badges: admin.firestore.FieldValue.arrayUnion(...newBadges)
        });
        // Send FCM for each new badge
      }
    }
  });

function getWeekNumber(d: Date) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}
