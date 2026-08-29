# ⚡ AuraMail

### Production-Oriented Full-Stack Email Scheduling & Delivery Platform

AuraMail is a full-stack email scheduling platform designed to reliably schedule, process, monitor, and search email campaigns at scale.

The system uses **BullMQ and Redis for persistent delayed job processing**, **MySQL for durable application state**, **Elasticsearch for full-text email search**, **Ethereal SMTP for safe email testing**, and real **Google OAuth and Slack OAuth** integrations.

> Built as part of the ReachInbox Software Development Intern Hiring Assignment.

---

## ✨ Features

### 📧 Email Scheduling

* Schedule emails for a specific start time
* Upload recipient lists through CSV/text files
* Automatically validate email addresses
* Remove duplicate recipients
* Configure delay between individual emails
* Configure hourly sending limits
* Store campaigns and email records in MySQL
* Schedule every email as an independent BullMQ delayed job

### ⚡ Distributed Job Processing

* BullMQ backed by Redis
* Persistent delayed jobs
* Configurable worker concurrency
* Automatic retry with exponential backoff
* Handles large batches without loading all jobs into memory
* Designed to support 1,000+ scheduled emails

### 🛡️ Idempotency & Duplicate Protection

Email processing follows a controlled state machine:

```text
scheduled
    ↓
processing
    ↓
 ┌──┴────┐
 ↓       ↓
sent   failed
```

Before sending an email, the worker verifies its current database state.

If an email has already been marked as `sent`, the worker exits without sending it again.

This protects against duplicate processing caused by:

* Worker concurrency
* BullMQ retries
* Server restarts
* Worker restarts
* Job re-processing

> Note: Application-level idempotency protects the scheduling system, while SMTP itself cannot provide a strict exactly-once delivery guarantee across external mail infrastructure.

---

## 🚦 Distributed Rate Limiting

AuraMail implements a Redis-backed distributed hourly rate limiter.

The limit is configurable through environment variables and can also be configured per sender.

Example:

```env
MAX_EMAILS_PER_HOUR=200
```

A Redis Lua script performs the rate-limit check and counter update atomically.

### Rate-limit flow

```text
BullMQ Worker
     │
     ▼
Redis Atomic Rate Check
     │
 ┌───┴────────┐
 │            │
Allowed    Limit Reached
 │            │
 ▼            ▼
Send       Reschedule
Email      Next Hour
 │            │
 ▼            ▼
Update DB   Slack Alert
```

When the limit is reached:

* The email is **not marked as failed**
* The job is rescheduled for the next available hour
* Email ordering is preserved as much as practical
* A Slack notification is sent if Slack is connected
* Redis prevents duplicate Slack alerts for the same sender/hour

---

## ⏱️ Minimum Delay Between Emails

Each campaign supports a configurable delay between emails.

Example:

```text
Delay = 2 seconds

Email 1 → 10:00:00
Email 2 → 10:00:02
Email 3 → 10:00:04
Email 4 → 10:00:06
Email 5 → 10:00:08
```

The delay is enforced by scheduling individual BullMQ jobs at their calculated execution times.

---

## 🔄 Persistent Scheduling — No Cron

AuraMail does **not** use:

* `node-cron`
* OS cron
* `setTimeout` based scheduling
* `setInterval` based scheduling
* database polling schedulers

Instead, every email is stored in MySQL and scheduled as a **BullMQ delayed job**.

```text
Start Time
    +
Email Index × Delay
    =
Scheduled Time
```

Each job receives a deterministic ID:

```text
email-{emailId}
```

This prevents unnecessary duplicate job creation.

---

## 🔁 Server Restart Persistence

The system is designed so scheduled jobs survive application restarts.

Example:

```text
10 emails scheduled
       ↓
Server stopped
       ↓
Redis persists BullMQ jobs
       +
MySQL persists email state
       ↓
Server restarted
       ↓
Worker reconnects
       ↓
BullMQ resumes processing
```

Already sent emails remain marked as `sent`, while future jobs remain available for processing.

Redis and MySQL persistence are configured using Docker volumes.

---

## 🔎 Elasticsearch Search

AuraMail indexes email information into Elasticsearch.

Indexed fields include:

* Recipient
* Subject
* Body
* Status
* Scheduled time
* Sent time
* Campaign ID
* User ID

Search API:

```http
GET /api/emails/search?q=john
```

The search supports full-text and fuzzy matching.

A MySQL fallback is also available when Elasticsearch is temporarily unavailable during startup.

---

## 💬 Slack Integration

AuraMail supports real Slack OAuth integration.

### Connection flow

```text
Dashboard
    ↓
Connect Slack
    ↓
Slack OAuth
    ↓
Authorization
    ↓
Backend Callback
    ↓
Store Workspace Connection
```

