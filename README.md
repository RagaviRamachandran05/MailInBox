# ⚡ AuraMail — High-Performance Full-Stack Email Scheduler

> Production-grade distributed email scheduling platform built for extreme reliability, zero-duplicate delivery guarantees, Redis-backed atomic rate limiting, BullMQ delayed queue processing, Elasticsearch full-text search, and real Google/Slack OAuth integrations.

---

## 🏗️ Architecture & High-Level Flow

```
                      ┌───────────────────────────────────────────────┐
                      │              React + Vite Frontend            │
                      │     (Clean Light Theme + Theme Switcher)      │
                      └───────────────────────┬───────────────────────┘
                                              │ REST API / Axios
                                              ▼
                      ┌───────────────────────────────────────────────┐
                      │            Node.js + Express + TS             │
                      │     (Zod Validation, Auth, Error Handler)     │
                      └───────┬───────────────┬───────────────┬───────┘
                              │               │               │
                 Prisma / SQL │        BullMQ │  OAuth / Web  │
                              ▼               ▼               ▼
                      ┌───────────────┐ ┌───────────┐ ┌───────────────┐
                      │  MySQL (8.0)  │ │   Redis   │ │ Google Auth & │
                      │  Persistent   │ │ BullMQ &  │ │   Slack API   │
                      │  State Store  │ │ Rate-Limit│ └───────────────┘
                      └───────────────┘ └─────┬─────┘
                                              │
                                              │ Job Dispatch
                                              ▼
                              ┌───────────────────────────────────────────┐
                              │           BullMQ Worker Process           │
                              │  - Distributed Rate Limiter (Redis Lua)   │
                              │  - Idempotent Row Lock ($transaction)     │
                              │  - Automatic Rescheduling Engine          │
                              └───────┬───────────────────┬───────────────┘
                                      │                   │
                        Nodemailer/ES │                   │ Search Index
                                      ▼                   ▼
                              ┌───────────────┐   ┌───────────────┐
                              │ Ethereal SMTP │   │ Elasticsearch │
                              │  Transporter  │   │  Email Index  │
                              └───────────────┘   └───────────────┘
```

---

## 🌟 Key Features & Architectural Highlights

### 1. Zero Cron / Interval Schedulers — Pure BullMQ Delayed Jobs
- Scheduling is strictly handled via **BullMQ delayed jobs** backed by Redis.
- Every email record is assigned a deterministic Job ID: `email-${emailId}`.
- Calculated execution timestamp:
  $$\text{Scheduled Time} = \text{startTime} + (i \times \text{delayBetweenEmails})$$
- `delay = Math.max(0, scheduledAt.getTime() - Date.now())`
- **Zero in-memory timers (`setTimeout`, `setInterval`, `node-cron`)**. Jobs persist securely in Redis.

### 2. Idempotency & Database-Level Send Protection
- Safe state transition: `scheduled` $\rightarrow$ `processing` $\rightarrow$ `sent` / `failed`.
- Executed within an atomic Prisma database transaction:
  1. Inspect status: If already `sent`, return immediately without dispatching duplicate SMTP messages.
  2. If status is `processing` (under another worker lock), abort safely.
  3. Update status to `processing` and increment `attempts`.
  4. Dispatch via Nodemailer Ethereal SMTP transporter.
  5. Upon success: Atomically update `status = sent`, record `sentAt`, `messageId`, and `previewUrl`.
  6. On failure: Atomically update `status = failed`, log error, and trigger BullMQ exponential backoff retry.

### 3. Distributed Hourly Rate Limiter (Redis Lua Script)
- Distributed hourly sliding window counter: `email-rate:{senderId}:{YYYY-MM-DD-HH}`.
- Executed atomically using a custom **Redis Lua script**:
  - Checks if `current_count < limit`. If true, increments counter and returns slot.
  - If limit is reached, does **not** increment and returns `allowed: false`.
- **Auto-Rescheduling**: If the limit is reached, the email is **NEVER marked failed**. Instead, it calculates the next hour window (`nextAvailableAt`), updates MySQL `scheduledAt`, reschedules the BullMQ job with the new delay, and dispatches a Slack alert.

