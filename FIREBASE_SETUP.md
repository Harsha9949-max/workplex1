# WorkPlex Firebase Backend Setup Guide

## 📋 Overview

This guide will help you set up Firebase Authentication for **Google Sign-In** and **Phone OTP** authentication for your WorkPlex application.

---

## 🔧 Prerequisites

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase project created**
   - Project ID: `studio-1168430589-ca062`
   - Console: https://console.firebase.google.com/project/studio-1168430589-ca062

---

## 🚀 Step-by-Step Setup

### Step 1: Login to Firebase CLI

```bash
firebase login
```

### Step 2: Initialize Firebase Project

```bash
firebase init
```

Select:
- ✅ Firestore
- ✅ Functions
- ✅ Storage
- ✅ Hosting

Use existing files when prompted.

### Step 3: Enable Google Sign-In

1. Go to [Firebase Console](https://console.firebase.google.com/project/studio-1168430589-ca062/authentication/providers)
2. Click **Get Started** in Authentication
3. Go to **Sign-in method** tab
4. Click **Google** and enable it
5. Set **Project support email** (your email)
6. Click **Save**

### Step 4: Enable Phone Authentication (OTP)

1. In the same **Sign-in method** tab
2. Click **Phone** and enable it
3. Configure **reCAPTCHA verification**:
   - For development: Add `localhost` to authorized domains
   - For production: Add your custom domain
4. Click **Save**

#### Test Phone Numbers (Development)

Add test phone numbers for development without SMS charges:
1. Scroll to **Phone numbers for testing**
2. Add test numbers like:
   - `+91 9876543210` → OTP: `123456`
   - `+91 9876543211` → OTP: `654321`

### Step 5: Add Authorized Domains

1. Go to **Settings** → **Authorized domains**
2. Ensure these are added:
   - `studio-1168430589-ca062.firebaseapp.com`
   - `studio-1168430589-ca062.web.app`
   - `localhost` (for development)
   - Your custom domain (if any)

### Step 6: Download Service Account Key

1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Save as `serviceAccountKey.json` in project root
4. **⚠️ Never commit this file to Git** (already in `.gitignore`)

### Step 7: Deploy Security Rules

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage
```

### Step 8: Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Step 9: Run Setup Script

```bash
node setup-firebase-backend.js
```

This will:
- ✅ Initialize Firestore collections
- ✅ Verify Auth configuration
- ✅ Setup Storage bucket structure
- ✅ Create admin user template

---

## 🧪 Testing Authentication

### Test Google Sign-In

1. Run your app: `npm run dev`
2. Click **Login** or **Start Earning Now**
3. Select **Continue with Google**
4. Sign in with your Google account
5. Verify user appears in Firebase Console → Authentication

### Test Phone OTP

1. Run your app: `npm run dev`
2. Click **Login** or **Start Earning Now**
3. Select **Continue with Phone**
4. Enter phone number (use test number if configured)
5. Enter OTP received via SMS
6. Verify user appears in Firebase Console → Authentication

---

## 📁 Project Structure

```
workplex/
├── firebase-applet-config.json      # Firebase app configuration
├── firebase-blueprint.json          # Database schema blueprint
├── firestore.rules                  # Firestore security rules
├── storage.rules                    # Firebase Storage security rules
├── setup-firebase-backend.js        # Backend setup script
├── serviceAccountKey.json           # Service account key (gitignored)
├── .env.example                     # Environment variables template
├── functions/
│   └── index.ts                     # Cloud Functions
└── src/
    ├── firebase.ts                  # Firebase client initialization
    └── App.tsx                      # Authentication logic
```

---

## 🔐 Security Checklist

- [x] Firestore security rules deployed
- [x] Storage security rules deployed
- [x] Google Sign-In enabled
- [x] Phone OTP enabled with reCAPTCHA
- [x] Authorized domains configured
- [x] Service account key secured (not in Git)
- [ ] Test phone numbers added (optional)
- [ ] Admin user created

---

## 🐛 Troubleshooting

### Google Sign-In Not Working

1. Check `apiKey` in `firebase-applet-config.json` is correct
2. Verify Google provider is enabled in Console
3. Check browser console for errors
4. Ensure `authDomain` matches your Firebase project

### Phone OTP Not Sending SMS

1. Verify Phone provider is enabled
2. Check reCAPTCHA setup (should be automatic with Firebase)
3. For development, use test phone numbers
4. Check Firebase billing (Phone auth has free tier limits)

### "Unauthorized Domain" Error

1. Add your domain to **Authorized domains** in Firebase Console
2. Wait 5-10 minutes for propagation
3. Clear browser cache and retry

### Firestore Permission Denied

1. Deploy rules: `firebase deploy --only firestore:rules`
2. Verify user is authenticated before accessing data
3. Check user document exists in `users/{uid}` collection

---

## 📞 Support

For issues:
1. Check Firebase Console → Logs Explorer
2. Review Firestore security rules logs
3. Check browser console for client-side errors
4. Verify all setup steps completed

---

## 📚 Additional Resources

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Google Sign-In Setup](https://firebase.google.com/docs/auth/web/google-signin)
- [Phone Auth Setup](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Storage Security](https://firebase.google.com/docs/storage/security/)
