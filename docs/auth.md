# Authentication & Authorization - Product Requirements Document

## Overview
JWT-based stateless authentication system that balances ease of use (no user registration required) with security and UX optimization.

## Architecture

### Core Components
- **Authentication Method**: JWT (JSON Web Token) - stateless authentication
- **Token Storage**: Browser localStorage for persistent sessions
- **Authorization Model**:
  - Password: Master key (recovery & new login)
  - Token: Daily use key (convenience access)

## User Flows

### Flow A: Creation (Auto-login)
1. User sets password and creates a "shiori"
2. Server returns edit token in response
3. Browser stores token immediately
4. Redirect to edit mode

### Flow B: Edit URL Access (Shortcut)
1. User accesses `example.com/s/xxx?token=abc...`
2. JavaScript extracts token from URL parameter
3. Store token in localStorage
4. **Critical**: Remove token from URL using `history.replaceState` (prevent accidental sharing)
5. Display edit mode using stored token

### Flow C: Password Authentication (Recovery/Alternative Device)
1. User accesses without edit URL or lost token
2. Click "Edit" button and enter password
3. Server issues new token on success
4. Store token (no password required for subsequent access)

## Data Structure

### LocalStorage Schema
Integrated with existing browsing history feature as unified object array.

**Key**: `shiori_history`

```json
[
  {
    "shioriId": "xyz12345",
    "title": "Autumn Kyoto Trip",
    "accessedAt": 1715000000,
    "token": "eyJhbGciOi..."
  },
  {
    "shioriId": "abc98765",
    "title": "Friend's Shiori",
    "accessedAt": 1716000000,
    "token": null
  }
]
```

**Authorization Logic**: Search by `shioriId`. If `token` exists, attach to API header for edit permission. If `token` is `null`, viewer mode only.

## Implementation Requirements

| Item | Requirement | Rationale |
|---|---|---|
| URL Sanitization | Immediately remove `?token=...` from URL bar after edit URL access | Prevent accidental permission sharing when user shares URL |
| Recovery Mechanism | Password authentication must be implemented | Enable recovery when edit URL is lost or browser cache is cleared |
| Brute Force Protection | Rate limiting on password authentication API | Protect against attacks on fixed ID system (e.g., lock after 5 failed attempts per minute) |

## Security Considerations
- No user registration reduces friction but requires robust rate limiting
- Token-based daily access minimizes password exposure
- URL sanitization prevents social engineering vulnerabilities
- Password as fallback ensures account recovery

