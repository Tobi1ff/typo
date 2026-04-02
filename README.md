# TYPO — Developer Social Network

## Deploy to Vercel

### 1. Push to GitHub
Upload this folder as a new GitHub repository.

### 2. Import into Vercel
Go to [vercel.com/new](https://vercel.com/new), select the repo.

Build settings are auto-detected (Vite). No changes needed.

### 3. Add Environment Variables
In the Vercel project → **Settings → Environment Variables**, add:

| Variable | Where to find it |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same |
| `VITE_FIREBASE_PROJECT_ID` | Same |
| `VITE_FIREBASE_STORAGE_BUCKET` | Same |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same |
| `VITE_FIREBASE_APP_ID` | Same |
| `VITE_FIREBASE_DATABASE_ID` | Only needed if using a **named** Firestore database (not the default) |

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
    }
    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.authorUid;
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
    match /conversations/{convId} {
      allow read, write: if request.auth != null;
      match /messages/{msgId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```
