# TYPO — Developer Social Network

## Deploy to Vercel

### 1. Push to GitHub
Upload this folder as a new GitHub repository.

### 2. Import into Vercel
Go to [vercel.com/new](https://vercel.com/new), select the repo. Build settings are auto-detected (Vite).

### 3. Add Environment Variables
In Vercel project → **Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same |
| `VITE_FIREBASE_PROJECT_ID` | Same |
| `VITE_FIREBASE_STORAGE_BUCKET` | Same |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `VITE_FIREBASE_APP_ID` | Same |
| `VITE_FIREBASE_DATABASE_ID` | Only if using a named Firestore database (not default) |
| `VITE_FIREBASE_ADMIN_EMAILS` | Comma-separated admin emails e.g. `you@example.com,other@example.com` |

### 4. Deploy ✅

---

## Firebase Setup (one-time)

### Authentication
Firebase Console → **Authentication → Sign-in method** → enable:
- Google
- Email/Password

### Firestore Security Rules
Firebase Console → **Firestore → Rules** → paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
      match /bookmarks/{bookmarkId} {
        allow read, write: if request.auth.uid == uid;
      }
    }

    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth.uid == resource.data.authorUid;
      allow delete: if request.auth.uid == resource.data.authorUid;
      match /likes/{likeId} {
        allow read, write: if request.auth != null;
      }
      match /comments/{commentId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
        allow delete: if request.auth.uid == resource.data.authorUid;
      }
    }

    match /projects/{projectId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.authorUid;
    }

    match /follows/{followId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    match /blocks/{blockId} {
      allow read, write: if request.auth != null;
    }

    match /notifications/{notifId} {
      allow read, write: if request.auth != null;
    }

    // Conversations: only participants can read or write
    match /conversations/{convId} {
      allow read, write: if request.auth.uid in resource.data.participants
                         || request.auth != null && request.resource.data.participants.hasAny([request.auth.uid]);
      match /messages/{msgId} {
        allow read, write: if request.auth != null
          && get(/databases/$(database)/documents/conversations/$(convId)).data.participants.hasAny([request.auth.uid]);
      }
    }
  }
}
```

---

## App Icons (required for APK)

Add PNG icons to `public/icons/` before deploying:

| File | Size |
|---|---|
| `icon-72.png` | 72×72 |
| `icon-96.png` | 96×96 |
| `icon-128.png` | 128×128 |
| `icon-192.png` | 192×192 |
| `icon-512.png` | 512×512 |

**Tip:** Use [realfavicongenerator.net](https://realfavicongenerator.net) to generate all sizes from a single image.

---

## Generate Android APK

Once deployed to Vercel:

1. Go to **[pwabuilder.com](https://pwabuilder.com)**
2. Enter your Vercel URL (e.g. `https://typo-net.vercel.app`)
3. Click **Start** — PWABuilder scores your PWA
4. Click **Package for stores** → **Android**
5. Download the `.apk` or `.aab` (for Play Store)

> PWABuilder uses your `manifest.json` and service worker automatically.
> For Play Store submission, use the `.aab` bundle and sign it with your keystore.