### 4. Real Slack OAuth & Deduplicated Alerts
- Full Slack OAuth v2 integration (`/api/slack/connect`, `/api/slack/callback`).
- Whenever a sender hits their hourly limit, a real Slack alert block is dispatched to the team workspace.
- **Redis Deduplication**: Key `slack-rate-limit-notified:{senderId}:{hourWindow}` ensures only **1 notification per sender/hour** is sent, preventing notification floods during high worker concurrency.

### 5. Multi-Sender Support & Ethereal SMTP
- Multi-tenant sender management (`Sender` model) with individual hourly rate limits and credentials.
- Auto-provisions dynamic Ethereal test accounts if no credentials are provided in `.env`.
- Automatically captures Ethereal Web Preview URLs (`nodemailer.getTestMessageUrl(info)`) for one-click demo verification in the UI.

### 6. Elasticsearch Full-Text Search
- Real-time Elasticsearch 8.x index (`emails`) mapping `recipient`, `subject`, `body`, `status`, and `scheduledAt`.
- Search endpoint `GET /api/emails/search?q=...` with full-text fuzzy matching.
- **Graceful Fallback**: If Elasticsearch is spinning up, automatically falls back to indexed MySQL queries.

### 7. Bull Board Live Monitoring Dashboard
- Live queue monitor mounted at `http://localhost:5000/admin/queues`.
- Displays real-time counts and states for `waiting`, `active`, `completed`, `failed`, and `delayed` jobs with retry inspection.

### 8. Distinct Non-Blue, Non-Green UI Themes + Dynamic Switcher
- Designed to stand out with **high-contrast, light and dark themes**:
  - 🌸 **White + Rose Coral & Solar Amber (Default)**
  - 💜 **White + Royal Amethyst & Sunset Tangerine**
  - 🌑 **Obsidian Slate & Rose (Dark Mode)**
- Includes a 1-click **Theme Toggle** in the top navigation bar!

---

## 🚀 Quick Setup & Installation

### Prerequisites
- Node.js >= 18.x
- Docker & Docker Compose
- npm >= 9.x

### Step 1: Clone & Install Dependencies
```bash
# Clone repository
git clone <repo-url>
cd emailbox

# Install monorepo dependencies (Backend & Frontend)
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to root and backend:
```bash
cp .env.example .env
cp .env.example backend/.env
```

*(All default credentials are pre-configured for Docker Compose local development!)*

### Step 3: Start Infrastructure (MySQL, Redis, Elasticsearch)
```bash
docker compose up -d
```

Verify services are healthy:
```bash
docker compose ps
```

### Step 4: Run Prisma Migrations
```bash
npm run prisma:push --workspace=backend
```

### Step 5: Start Development Servers
You can start the full stack (Express API + BullMQ Worker + Vite Frontend) with a single command:
```bash
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:5000`
- **Bull Board Monitor**: `http://localhost:5000/admin/queues`
- **API Health Check**: `http://localhost:5000/api/health`

---

## 🧪 Comprehensive Testing & Verification Scenarios

### Test Suite Execution
Run automated unit and integration tests:
```bash
npm run test --workspace=backend
```

---

### Scenario A: Minimum Delay Spacing Verification (2000ms)
1. Open the dashboard at `http://localhost:5173`.
2. Click **Compose Campaign** (or use the Dev Sandbox Drawer).
3. Schedule 5 emails with `Delay Between Emails = 2000 ms`.
4. Observe the execution timestamps in the **Scheduled Queue** and **Sent Emails** table:
   - Email 1 $\rightarrow$ `10:00:00`
   - Email 2 $\rightarrow$ `10:00:02`
   - Email 3 $\rightarrow$ `10:00:04`
   - Email 4 $\rightarrow$ `10:00:06`
   - Email 5 $\rightarrow$ `10:00:08`

---

### Scenario B: Distributed Rate Limiting & Slack Notification Test (3/hr Limit)
1. In the **Compose Modal** (or via the **Dev Sandbox Drawer**), select `Distributed Hourly Rate Limit = 3 emails / hour`.
2. Schedule a batch of **8 emails**.
3. **Observed Behavior**:
   - Emails 1, 2, and 3 are processed and delivered via Ethereal SMTP.
   - Emails 4 through 8 are caught by the Redis atomic rate limiter.
   - Emails 4–8 are **NOT** marked failed; they are automatically rescheduled to the start of the next hour window.
   - A real Slack alert is dispatched to the connected workspace with rate limit details.

