# MindReflect — User-Authenticated AI Journal & Reflection

MindReflect is a secure, personal reflection and journaling application powered by **Gemini 3.6 Flash** and **Cloud Firestore**, with user authentication handled via **Firebase Authentication (Google Sign-In)**.

---

## 1. System Architecture & Threat Model

### Threat Summary Table
| Threat Zone | Identified Risks | Countermeasures & Architectural Controls |
| :--- | :--- | :--- |
| **Input Surfaces** | Malformed input, prompt injection, payload size abuse | Schema validation, 15,000 character limits, and defensive payload deserialization. |
| **Planning & Reasoning** | System prompt hijacking via user reflection text | User text parsed strictly as user data inside structured system directives; no dynamic shell/code execution. |
| **Tool / API Execution** | Transient API outages, rate limiting (`429`, `503`) | **Resilient Model Fallback Ladder**: `gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`. |
| **Memory & State** | Cross-user data leakage, unauthorized read/write | Owner-bound Firestore security rules (`request.auth.uid == userId`), default deny catch-all, zero-crash undefined-stripping sanitizer. |
| **Inter-System Comm** | API key leakage to browser client | Server-side Express proxy; `GEMINI_API_KEY` stored strictly in server environment / Secret Manager. |

---

## 2. Environment & Prerequisites

1. **Google Cloud SDK**:
   Install and initialize the `gcloud` CLI:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable Required Google Cloud APIs**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     cloudbuild.googleapis.com
   ```

---

## 3. Secret Management Setup (Google Secret Manager)

Store your Gemini API key securely in Google Cloud Secret Manager:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Cloud Firestore Security Configuration

MindReflect uses owner-bound document rules to ensure strict isolation of journal reflections per user:

### `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Cloud Run Deployment Flow

### Step 1: Build & Deploy Container
Deploy the application directly to Google Cloud Run, binding the secret into the runtime environment:

```bash
gcloud run deploy mindreflect \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

### Step 2: Apply Required Campaign Labeling
Apply the mandatory resource label for challenge verification:

```bash
gcloud run services update mindreflect \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Verification Walkthrough

The application includes an in-app **Verification Guide** modal covering all user interactions:

| Test ID | Interaction | Steps & Expected Result |
| :--- | :--- | :--- |
| **TC-1** | Landing & Sign In | User arrives at landing page &rarr; clicks "Continue with Google" &rarr; completes federated sign-in &rarr; lands on private dashboard. |
| **TC-2** | Identity Profile | Authenticated user profile (name, email, avatar) is displayed in the navigation header with Firestore isolation badge. |
| **TC-3** | Multi-Turn Reflection | User writes an initial entry &rarr; Gemini reflects & prompts questions &rarr; user responds &rarr; multi-turn thread persists in sequence. |
| **TC-4** | Modes & Syntheses | Switch between *Reflect*, *Synthesize*, *Brainstorm*, and *Action Items*. Outputs adapt dynamically to the selected style. |
| **TC-5** | Firestore Isolation | Writes are strictly scoped to `/users/{userId}/interactions/{id}`. Payloads are sanitized against undefined fields. UI provides explicit save status and error retry. |
| **TC-6** | History & Search | Past reflections populate the sidebar in descending chronological order; real-time search filters entries by keyword; entry deletion supported. |
| **TC-7** | Model Fallback Ladder | Calls to Gemini traverse `gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash` on recoverable errors. |
