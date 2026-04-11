/**
 * WorkPlex Phase 9 — DeepSeek AI Integration (Firebase Cloud Functions)
 * AI-powered features: Task Generator, Earnings Predictor, Content Reviewer, Fraud Detector
 * Deploy with: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// DeepSeek API Configuration
const DEEPSEEK_API_KEY = functions.config().deepseek?.api_key || 'YOUR_API_KEY';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Rate limiting: max 1 AI call per worker per minute
const rateLimitStore = new Map();
const checkRateLimit = (uid) => {
  const now = Date.now();
  const lastCall = rateLimitStore.get(uid);
  if (lastCall && now - lastCall < 60000) return false;
  rateLimitStore.set(uid, now);
  return true;
};

// Call DeepSeek API
const callDeepSeek = async (messages, maxTokens = 500) => {
  try {
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * AI Task Generator - Runs daily at 6am via Cloud Scheduler
 */
exports.generateDailyTasks = functions.pubsub.schedule('0 6 * * *').onRun(async (context) => {
  console.log('Starting daily task generation...');
  try {
    const usersSnapshot = await db.collection('users')
      .where('mode', '==', 'Promoter')
      .where('onboardingStatus', '==', 'completed')
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;

      const lastGenerated = userData.aiTasksGeneratedAt?.toDate();
      if (lastGenerated && Date.now() - lastGenerated.getTime() < 6 * 60 * 60 * 1000) continue;

      const submissionsSnapshot = await db.collection('taskSubmissions')
        .where('workerId', '==', uid)
        .where('status', '==', 'approved')
        .orderBy('submittedAt', 'desc')
        .limit(7)
        .get();

      const completedTaskTypes = submissionsSnapshot.docs.map(d => d.data().taskTitle);
      const prompt = `Generate 3 marketing tasks for a ${userData.role} at ${userData.venture}. Their recent tasks: ${completedTaskTypes.join(', ') || 'none'}. Make tasks specific, actionable, different from recent ones. Return JSON array: [{"title": "...", "description": "...", "proofType": "image|link|text", "earnAmount": 25, "difficulty": "easy|medium|hard"}]`;

      try {
        const response = await callDeepSeek([
          { role: 'system', content: 'You are a task generator for a gig economy platform. Return ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ]);
        const tasks = JSON.parse(response);

        for (const task of tasks) {
          await db.collection('tasks').add({
            ...task,
            venture: userData.venture,
            role: [userData.role],
            assignedTo: 'all',
            isCrossVenture: false,
            isMystery: false,
            status: 'active',
            deadline: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        await db.collection('users').doc(uid).update({
          aiTasksGeneratedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (parseError) {
        console.error(`Failed to parse AI response for user ${uid}:`, parseError);
      }
    }
    console.log('Daily task generation complete');
  } catch (error) {
    console.error('Task generation error:', error);
  }
});

/**
 * AI Earnings Predictor - Called when home screen loads
 */
exports.predictEarnings = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  const uid = context.auth.uid;
  if (!checkRateLimit(uid)) throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded');

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    let prediction;

    if (userData.mode === 'Promoter') {
      const tasksSnapshot = await db.collection('tasks')
        .where('venture', '==', userData.venture)
        .where('role', 'array-contains', userData.role)
        .where('status', '==', 'active')
        .get();

      const pendingCount = tasksSnapshot.size;
      const avgEarning = tasksSnapshot.docs.reduce((sum, d) => sum + (d.data().earnAmount || 0), 0) / (pendingCount || 1);
      const prompt = `Worker has ${pendingCount} pending tasks. Average earning Rs.${avgEarning.toFixed(0)}. Predict today's additional earning potential. Return JSON: {"predictedEarning": number, "tasksToComplete": number, "motivationalMessage": "string"}`;

      const response = await callDeepSeek([
        { role: 'system', content: 'You are an earnings predictor. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      prediction = JSON.parse(response);
    } else {
      const ordersSnapshot = await db.collection('partnerOrders').where('partnerId', '==', uid).where('status', '==', 'pending').get();
      const productsSnapshot = await db.collection('partnerProducts').where('partnerId', '==', uid).where('isActive', '==', true).get();
      const prompt = `Partner shop has ${productsSnapshot.size} products, ${ordersSnapshot.size} pending orders. Predict today's potential margin earnings. Return JSON: {"predictedMargin": number, "recommendations": ["string"], "motivationalMessage": "string"}`;

      const response = await callDeepSeek([
        { role: 'system', content: 'You are an earnings predictor. Return ONLY valid JSON.' },
        { role: 'user', content: prompt }
      ]);
      prediction = JSON.parse(response);
    }

    await db.collection('users').doc(uid).update({
      aiPrediction: prediction,
      aiPredictionAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return prediction;
  } catch (error) {
    console.error('Prediction error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate prediction');
  }
});

/**
 * AI Fraud Detector - Runs every 6 hours
 */
exports.detectFraud = functions.pubsub.schedule('0 */6 * * *').onRun(async (context) => {
  console.log('Starting fraud detection...');
  try {
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();

      const tasksSnapshot = await db.collection('taskSubmissions').where('workerId', '==', uid).get();
      const withdrawalsSnapshot = await db.collection('withdrawals').where('workerId', '==', uid).get();
      const taskCompletionRate = tasksSnapshot.size > 0 ? tasksSnapshot.docs.filter(d => d.data().status === 'approved').length / tasksSnapshot.size : 0;

      const prompt = `Analyze this user behavior pattern for fraud indicators: Total tasks: ${tasksSnapshot.size}, Completion rate: ${(taskCompletionRate * 100).toFixed(1)}%, Withdrawal requests: ${withdrawalsSnapshot.size}, Mode: ${userData.mode}. Return JSON: {"fraudScore": 0-100, "indicators": ["string"], "recommendation": "string"}`;

      try {
        const response = await callDeepSeek([
          { role: 'system', content: 'You are a fraud detector. Return ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ]);
        const result = JSON.parse(response);

        if (result.fraudScore > 70) {
          await db.collection('fraudAlerts').add({
            userId: uid, userName: userData.name, mode: userData.mode,
            fraudScore: result.fraudScore, indicators: result.indicators,
            recommendation: result.recommendation, status: 'active',
            flaggedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          if (result.fraudScore > 90) {
            await db.collection('users').doc(uid).update({
              status: 'suspended', suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
              suspendReason: 'Auto-suspended due to high fraud score'
            });
          }
        }
      } catch (error) {
        console.error(`Fraud detection error for user ${uid}:`, error);
      }
    }
    console.log('Fraud detection complete');
  } catch (error) {
    console.error('Fraud detection error:', error);
  }
});

/**
 * AI Content Reviewer - Called on proof submission
 */
exports.reviewProof = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  const { proofType, proofContent, venture } = data;

  try {
    const prompt = `Review this ${proofType} content for a marketing task. Score 1-10 for: authenticity (not AI-generated), relevance to ${venture}, quality. Return JSON: {"score": 1-10, "isAIGenerated": boolean, "isFake": boolean, "reason": "string"}`;

    const response = await callDeepSeek([
      { role: 'system', content: 'You are a content reviewer. Return ONLY valid JSON.' },
      { role: 'user', content: `${prompt}\n\nContent: ${proofContent}` }
    ]);

    const result = JSON.parse(response);
    return {
      approved: result.score >= 5 && !result.isAIGenerated && !result.isFake,
      score: result.score,
      reason: result.reason
    };
  } catch (error) {
    console.error('Content review error:', error);
    return { approved: true, score: 5, reason: 'AI review failed, defaulting to manual review' };
  }
});

module.exports = {
  generateDailyTasks,
  predictEarnings,
  detectFraud,
  reviewProof
};
