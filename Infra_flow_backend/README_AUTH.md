# Role-Based Authentication System

This document describes the JWT-based role-based authentication system implemented in the InfraFlow backend.

## Overview

The system supports four user roles:
- **student**: Can create and view complaints
- **worker**: Can update complaint status (plumber, electrician, technician)
- **admin**: Can manage workers, assign complaints, and view all data
- **authority**: Can view all complaints and approve repair costs (teacher/administrator)

## Authentication Flow

### 1. User Registration/Login
- Users register with email, password, and role
- Workers also specify skills and department
- Admin login uses fixed credentials (configurable via environment variables)

### 2. JWT Token Generation
- On successful authentication, a JWT token is returned containing:
  - `sub`: User ID
  - `role`: User role
  - `department`: User department (if applicable)

### 3. Middleware Chain
Requests are protected using two middleware functions:

#### `authMiddleware`
- Verifies JWT token from Authorization header
- Attaches user information to `req.user`
- Handles special case for admin users (not stored in database)

#### `roleMiddleware(...allowedRoles)`
- Checks if `req.user.role` is in the allowed roles array
- Returns 403 Forbidden if role doesn't match

## API Endpoints

### Authentication
```
POST /auth/register     - Register new user
POST /auth/login        - Login existing user
POST /auth/admin-login  - Admin login with fixed credentials
```

### Protected Routes

#### Complaints
```
POST  /complaints/create           - student
GET   /complaints/user             - student, worker, admin, authority
GET   /complaints/user/:rollNumber - student, worker, admin, authority
GET   /complaints/all              - admin, authority
PUT   /complaints/update-status/:id - worker, admin, authority
PUT   /complaints/assign-worker/:id - admin
```

#### Admin
```
GET   /admin/dashboard-data         - admin, authority
```

## Usage Examples

### Protecting a Route
```javascript
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware.js';

router.get('/protected', authMiddleware, roleMiddleware('admin', 'authority'), handler);
```

### Client-Side Authentication
```javascript
// Login
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { accessToken, user } = await response.json();

// Use token in requests
const protectedResponse = await fetch('/api/protected', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
```

## Environment Variables

```
JWT_SECRET=your-secret-key
ADMIN_USERNAME=admin          # Default: admin
ADMIN_PASSWORD=admin123       # Default: admin123
AUTHORITY_EMAIL=admin@gmail.com      # Default: admin@gmail.com
AUTHORITY_PASSWORD=admin123         # Default: admin123
```

Authority logins first check the `AUTHORITY_EMAIL`/`AUTHORITY_PASSWORD` pair, so you can sign in immediately even before inserting an authority document into MongoDB.

## Security Notes

- JWT tokens expire in 1 hour
- Passwords are hashed using bcrypt
- Admin credentials are configurable but should be stored securely
- Role checks are enforced on every protected route