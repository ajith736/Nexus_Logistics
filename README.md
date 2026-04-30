# Nexus Logistics — Backend API

Multi-tenant logistics/delivery management API built with Node.js, Express 5, MongoDB, BullMQ, and Socket.io. Supports organizations with dispatchers and delivery agents, bulk CSV order uploads, real-time status tracking, and email reports.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express 5 |
| Database | MongoDB (Atlas free tier) |
| Queue | BullMQ + Redis |
| Real-time | Socket.io (JWT-authenticated) |
| Email | Nodemailer + Mailtrap |
| Auth | JWT access/refresh tokens + bcryptjs |
| Validation | Joi |
| File Storage | AWS S3 for production CSV/error reports, local disk fallback for development |

## Live Demo & Deployment

This project has been deployed end-to-end with a production-style architecture:

- **Frontend:** Vercel
- **Backend:** AWS EC2 running Node.js with PM2 behind Nginx
- **Queue:** Redis + BullMQ for CSV upload processing
- **Database:** MongoDB Atlas
- **File Storage:** AWS S3 for uploaded CSV files and generated error reports
- **Email:** Mailtrap API for upload completion/failure reports
- **API Docs:** Swagger/OpenAPI at `/api/docs`

To avoid unnecessary AWS free-tier usage, the EC2 backend may be stopped when the project is not being actively demoed. The deployment is demo-ready and can be started on request for interviews or walkthroughs.

When running, the app supports:

- JWT-based login for superadmin, dispatcher, and agent roles
- CSV bulk order upload with real-time progress updates
- S3-backed error CSV report generation and signed download links
- Email notifications after upload completion
- Health monitoring for MongoDB, Redis, and queue depth

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Redis (Windows: [Memurai](https://www.memurai.com/) or Docker) — optional, needed for bulk uploads

### Installation

```bash
git clone <repo-url>
cd Nexus_Logistics
npm install
```

### Environment Variables

Copy `.env.example` to `.env` for local development:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/nexus_logistics

JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

REDIS_ENABLED=true
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your_mailtrap_user
MAIL_PASS=your_mailtrap_pass

SUPERADMIN_EMAIL=superadmin@nexus.io
SUPERADMIN_PASSWORD=Admin@1234

CLIENT_URL=http://localhost:3000
```

Set `REDIS_ENABLED=false` to run without Redis (bulk uploads will be disabled).

For production deployment, start from `.env.production.example` and fill real values.
Important production keys:

- `PUBLIC_API_URL`: external backend URL used in email links.
- `CORS_ALLOWED_ORIGINS`: comma-separated frontend origins allowed by API and socket CORS.
- `REDIS_PASSWORD` / `REDIS_TLS`: required for managed Redis providers.

### Seed SuperAdmin

```bash
npm run seed
```

Creates the superadmin user from `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` in `.env`.

### Run

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:5000` (or the configured `PORT`).

### PM2 (Production Process Manager)

```bash
# Start in production mode
npm run start:pm2

# View process + logs
pm2 ls
npm run logs:pm2

# Persist process list across reboot
pm2 save
pm2 startup
```

---

## Authentication

All protected endpoints require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Access tokens expire in **15 minutes**. Use the refresh endpoint to get a new pair.

### Roles

| Role | Description |
|---|---|
| `superadmin` | Manages organizations and dispatchers. Not scoped to any org. |
| `dispatcher` | Manages agents and orders within their organization. |
| `agent` | Delivery agent. Can view assigned orders and update their status. |

---

## API Reference

Base URL: `http://localhost:5000/api`

All responses follow this structure:

```json
{
  "success": true,
  "message": "Description",
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "ERROR_CODE"
}
```

Paginated responses include:

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

### Health

#### `GET /api/health`

No auth required. Returns system health with DB, Redis, and queue status.

```json
{
  "success": true,
  "timestamp": "2026-04-25T08:30:00.000Z",
  "uptime": 3600.5,
  "services": {
    "mongodb": "connected",
    "redis": "connected",
    "queue": { "waiting": 0, "active": 1, "delayed": 0 }
  }
}
```

---

### Auth

#### `POST /api/auth/login`

Dispatcher/SuperAdmin login.

```json
{
  "email": "dispatcher@example.com",
  "password": "securePassword"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": "...", "name": "...", "email": "...", "role": "dispatcher", "orgId": "..." }
  }
}
```

#### `POST /api/auth/refresh`

```json
{ "refreshToken": "eyJ..." }
```

Returns new `accessToken` and `refreshToken`. The old refresh token is invalidated (rotation).

#### `POST /api/auth/agent-login`

Agent login with phone + PIN.

```json
{
  "phone": "9876543210",
  "pin": "1234"
}
```

Returns `accessToken` and agent details. Agents do not receive refresh tokens.

#### `POST /api/auth/logout`

Requires auth. Invalidates the refresh token.

---

### Organizations (SuperAdmin only)

#### `POST /api/organizations`

```json
{ "name": "Acme Deliveries" }
```

Slug is auto-generated from the name.

#### `GET /api/organizations`

List all orgs. Supports `?status=active|suspended&page=1&limit=20`.

#### `GET /api/organizations/:id`

Get single org by ID.

#### `PATCH /api/organizations/:id`

```json
{ "name": "New Name", "status": "suspended" }
```

---

### Users / Dispatchers (SuperAdmin only)

#### `POST /api/users`

```json
{
  "name": "Jane Doe",
  "email": "jane@acme.com",
  "password": "securePass123",
  "orgId": "60f7..."
}
```

Creates a dispatcher linked to the specified organization.

#### `GET /api/users`

List dispatchers. Supports `?orgId=...&page=1&limit=20`.

#### `GET /api/users/:id`

#### `PATCH /api/users/:id`

```json
{ "name": "Updated Name" }
```

#### `DELETE /api/users/:id`

Soft-deletes (deactivates) the user. Revokes their refresh token.

---

### Agents (Dispatcher, scoped to org)

#### `POST /api/agents`

```json
{
  "name": "Ravi Kumar",
  "phone": "9876543210",
  "pin": "1234"
}
```

PIN is hashed before storage. Phone must be unique within the organization.

#### `GET /api/agents`

List agents in the dispatcher's org. Supports `?status=available|unavailable|busy&page=1&limit=20`.

#### `GET /api/agents/:id`

#### `PATCH /api/agents/:id`

Update agent details (name, phone, pin).

#### `PATCH /api/agents/:id/status`

Toggle agent availability. Agents can call this for themselves.

```json
{ "status": "unavailable" }
```

Emits `agent:statusChanged` via Socket.io.

---

### Orders (Dispatcher + Agent, scoped to org)

#### `POST /api/orders`

Dispatcher creates a single order.

```json
{
  "saleOrderId": "SO-12345",
  "customerName": "John Smith",
  "customerPhone": "9998887777",
  "customerAddress": "123 Main St, Bangalore",
  "packageDetails": "2x Fragile boxes"
}
```

A system `orderId` (e.g. `ORD-000042`) is auto-generated.

#### `GET /api/orders`

List orders. Agents only see orders assigned to them.

Supports `?status=created|assigned|out_for_delivery|delivered|failed&assignedTo=<agentId>&page=1&limit=20`.

#### `GET /api/orders/:id`

Returns order with full status log history.

#### `PATCH /api/orders/:id/assign`

Dispatcher assigns an available agent to the order.

```json
{ "agentId": "60f7..." }
```

The order transitions to `assigned` and the agent becomes `busy`. Emits `order:statusChanged`.

#### `PATCH /api/orders/:id/status`

Update order status. Agents can update orders assigned to them.

```json
{ "status": "delivered" }
```

**Valid transitions:**

| From | Allowed To |
|---|---|
| `created` | `assigned`, `failed` |
| `pending` | `assigned`, `failed` |
| `assigned` | `out_for_delivery`, `failed` |
| `out_for_delivery` | `delivered`, `failed` |
| `delivered` | *(terminal)* |
| `failed` | *(terminal)* |

When an order reaches `delivered` or `failed`, the assigned agent is automatically released back to `available`.

Emits `order:statusChanged` via Socket.io.

---

### Bulk Upload (Dispatcher)

#### `POST /api/uploads`

Upload a CSV file for bulk order creation. Multipart form-data with field name `file`.

```
Content-Type: multipart/form-data
file: orders.csv
```

**CSV columns:** `saleOrderId`, `customerName`, `customerPhone`, `customerAddress`, `packageDetails`

Returns `202 Accepted` immediately. Processing happens asynchronously via BullMQ.

```json
{
  "success": true,
  "data": { "jobId": "60f7...", "fileName": "orders.csv", "status": "queued" }
}
```

#### `GET /api/uploads/sample`

Download a sample CSV template.

#### `GET /api/uploads`

List upload history for the org. Supports `?status=queued|processing|completed|failed&page=1&limit=20`.

#### `GET /api/uploads/:id`

Get upload job details including success/fail counts and error file link.

---

## Real-time Events (Socket.io)

Connect to `ws://localhost:5000` with JWT authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: '<accessToken>' }
});
```

The server verifies the JWT on handshake and auto-joins the client to their org room (`org:<orgId>`).

### Events

| Event | Payload | Description |
|---|---|---|
| `upload:progress` | `{ jobId, processed, total }` | Emitted every 50 rows during CSV processing |
| `upload:complete` | `{ jobId, successCount, failCount, errorFileUrl }` | Upload job finished |
| `order:statusChanged` | `{ orderId, newStatus, agentName }` | Order status was updated |
| `agent:statusChanged` | `{ agentId, newStatus }` | Agent availability changed |

---

## Email Notifications

When a bulk upload completes, the dispatcher who triggered it receives an email summary via Mailtrap with:

- File name, total rows, success count, failure count
- Link to download the error report CSV (if there were failures)

Configure `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` in `.env`. Leave `MAIL_USER` empty to disable emails.

---

## Audit Logging

All significant mutations are recorded in the `AuditLog` collection:

| Action | Trigger |
|---|---|
| `organization.created` | SuperAdmin creates an org |
| `organization.updated` | SuperAdmin updates an org |
| `user.created` | SuperAdmin creates a dispatcher |
| `user.deactivated` | SuperAdmin deactivates a user |
| `agent.created` | Dispatcher creates an agent |
| `agent.statusChanged` | Agent/Dispatcher toggles availability |
| `order.created` | Dispatcher creates an order |
| `order.agentAssigned` | Dispatcher assigns agent to order |
| `order.statusChanged` | Dispatcher/Agent updates order status |

Each log entry contains `action`, `performedBy`, `orgId`, `metadata`, and `createdAt`.

---

## Project Structure

```
Nexus_Logistics/
  src/
    server.js                     # Entry point: DB, Express, Socket.io, BullMQ, graceful shutdown
    config/
      db.js                       # MongoDB connection
      redis.js                    # IORedis connection (lazy, retry-limited)
      mailer.js                   # Nodemailer transporter
      socket.js                   # Socket.io with JWT handshake auth + org rooms
    models/
      Organization.js             # name, slug, status
      User.js                     # name, email, password, role, orgId
      Agent.js                    # name, phone, pin, status, orgId
      Order.js                    # orderId, saleOrderId, status, customer info, assignedTo, orgId
      OrderStatusLog.js           # orderId, fromStatus, toStatus, changedBy
      UploadJob.js                # fileName, status, counts, orgId, uploadedBy
      AuditLog.js                 # action, performedBy, orgId, metadata
      Counter.js                  # Auto-incrementing sequence for orderId
    middleware/
      auth.js                     # verifyToken, requireRole
      checkOrgAccess.js           # Org-scoping guard
      errorHandler.js             # Centralized error middleware
      rateLimiter.js              # Rate limiting for auth endpoints
      validate.js                 # Joi validation middleware
    routes/
      auth.routes.js
      organization.routes.js
      user.routes.js
      agent.routes.js
      order.routes.js
      upload.routes.js
      health.routes.js
    controllers/
      auth.controller.js
      organization.controller.js
      user.controller.js
      agent.controller.js
      order.controller.js
      upload.controller.js
    services/
      storage.service.js          # Local disk file abstraction (swappable to S3)
      email.service.js            # Upload report emails via Nodemailer
      csv.service.js              # CSV parsing, validation, error CSV generation
      audit.service.js            # Fire-and-forget audit log writer
    queues/
      upload.queue.js             # BullMQ queue definition
      upload.worker.js            # CSV processing worker with progress events
    validators/                   # Joi schemas for each route group
    utils/
      apiResponse.js              # success(), error(), paginated() helpers
      constants.js                # Enums for roles, statuses
      pagination.js               # Query param parser
      slugify.js                  # URL-safe slug generator
    scripts/
      seedSuperAdmin.js           # CLI: node src/scripts/seedSuperAdmin.js
  uploads/                        # Local file storage (gitignored)
```

---

## Database Indexes

| Collection | Index | Type |
|---|---|---|
| `Order` | `{ orgId, saleOrderId }` | Unique compound |
| `Order` | `{ orgId, status }` | Compound |
| `Agent` | `{ orgId, phone }` | Unique compound |
| `Agent` | `{ orgId, status }` | Compound |
| `Organization` | `{ slug }` | Unique |
| `OrderStatusLog` | `{ orderId, createdAt }` | Compound |
| `UploadJob` | `{ orgId, createdAt }` | Compound (descending) |
| `AuditLog` | `{ orgId, createdAt }` | Compound (descending) |
| `AuditLog` | `{ performedBy }` | Single |
| `User` | `{ email }` | Unique |

---

## Graceful Shutdown

On `SIGTERM` or `SIGINT`, the server:

1. Stops accepting new HTTP connections
2. Disconnects all Socket.io clients and closes the server
3. Drains the BullMQ upload worker
4. Closes the Redis connection
5. Closes the MongoDB connection
6. Exits cleanly

A 10-second timeout forces exit if cleanup hangs.

---

## License

ISC
