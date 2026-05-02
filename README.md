# Nexus Logistics

Nexus Logistics is a full-stack logistics management platform for teams that need to create, assign, track, and audit delivery orders across multiple organizations.

It was built as a production-style project with role-based access, real-time updates, bulk CSV uploads, background processing, and deployment-ready infrastructure.

## What It Does

- Supports three roles: Super Admin, Dispatcher, and Delivery Agent.
- Lets dispatchers create orders manually or through CSV bulk upload.
- Assigns orders to agents and tracks delivery status changes.
- Shows real-time upload and order status updates using Socket.io.
- Generates CSV error reports for failed upload rows.
- Sends upload summary emails after bulk processing.
- Keeps audit logs for important business actions.

## Why This Project Matters

This project demonstrates practical backend and frontend engineering beyond basic CRUD:

- Multi-tenant organization structure with scoped data access.
- Secure authentication using JWT access and refresh tokens.
- Background job processing with BullMQ and Redis.
- File handling with local storage in development and S3 support for deployment.
- Real-time communication for operational visibility.
- Clean API structure with validation, error handling, and Swagger documentation.

## UI Screenshots

Add your UI screenshots in:

```text
docs/screenshots/
```

Suggested images to include:

- Login screen
- Super Admin dashboard
- Dispatcher order dashboard
- Bulk upload flow
- Upload result/error report screen
- Agent order status screen

After adding screenshots, update this section like this:

```md
![Dashboard](docs/screenshots/dashboard.png)
![Bulk Upload](docs/screenshots/bulk-upload.png)
```

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, Zustand, React Query  
**Backend:** Node.js, Express, MongoDB, Mongoose  
**Background Jobs:** BullMQ, Redis  
**Real-time:** Socket.io  
**Storage:** Local file storage and AWS S3 support  
**Email:** Mailtrap/Nodemailer  
**Deployment:** Vercel frontend, AWS EC2 backend, MongoDB Atlas

## Main Features

### Role-Based Access

Super Admins manage organizations and dispatchers. Dispatchers manage agents and orders within their organization. Agents can view assigned orders and update delivery status.

### Order Management

Orders can be created individually or imported in bulk. Each order gets a generated order ID and follows a controlled delivery status flow.

### Bulk CSV Uploads

Dispatchers can upload CSV files to create many orders at once. Uploads are processed in the background, with progress updates and downloadable error reports for invalid rows.

### Real-Time Updates

The app uses Socket.io to notify users about upload progress, order status changes, and agent availability changes.

### Deployment-Ready Setup

The project includes production-oriented setup for environment variables, process management with PM2, S3 file storage, Redis queues, and health checks.

## Getting Started

### Backend

```bash
npm install
npm run seed
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Setup

Create a `.env` file from the example file and configure:

- MongoDB connection string
- JWT secrets
- Redis settings for uploads
- Email credentials
- Frontend URL
- S3 credentials if using cloud storage

For local development, Redis can be disabled if bulk uploads are not being tested.

## API Documentation

Swagger documentation is available when the backend is running:

```text
http://localhost:5000/api/docs
```

## Project Structure

```text
Nexus_Logistics/
  src/                 Backend API, workers, services, models, routes
  frontend/            React frontend
  docs/screenshots/    UI screenshots for README/demo
  uploads/             Local upload storage for development
```

## Status

The application is built as a complete portfolio project and can be demoed locally or deployed with the included production-style setup.

## License

ISC