When a sender reaches its hourly rate limit, AuraMail sends a real Slack notification.

Example:

```text
⚠️ Email rate limit reached

Sender: hello@example.com
Hourly limit: 100
Action: Remaining emails have been rescheduled.
```

Redis-based notification deduplication ensures that multiple workers do not flood the Slack channel with identical alerts.

---

## 🔐 Google Authentication

AuraMail supports real Google OAuth authentication.

### Authentication flow

```text
Continue with Google
        ↓
Google OAuth
        ↓
OAuth Callback
        ↓
Find/Create User
        ↓
Authenticated Session
        ↓
Dashboard
```

The dashboard displays:

* User name
* Email
* Avatar
* Logout option

---

# 🏗️ Architecture

```text
                         ┌─────────────────────┐
                         │   React + Vite      │
                         │   TypeScript        │
                         └──────────┬──────────┘
                                    │
                              REST / Axios
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Express + TypeScript│
                         │                     │
                         │ Zod Validation      │
                         │ Auth Middleware     │
                         │ API Controllers     │
                         └──────┬─────┬────────┘
                                │     │
                    ┌───────────┘     └──────────────┐
                    ▼                                ▼
             ┌─────────────┐                  ┌─────────────┐
             │    MySQL    │                  │   BullMQ    │
             │   Prisma    │                  │   + Redis   │
             │             │                  │             │
             │ Users       │                  │ Delayed Jobs│
             │ Campaigns   │                  │ Rate Limits │
             │ Emails      │                  │ Deduplication│
             │ Senders     │                  └──────┬──────┘
             └─────────────┘                         │
                                                     ▼
                                           ┌─────────────────┐
                                           │ BullMQ Worker   │
                                           │                 │
                                           │ Concurrency     │
                                           │ Rate Limiting   │
                                           │ Idempotency     │
                                           │ Retry Handling  │
                                           └───────┬─────────┘
                                                   │
                              ┌────────────────────┼────────────────────┐
                              │                    │                    │
                              ▼                    ▼                    ▼
                       ┌────────────┐      ┌──────────────┐     ┌────────────┐
                       │ Ethereal   │      │ Elasticsearch│     │ Slack API  │
                       │ SMTP       │      │              │     │            │
                       └────────────┘      └──────────────┘     └────────────┘
```

---

# 🧰 Technology Stack

## Frontend

| Technology   | Purpose                   |
| ------------ | ------------------------- |
| React        | UI                        |
| Vite         | Development/build tooling |
| TypeScript   | Type safety               |
| Tailwind CSS | Styling                   |
| Axios        | API communication         |
| React Router | Routing                   |
| Lucide React | Icons                     |

## Backend

| Technology | Purpose                           |
| ---------- | --------------------------------- |
| Node.js    | Runtime                           |
| Express.js | REST API                          |
| TypeScript | Type safety                       |
| Prisma     | Database ORM                      |
| MySQL      | Persistent database               |
| BullMQ     | Job scheduling/processing         |
| Redis      | Queue + distributed rate limiting |
| Nodemailer | SMTP client                       |
| Ethereal   | Test email delivery               |
| Zod        | Request validation                |
| Bull Board | Queue monitoring                  |

## Search & Integrations

| Technology    | Purpose                |
| ------------- | ---------------------- |
| Elasticsearch | Full-text email search |
| Google OAuth  | Authentication         |
| Slack OAuth   | Notifications          |

## Infrastructure

| Technology     | Purpose              |
| -------------- | -------------------- |
| Docker         | Containerization     |
| Docker Compose | Local infrastructure |

---

# 📁 Project Structure

```text
AuraMail/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── context/
│   │   └── router/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── workers/
│   │   ├── queues/
│   │   ├── middleware/
│   │   ├── email/
│   │   ├── slack/
│   │   ├── elasticsearch/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   └── package.json
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Install:

* Node.js 18+
* npm 9+
* Docker
* Docker Compose
* Git

---

## 1. Clone the Repository

```bash
git clone https://github.com/RagaviRamachandran05/MailInBox.git

cd MailInBox
```

---

## 2. Install Dependencies

```bash
npm install
```

If the repository uses workspace-specific dependencies, install them with:

```bash
npm install --workspaces
```

---

# ⚙️ Environment Configuration

Create the environment files from the example:

```bash
cp .env.example .env
cp .env.example backend/.env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item .env.example backend/.env
```

### Required Variables

```env
NODE_ENV=development

PORT=5000

DATABASE_URL=

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

ELASTICSEARCH_URL=http://localhost:9200

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=

SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=

ETHEREAL_USER=
ETHEREAL_PASSWORD=

WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200

SESSION_SECRET=

