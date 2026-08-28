# PillPay — Payment Tracking Backend

**TypeScript · Express · Node.js**

A production-ready payment-tracking backend service with idempotency, audit logging, and JWT authentication.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Language | TypeScript |
| Runtime | Node.js |
| Framework | Express.js |
| Auth | JWT (access + refresh tokens) |
| Testing | Vitest |
| Config | YAML |

---

## Features

- **JWT Authentication** — Access + refresh token flow with revocation support
- **Idempotent Requests** — Safe retries without duplicate charges
- **Audit Logging** — Full request/response trail for every payment operation
- **Role-Based Access** — RBAC with role middleware
- **Clean Architecture** — Layered structure (routes → services → repositories)

---

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env
# Fill in JWT_SECRET and JWT_REFRESH_SECRET

# Run in development
npm run dev

# Run tests
npm test
```

---

## Project Structure

```
src/
├── routes/          # Express route handlers
├── services/        # Business logic
├── repositories/    # Data access layer
├── middleware/       # Auth, RBAC, validation
└── lib/             # Shared utilities (JWT, logger)
tests/
├── unit/            # Unit tests
└── integration/     # Integration tests
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Authenticate & get tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke tokens |
| GET | `/payments` | List payments |
| POST | `/payments` | Create payment |
| GET | `/payments/:id` | Get payment by ID |

---

## Environment Variables

| Variable | Description |
|---|---|
| `JWT_SECRET` | Secret for signing access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `development` or `production` |

---

## License

MIT
