# Module Boundaries

## Overview

This project enforces strict module boundaries. Modules communicate only via **domain events** — never by importing each other's entities, services, or repositories.

## Modules

### User Module (`src/modules/user/`)

**Public contract (exported to other modules):**

- `UserCreatedDomainEvent` — emitted when a new user is created
- `UserDeletedDomainEvent` — emitted when a user is deleted
- `UserRoleChangedDomainEvent` — emitted when a user's role changes
- `UserAddressUpdatedDomainEvent` — emitted when a user's address is updated

**Internal (not available to other modules):**

- `UserEntity`, `UserProps`, `CreateUserProps`
- `UserRepositoryPort`, `UserRepository`
- `CreateUserService`, `DeleteUserService`
- All controllers and DTOs

### Wallet Module (`src/modules/wallet/`)

**Public contract (exported to other modules):**

- `WalletCreatedDomainEvent` — emitted when a wallet is created

**Internal (not available to other modules):**

- `WalletEntity`, `WalletProps`, `CreateWalletProps`
- `WalletRepositoryPort`, `WalletRepository`
- All command handlers and event handlers

## Communication Flow

```
User Module                              Wallet Module
┌─────────────┐                          ┌─────────────────────┐
│ UserEntity   │                          │ WalletEntity         │
│  .create()   │──emits──►               │                      │
│              │  UserCreated             │ EventHandler          │
│              │  DomainEvent ─────►     │  creates wallet      │
│              │                          │  emits WalletCreated  │
└─────────────┘                          └─────────────────────┘
```

## Enforcement

Cross-module imports are enforced by `dependency-cruiser` (`pnpm deps:validate`). The rule `no-cross-module-imports-except-events` will fail the build if any module imports from another module's internals.

Allowed: `import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';`

Forbidden: `import { UserEntity } from '@modules/user/domain/user.entity';` (from wallet module)
