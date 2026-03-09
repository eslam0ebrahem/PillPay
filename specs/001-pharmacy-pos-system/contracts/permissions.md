# Permission Model: Pharmacy POS & Management System

**Branch**: `001-pharmacy-pos-system` | **Date**: 2026-03-09

## Roles

| Role | Description | Default Landing |
|------|-------------|-----------------|
| owner | Full system access, configurable | Dashboard |
| cashier | POS-focused, restricted by default | POS Screen |

## Permission Keys

### POS Operations

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `pos.search` | Search products in POS | Yes | Yes |
| `pos.checkout` | Complete sales | Yes | Yes |
| `pos.cancel` | Cancel saved sales | Yes | Yes |

### Products

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `products.view` | View product catalog | Yes | Yes |
| `products.manage` | Create, edit products | Yes | No |

### Customers

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `customers.view` | View customer list/profiles | Yes | Yes |
| `customers.create` | Create new customers | Yes | Yes |
| `customers.manage` | Edit customer details | Yes | No |
| `customers.payments` | Record customer payments | Yes | Yes |

### Refunds

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `refunds.create` | Issue refunds | Yes | Yes |
| `refunds.view` | View refund history | Yes | Yes |

### Stock

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `stock.view` | View stock levels | Yes | Yes |
| `stock.transfer` | Transfer between warehouse/floor | Yes | No |
| `stock.adjust` | Manual stock adjustments | Yes | No |

### Suppliers

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `suppliers.view` | View supplier list | Yes | No |
| `suppliers.manage` | Create, edit suppliers | Yes | No |

### Supplier Invoices

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `supplier-invoices.view` | View supplier invoices | Yes | No |
| `supplier-invoices.manage` | Create, edit, void invoices | Yes | No |
| `supplier-invoices.payments` | Record supplier payments | Yes | No |

### Reports & Analytics

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `reports.view` | View reports and dashboard | Yes | No |

### Balance Adjustments

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `balance.adjust` | Manual customer/supplier balance adjustments | Yes | No |

### Inventory Audits

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `inventory-audits.manage` | Start, update, approve audits | Yes | No |

### System Administration

| Permission | Description | Owner Default | Cashier Default |
|------------|-------------|:---:|:---:|
| `users.manage` | Create, edit, deactivate users | Yes | No |
| `settings.view` | View system settings | Yes | No |
| `settings.manage` | Update system settings | Yes | No |
| `backup.manage` | Export/import backups | Yes | No |
| `audit-logs.view` | View audit logs | Yes | No |

## Authorization Rules

1. **Owner role**: Has all permissions by default. Cannot be restricted (hardcoded full access).
2. **Cashier role**: Has default permissions listed above. Owner can grant additional permissions per user.
3. **Permission check**: Middleware validates `user.role === 'owner' || user.permissions.includes(requiredPermission)`.
4. **Self-service**: All users can view/update their own profile (name, password) regardless of permissions.
5. **Deactivated users**: Cannot log in. Existing JWT tokens are rejected via `isActive` check.

## Default Permission Sets

```json
{
  "cashier_defaults": [
    "pos.search",
    "pos.checkout",
    "pos.cancel",
    "products.view",
    "customers.view",
    "customers.create",
    "customers.payments",
    "refunds.create",
    "refunds.view",
    "stock.view"
  ]
}
```