---

### Scenario C: Server Restart & Persistence Test (Zero Duplicate Sends)
1. Schedule a campaign of 10 emails for **2 minutes in the future**.
2. Stop the backend server and worker (`Ctrl + C` or kill process).
3. Wait 30 seconds while the server is offline.
4. Restart the backend: `npm run dev:backend`.
5. **Observed Behavior**:
   - Redis persistent volume retains all BullMQ delayed jobs.
   - MySQL retains all campaign and email records.
   - When the scheduled timestamp arrives, the worker picks up the jobs and dispatches them accurately.
   - Database confirms `status = sent` with exactly 1 Ethereal email message per recipient.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/google` | Initiates Google OAuth flow | No |
| `GET` | `/api/auth/google/callback` | Google OAuth code callback | No |
| `POST` | `/api/auth/dev-login` | 1-Click Sandbox login for evaluators | No |
| `GET` | `/api/auth/me` | Fetch logged-in user profile | Yes |
| `POST` | `/api/auth/logout` | Clear auth session | Yes |
| `POST` | `/api/emails/schedule` | Schedule email batch with BullMQ | Yes |
| `GET` | `/api/emails/scheduled` | List scheduled emails with pagination | Yes |
| `GET` | `/api/emails/sent` | List delivered emails with Ethereal links | Yes |
| `GET` | `/api/emails/search?q=` | Elasticsearch full-text fuzzy search | Yes |
| `GET` | `/api/emails/stats` | Dashboard metrics and delivery rate | Yes |
| `DELETE`| `/api/emails/:id` | Cancel/remove scheduled email from queue | Yes |
| `GET` | `/api/senders` | List configured SMTP sender identities | Yes |
| `POST` | `/api/senders` | Add new sender with custom rate limit | Yes |
| `GET` | `/api/slack/connect` | Initiates Slack OAuth flow | Yes |
| `GET` | `/api/slack/status` | Current Slack workspace connection status | Yes |
| `POST` | `/api/slack/disconnect` | Disconnect Slack integration | Yes |
| `GET` | `/api/queue/stats` | Live BullMQ Redis queue counters | Yes |
| `GET` | `/admin/queues` | Bull Board live visual queue monitor | Protected |

---

## 🛡️ Idempotency & Concurrency Strategy

```
                          BullMQ Worker Receives Job
                                      │
                                      ▼
                       Prisma Database Transaction
                                      │
                       ┌──────────────┴──────────────┐
                       │  SELECT email FOR UPDATE    │
                       └──────────────┬──────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
          Status == 'sent'   Status == 'processing'   Status == 'scheduled'
                 │                    │                    │
                 ▼                    ▼                    ▼
           Idempotent Exit     Concurrent Lock       Acquire Redis Rate Slot
          (0 Duplicates)       (Safely Abort)              │
                                               ┌───────────┴───────────┐
                                               ▼                       ▼
                                            Allowed               Rate-Limited
                                               │                       │
                                               ▼                       ▼
                                       Update 'processing'     Reschedule Next Hour
                                               │               Trigger Slack Alert
                                               ▼                       │
                                        Send Ethereal SMTP          (Done)
                                               │
                                       ┌───────┴───────┐
                                       ▼               ▼
                                    Success         Failure
                                       │               │
                                       ▼               ▼
                                 Update 'sent'   Update 'failed'
                                 Record PrevURL  BullMQ Retries
```

---

## 📝 Trade-offs & Engineering Assumptions

1. **SMTP Delivery Guarantees**: While database state locking and BullMQ job idempotency guarantee exactly-once job execution within our infrastructure, SMTP delivery across internet mail exchange servers inherently operates on *at-least-once* network semantics.
2. **Elasticsearch Single-Node Mode**: Elasticsearch is configured in single-node mode within Docker Compose for resource efficiency during evaluation. Production clusters would utilize multi-node shards and replicas.
3. **OAuth Credentials in Sandbox**: For ease of instant evaluation without requiring Google Cloud Console / Slack App setup, the application includes a **1-Click Developer Demo Access** switch alongside standard real OAuth flows.

---

## 👥 Authors
- **AuraMail Team** — Engineered with excellence for the Full-Stack Email Scheduler Hiring Assignment.
#   M a i l I n B o x  
 