FRONTEND_URL=http://localhost:5173
```

> Never commit `.env` files or real credentials to GitHub.

---

# 🐳 Start Infrastructure

Start MySQL, Redis and Elasticsearch:

```bash
docker compose up -d
```

Check service status:

```bash
docker compose ps
```

Expected services:

```text
MySQL
Redis
Elasticsearch
```

---

# 🗄️ Database Setup

Run Prisma schema synchronization:

```bash
npm run prisma:push --workspace=backend
```

If migrations are configured:

```bash
npx prisma migrate dev
```

Generate Prisma Client:

```bash
npx prisma generate
```

---

# ▶️ Run the Application

Start the complete development environment:

```bash
npm run dev
```

Or run services individually if configured:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

```bash
npm run dev:worker
```

---

# 🌐 Local URLs

| Service       | URL                                |
| ------------- | ---------------------------------- |
| Frontend      | http://localhost:5173              |
| Backend       | http://localhost:5000              |
| Health Check  | http://localhost:5000/api/health   |
| Bull Board    | http://localhost:5000/admin/queues |
| Elasticsearch | http://localhost:9200              |

---

# 📡 API Overview

| Method | Endpoint                    | Description             |
| ------ | --------------------------- | ----------------------- |
| GET    | `/api/auth/google`          | Start Google OAuth      |
| GET    | `/api/auth/google/callback` | Google OAuth callback   |
| GET    | `/api/auth/me`              | Current user            |
| POST   | `/api/auth/logout`          | Logout                  |
| POST   | `/api/emails/schedule`      | Schedule email campaign |
| GET    | `/api/emails/scheduled`     | Scheduled emails        |
| GET    | `/api/emails/sent`          | Sent emails             |
| GET    | `/api/emails/search?q=`     | Search emails           |
| GET    | `/api/emails/stats`         | Email statistics        |
| GET    | `/api/emails/:id`           | Email details           |
| DELETE | `/api/emails/:id`           | Cancel scheduled email  |
| GET    | `/api/senders`              | List senders            |
| POST   | `/api/senders`              | Add sender              |
| GET    | `/api/slack/connect`        | Start Slack OAuth       |
| GET    | `/api/slack/callback`       | Slack OAuth callback    |
| GET    | `/api/slack/status`         | Slack connection status |
| POST   | `/api/slack/disconnect`     | Disconnect Slack        |
| GET    | `/api/queue/stats`          | BullMQ statistics       |
| GET    | `/admin/queues`             | Bull Board              |

---

# 📧 Scheduling Flow

When a user schedules a campaign:

```text
User
 │
 │ Schedule campaign
 ▼
React Frontend
 │
 │ POST /api/emails/schedule
 ▼
Express API
 │
 ├── Validate request
 │
 ├── Create campaign
 │
 ├── Create email records
 │
 └── Create BullMQ delayed jobs
              │
              ▼
             Redis
              │
              ▼
         BullMQ Worker
              │
              ├── Rate limit check
              │
              ├── Idempotency check
              │
              ├── Send Ethereal email
              │
              ├── Update MySQL
              │
              └── Index Elasticsearch
```

---

# 🔒 Idempotency Strategy

Each email has a deterministic BullMQ job ID:

```text
email-{emailId}
```

The worker also verifies the database state before sending.

### Processing rules

```text
status = sent
      ↓
Skip processing

status = processing
      ↓
Safely avoid concurrent processing

status = scheduled
      ↓
Acquire processing state
      ↓
Send email
      ↓
status = sent
```

This prevents the same application-level email from being intentionally dispatched multiple times by competing jobs.

---

# 🔄 Retry Strategy

Transient email failures are retried using BullMQ.

Example:

```text
Attempt 1
   ↓
Failure
   ↓
5 sec
   ↓
Attempt 2
   ↓
Failure
   ↓
30 sec
   ↓
Attempt 3
   ↓
Failure
   ↓
Mark failed
```

Failed emails retain their error information for inspection.

---

# 📊 Queue Monitoring

Bull Board provides a live view of the BullMQ queue.

Open:

```text
http://localhost:5000/admin/queues
```

It provides visibility into:

* Waiting jobs
* Active jobs
* Delayed jobs
* Completed jobs
* Failed jobs
* Retry attempts

---

# 🧪 Testing

Run backend tests:

```bash
npm run test --workspace=backend
```

Important scenarios covered include:

* Email scheduling
* Email validation
* Duplicate protection
* Rate limiting
* Email state transitions
* Failure handling
* Persistence behavior

---

# 🧪 Demo Scenarios

## Scenario 1 — Scheduled Email

1. Login using Google.
2. Open the dashboard.
3. Click **Compose Campaign**.
4. Enter subject and body.
5. Upload a CSV file.
6. Configure start time.
7. Configure email delay.
8. Configure hourly limit.
9. Click **Schedule**.
10. Verify emails appear in Scheduled Emails.

---

## Scenario 2 — Email Sending

After the scheduled time:

```text
scheduled
    ↓
