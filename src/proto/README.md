# Proto Generated Files

This directory is where `buf generate` places auto-generated TypeScript stubs.

## Setup

1. Copy `.proto` files from the backend repo into `proto/` at the project root.
2. Run:
   ```bash
   npm run proto:gen
   ```
3. The generated `*_connect.ts` and `*_pb.ts` files will appear here.

## Expected services (based on issue requirements)

- `auth/v1/auth_service.proto`  →  `LoginRequest`, `LoginResponse`, `RefreshTokenRequest`, `RefreshTokenResponse`, `ResetPasswordRequest`, `SetPasswordRequest`
- `user/v1/user_service.proto`  →  `ListEmployeesRequest`, `ListEmployeesResponse`, `GetEmployeeByIdRequest`, `GetEmployeeResponse`, `UpdateEmployeeRequest`, `CreateEmployeeRequest`, `GetPermissionsRequest`, `GetPermissionsResponse`

## Current status

Generated stubs are **not committed**. The service layer (`src/services/`) uses
TypeScript interfaces that mirror these proto types.  Once you run `buf generate`
the interfaces can be replaced with the generated types for full type-safety.