processing
    ↓
sent
```

The Sent Emails table should display:

* Recipient
* Subject
* Sent time
* Status
* Ethereal preview where available

---

## Scenario 3 — Rate Limiting

Configure:

```env
MAX_EMAILS_PER_HOUR=3
```

Schedule 8 emails.

Expected:

```text
Email 1 → Sent
Email 2 → Sent
Email 3 → Sent

Email 4 → Rescheduled
Email 5 → Rescheduled
Email 6 → Rescheduled
Email 7 → Rescheduled
Email 8 → Rescheduled
```

If Slack is connected, a rate-limit notification is sent to the configured workspace.

---

## Scenario 4 — Server Restart

1. Schedule an email for a future time.
2. Stop the backend/worker.
3. Wait.
4. Restart the application.
5. Verify the BullMQ job remains available.
6. Verify the email is eventually sent.
7. Verify the database contains the correct final status.

No cron-based recovery process is required.

---

# 📈 Handling 1,000+ Emails

The system avoids processing an entire campaign in a single synchronous operation.

Each email is represented as an independent persistent job.

For example:

```text
1000 emails
     │
     ▼
1000 BullMQ delayed jobs
     │
     ▼
Redis
     │
     ▼
Configurable worker concurrency
     │
     ├── Rate limiting
     ├── Minimum delay
     ├── Retry handling
     └── Idempotency
```

This allows the system to control throughput without blocking the API server.

---

# 🛡️ Security Considerations

The project includes:

* Google OAuth authentication
* Protected API routes
* Input validation with Zod
* CORS configuration
* Helmet security headers
* Environment-based secrets
* Prisma parameterized database operations
* Backend-side email validation
* No credentials committed to source control
* Sensitive OAuth tokens kept server-side

---

# 🎨 Frontend

The dashboard provides:

### Authentication

* Google Login
* User profile
* Avatar
* Logout

### Dashboard

* Scheduled email count
* Sent email count
* Failed email count
* Queue statistics

### Compose Campaign

* Subject
* Body
* CSV upload
* Email validation
* Start time
* Delay
* Hourly limit
* Sender selection

### Scheduled Emails

* Recipient
* Subject
* Scheduled time
* Status
* Search
* Pagination
* Loading states
* Empty states

### Sent Emails

* Recipient
* Subject
* Sent time
* Status
* Search
* Pagination
* Ethereal preview

### Slack

* Connect
* Workspace status
* Disconnect

---

# 📝 Engineering Trade-offs

### Exactly-once delivery

The application provides strong idempotency and duplicate protection at the database/job-processing level.

However, external SMTP delivery cannot provide a universal exactly-once guarantee because a network failure can occur after an SMTP server accepts a message but before the application receives confirmation.

Therefore, the system intentionally avoids claiming an absolute exactly-once SMTP guarantee.

### Elasticsearch

Elasticsearch runs as a single-node development deployment to keep the local environment lightweight.

A production deployment would use a multi-node Elasticsearch cluster with appropriate replicas and resource configuration.

### Ethereal

Ethereal is intentionally used instead of a production SMTP provider because this project is a development/testing assignment.

---

# 🚀 Future Improvements

Possible production enhancements include:

* Redis Sentinel/Cluster
* Multi-node Elasticsearch
* Distributed tracing
* Prometheus metrics
* Grafana dashboards
* Dead-letter queues
* Email templates
* Campaign analytics
* Bounce tracking
* Open/click tracking
* Tenant-level quotas
* Sender reputation management
* Production SMTP providers
* Kubernetes deployment

---

# 👩‍💻 Author

**Ragavi Ramachandran**

Full-Stack Developer | React | Node.js | TypeScript | MongoDB/MySQL

Built for the **ReachInbox Software Development Intern Hiring Assignment**.

---

## ⭐ Project Highlights

```text
✓ React + Vite + TypeScript
✓ Express + TypeScript
✓ MySQL + Prisma
✓ BullMQ + Redis
✓ Persistent delayed scheduling
✓ Distributed Redis rate limiting
✓ Configurable worker concurrency
✓ Minimum email delay
✓ Idempotent job processing
✓ Automatic retries
✓ Ethereal SMTP
✓ Elasticsearch search
✓ Bull Board monitoring
✓ Google OAuth
✓ Slack OAuth
✓ Real Slack notifications
✓ CSV email processing
✓ Responsive dashboard
✓ Docker Compose
```

---

## 📄 License

This project was created for evaluation as part of a software development internship assignment.
