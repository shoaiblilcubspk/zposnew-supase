# 🔐 LOCAL-FIRST RBAC, USER & TRANSACTION INTEGRITY SPECIFICATION

> **Single Source of Truth for Local Roles, Permissions, User Identity, Device Trust, and Transaction Integrity**
>
> **Reference:** `docs/LOCAL_FIRST_ARCHITECTURE.md` and `docs/USER & ROLE SETUP — FIRST INSTALL TO DAILY SALES.md`

---

# 01 — ARCHITECTURE AUTHORITY

The POS is a genuinely offline-first application.

```text
React + Vite + TypeScript
        ↓
Tauri / Capacitor
        ↓
Local SQLite
        ↓
Authorization
        ↓
Business Transaction
        ↓
Immutable Event
        ↓
Outbox
        ↓
WebRTC P2P
        ↓
Trusted Devices
```

## Authority Rules

```text
LOCAL SQLITE
= Business Data Authority

EVENT LEDGER
= Change / Replication Authority

WEBRTC P2P
= Business Data Synchronization

SUPABASE
= Signaling Only
```

Supabase may be used only for:

* WebRTC signaling
* Presence
* Offer
* Answer
* ICE coordination

Supabase MUST NOT be the authority for:

* Business data
* Users
* Roles
* Permissions
* Inventory
* Sales
* Payments
* Wallets
* Customer ledger
* Supplier ledger
* Expenses
* Transactions
* Reports
* RBAC
* Normal POS authentication
* Business transaction authorization

The normal POS transaction loop must not depend on:

* Supabase JWT
* Supabase RLS
* Supabase RPC
* Supabase Edge Functions
* Cloud role checks
* Cloud database availability

---

# 02 — CORE PRINCIPLES

The implementation MUST follow these rules:

1. Local operation must work without internet.
2. Local SQLite is the operational business-data authority.
3. RBAC is centralized and local.
4. Exactly four primary roles exist.
5. Admin is automatically created during first shop setup.
6. Manager, Cashier and Salesman are created only when needed.
7. Every sensitive business action requires authorization.
8. UI authorization is only UX; business-layer authorization is mandatory.
9. Unknown authorization state always means DENY.
10. Financial and inventory transactions are immutable effects.
11. Financial and inventory data must never use LWW.
12. Every successful business mutation creates an event.
13. Business data + effects + event + outbox commit atomically.
14. Failed transactions produce zero committed effects.
15. Duplicate events are idempotent.
16. Users are disabled rather than destructively deleted when historical references exist.
17. Trusted devices are identified cryptographically.
18. Revoked devices cannot perform new trusted business synchronization.
19. Normal sync transfers only missing events/changes.
20. Initial joining devices receive the required authorized bootstrap.
21. No fake APIs, fake SQLite, fake P2P or fake security are permitted.

---

# 03 — AUTHORITATIVE ROLES

Exactly these primary roles:

```text
ADMIN
MANAGER
CASHIER
SALESMAN
```

Conceptual responsibility:

```text
ADMIN
= CONTROL

MANAGER
= OPERATE

CASHIER
= CHECKOUT

SALESMAN
= SELL + TRACK SALES
```

Role hierarchy is conceptual only.

It MUST NOT automatically grant permissions.

Actual authorization comes from the centralized permission mapping.

---

# 04 — FIRST SHOP SETUP

First launch:

```text
First Launch
    ↓
Create New Shop
    ↓
Shop Name
+ Optional Logo
    ↓
Generate SHOP_ID
    ↓
Generate DEVICE_ID
    ↓
Generate Device Keypair
    ↓
Initialize SQLite
    ↓
Create First Admin
    ↓
Admin Name
+ PIN
+ Confirm PIN
    ↓
Generate Recovery Code
    ↓
Create ADMIN user
    ↓
Dashboard
```

The system MUST automatically create exactly one initial Admin.

It MUST NOT automatically create:

* Manager
* Cashier
* Salesman

---

# 05 — INITIAL ADMIN

Required fields:

```text
USER_ID
NAME
ROLE = ADMIN
PIN_HASH
STATUS = ACTIVE
CREATED_AT
UPDATED_AT
CREATED_BY
DEVICE_ID
```

`USER_ID` is system generated.

The first Admin becomes the initial trusted administrative user.

Admin has full business and security authority.

Another unrestricted Admin should not normally be created through ordinary user creation.

Admin replacement/recovery must use the dedicated secure recovery process.

---

# 06 — USER CREATION

Default rule:

```text
ADMIN ONLY
```

Flow:

```text
Users
 ↓
Add User
 ↓
Name
 ↓
Role
 ↓
PIN
 ↓
Confirm PIN
 ↓
Save
```

Allowed roles:

```text
MANAGER
CASHIER
SALESMAN
```

System automatically generates:

```text
USER_ID
CREATED_AT
UPDATED_AT
CREATED_BY
```

The operation creates:

```text
USER_CREATED
```

and the event is added to the local outbox for P2P synchronization.

No manual USER_ID is allowed.

---

# 07 — USER IDENTITY

Every user has:

```text
USER_ID
NAME
ROLE
STATUS
CREATED_AT
UPDATED_AT
CREATED_BY
DEVICE RELATIONSHIP
```

Every business operation records the authenticated actor where applicable:

```text
USER_ID
DEVICE_ID
EVENT_ID
TIMESTAMP
```

This provides permanent attribution:

```text
WHO
WHICH DEVICE
WHEN
WHAT
```

Historical transactions must retain their original actor identity.

---

# 08 — USER STATUS

Users must not be destructively deleted when historical records reference them.

Use:

```text
STATUS = ACTIVE
STATUS = DISABLED
```

Disabling creates:

```text
USER_STATUS_CHANGED
```

or the final normalized user-status event defined by the event schema.

After a disabled-user state is known locally:

```text
LOGIN = DENY
BUSINESS ACTION = DENY
NEW TRANSACTION = DENY
```

Historical records remain intact.

---

# 09 — USER ROLE CHANGE

Example:

```text
Ahmed
SALESMAN
    ↓
MANAGER
```

Create:

```text
USER_ROLE_UPDATED
```

The event synchronizes through the trusted P2P network.

Each receiving device updates its local authorization state.

No cloud RBAC update is required.

---

# 10 — PIN SECURITY

PINs are local authentication secrets.

Rules:

* Never store plaintext PIN.
* Never store plaintext PIN in events.
* Never send plaintext PIN through WebRTC.
* Never put plaintext PIN in QR codes.
* Never expose plaintext PIN in logs.
* Never place plaintext PIN in audit details.

Use a strong password/PIN hashing mechanism supported by the application architecture, preferably:

```text
Argon2id
```

or an appropriately configured:

```text
PBKDF2-HMAC-SHA256
```

with a unique cryptographic salt and strong iteration/work parameters.

The exact production parameters must be selected according to the final platform implementation.

---

# 11 — ADMIN PIN RECOVERY & 24-CHARACTER RECOVERY CODE ROTATION

Admin PIN recovery uses the dedicated 24-character master recovery code mechanism (`XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`).

### Authority & Exclusivity:
* **ONLY MAIN ADMIN (Root Owner):** Only the Root Admin has access to the 24-character master recovery code.
* Staff roles (`MANAGER`, `CASHIER`, `SALESMAN`) have zero access to this code and cannot use or view it.
* Staff PIN resets are performed directly by the Admin in Settings.

### Storage & Transmission Rules:
* Must never be stored plaintext in normal user records or database.
* Plaintext exists only offline with the Admin; SQLite stores only salted PBKDF2 hash `master_recovery_hash`.
* Must never be synced as plaintext over P2P or QR codes.
* Must never appear in audit logs.
* Must never be placed directly into P2P events.

### Leak Protection & Rotation (Settings ➔ Security):
* If the 24-character recovery code is leaked or compromised, **only Main Admin** can rotate/regenerate it by verifying their current Admin PIN.
* Upon rotation, the old recovery code is immediately and permanently invalidated.
* A brand new 24-character code is cryptographically generated and committed atomically to local SQLite.

---

# 12 — LOCAL AUTHENTICATION

Authentication flow:

```text
User selects account
        ↓
Enter PIN
        ↓
Hash using stored password/PIN parameters
        ↓
Compare against local credential verifier
        ↓
Success
        ↓
Create local authenticated session
        ↓
Load permissions
        ↓
Allow authorized operations
```

No internet connection is required.

No Supabase login is required for normal POS operation.

---

# 13 — LOGIN LOCKOUT

Progressive local protection:

```text
3 failed attempts
→ 30 second cooldown

5 failed attempts
→ 5 minute cooldown

10 failed attempts
→ terminal/account security lock
```

The exact lock implementation must be platform-safe.

Recovery requires authorized Admin recovery according to the final security design.

Failed attempts must not modify business transactions.

---

# 14 — SESSION LOCK

Support configurable idle locking.

Example:

```text
2 minutes
5 minutes
15 minutes
Never
```

Also provide:

```text
Lock Terminal
```

Locking returns to the local authentication screen.

Cached non-sensitive application data may remain available for performance, but protected operations require authentication again.

---

# 15 — DEVICE IDENTITY

Every installation receives:

```text
SHOP_ID
DEVICE_ID
DEVICE_PUBLIC_KEY
DEVICE_PRIVATE_KEY
```

The private key remains protected locally.

A device must not be able to arbitrarily claim another trusted device identity.

Where platform support exists, private key protection should use secure OS facilities.

---

# 16 — DEVICE TRUST

A device becomes trusted only through the authorized pairing process.

Trusted device state should include appropriate metadata such as:

```text
DEVICE_ID
SHOP_ID
PUBLIC_KEY
STATUS
CREATED_AT
LAST_SEEN
DEVICE_NAME
```

Possible status:

```text
PENDING
TRUSTED
REVOKED
```

Exact schema must follow the existing database architecture.

---

# 17 — DEVICE PAIRING

Admin-only pairing flow:

```text
Admin
 ↓
Devices
 ↓
Add / Pair Device
 ↓
Generate temporary pairing credential
 ↓
New device scans QR
 ↓
Admin approves
 ↓
Exchange public keys
 ↓
Create trusted device
 ↓
Initial authorized bootstrap
 ↓
Integrity verification
 ↓
Device ready
```

QR credentials must be:

* Temporary
* Limited in scope
* Non-reusable
* Non-sensitive
* Non-plaintext-PIN based

Never put permanent private keys or plaintext secrets inside pairing QR data.

---

# 18 — DEVICE REVOCATION

Admin-only.

Admin can:

* View devices
* Rename devices
* Pair devices
* Revoke devices
* View sync state
* View last seen
* Request/force synchronization

When a device is revoked:

```text
REVOKED
    ↓
No new trusted P2P business sync
    ↓
No new authorized business operations for that shop
```

Historical local data must not be silently destroyed.

The exact enforcement mechanism must work even when temporarily offline according to the final trust/revocation model.

---

# 19 — ADMIN PERMISSIONS

Admin has full authority over:

* Dashboard
* POS
* Sales
* Returns
* Refunds
* Products
* Categories
* Pricing
* Inventory
* Restock
* Inventory adjustments
* Purchases
* Suppliers
* Customers
* Customer payments
* Wallets
* Payments
* Expenses
* Ledgers
* Reports
* Users
* Roles
* Permissions
* Devices
* Pairing
* Device revocation
* Sync controls
* Backup
* Restore
* Settings
* Security
* Audit
* Data export
* Recovery

No approval queue is required.

---

# 20 — MANAGER PERMISSIONS

Manager is the primary daily operational role.

Default access:

* Dashboard
* Sales
* Sale creation
* Sale editing where permission exists
* Returns
* Normal refunds
* Products
* Product editing
* Inventory viewing
* Restock
* Purchases
* Suppliers
* Customers
* Customer ledger
* Customer payments
* Expenses
* Operational reports
* Audit viewing
* Operational wallet viewing

Manager cannot by default:

* Create users
* Disable users
* Change roles
* Manage permissions
* Pair devices
* Revoke devices
* Change security settings
* Use root recovery
* Perform manual wallet adjustment
* Modify system settings
* Full data export
* Modify audit history

---

# 21 — CASHIER PERMISSIONS

Cashier is the checkout role.

Allowed:

* POS
* Product search
* Barcode scanning
* Product information needed for selling
* Cart management
* Quantity changes
* Permitted discounts
* Customer lookup
* Customer creation
* Basic customer editing
* Payment
* Split payment
* Receipt printing
* Allowed receipt reprint
* Normal returns
* Normal customer payments
* Own/current sales
* Current shift information if the shift system exists

Cashier cannot by default:

* Product management
* Product cost modification
* Inventory adjustment
* Restock
* Purchases
* Supplier payments
* Manual wallet adjustment
* Wallet transfer
* Expenses
* User management
* Role management
* Permission management
* Device management
* System settings
* Security settings
* Sale reversal/deletion
* Historical financial manipulation
* Company-wide sensitive financial reports

---

# 22 — SALESMAN PERMISSIONS

Salesman is responsible for customer selling and sales attribution.

Allowed:

* Customer view
* Customer creation
* Basic customer editing
* Product view
* Product search
* Barcode/product lookup
* Stock availability lookup
* Sale preparation
* Cart creation
* Order/draft creation
* Assign himself to a sale
* View his sales
* Relevant customer history
* Sales activity
* Sales tracking

Salesman cannot by default:

* Inventory adjustment
* Restock
* Purchases
* Supplier payments
* Wallet adjustment
* Wallet transfer
* Expenses
* User management
* Role management
* Permission management
* Device management
* System settings
* Security settings
* Sale reversal
* Historical financial manipulation

---

# 23 — SALESMAN + CASHIER IDENTITY

Sales must support separate actors:

```text
SALESMAN_ID
CASHIER_ID
CREATED_BY_USER_ID
DEVICE_ID
```

Example:

```text
Ahmed = SALESMAN
Ali   = CASHIER
```

Flow:

```text
Ahmed
 ↓
Customer + Products
 ↓
Sale
 ↓
Ali
 ↓
Payment
 ↓
Completed
```

The completed sale preserves both identities.

---

# 24 — SALESMAN SELF CHECKOUT

If the salesman also completes checkout:

```text
SALESMAN_ID = Ahmed
CASHIER_ID  = Ahmed
```

No duplicate account is required.

The application automatically uses the current authenticated user where appropriate.

---

# 25 — SALE ATTRIBUTION

A sale should preserve:

```text
SALE_ID
SALESMAN_ID
CASHIER_ID
CREATED_BY_USER_ID
DEVICE_ID
CREATED_AT
```

Changing attribution after creation must create a traceable event.

Reports can aggregate by:

* Salesman
* Cashier
* User
* Device
* Date
* Product
* Customer

---

# 26 — CENTRAL PERMISSION MODEL

Permissions must be defined centrally.

Example permissions:

```text
dashboard.view

sales.view
sales.create
sales.edit
sales.reverse

returns.create
refunds.create

products.view
products.create
products.edit
products.archive

inventory.view
inventory.restock
inventory.adjust

purchases.view
purchases.create

suppliers.view
suppliers.manage
suppliers.payment

customers.view
customers.create
customers.edit
customers.payment
customers.credit

wallet.view
wallet.adjust
wallet.transfer

expenses.view
expenses.create
expenses.edit
expenses.reverse

reports.view
reports.financial

users.view
users.create
users.edit
users.disable

roles.manage
permissions.manage

devices.view
devices.pair
devices.revoke

settings.manage
security.manage

backup.create
backup.restore

audit.view
exports.create
```

Permission names must have one canonical definition.

Do not scatter duplicate permission definitions through components.

---

# 27 — ROLE PERMISSION MAPPING

Default model:

```text
ADMIN
→ All permissions

MANAGER
→ Operational permissions

CASHIER
→ POS / checkout permissions

SALESMAN
→ Sales / customer permissions
```

Permissions are binary:

```text
ALLOW
DENY
```

No default approval workflow.

No amount-based approval thresholds.

No asynchronous approval queues.

No:

```text
PENDING_APPROVAL
```

unless explicitly introduced as a future separate requirement.

---

# 28 — OPTIONAL USER OVERRIDES

The architecture may support explicit per-user permission overrides only if the existing application genuinely requires them.

If implemented:

```text
ROLE DEFAULT
      +
OPTIONAL USER OVERRIDE
      ↓
FINAL PERMISSION
```

Keep the model simple.

Do not create separate competing permission engines.

Do not create arbitrary boolean fields such as:

```text
isAdmin
canEverything
superUser
```

as authorization shortcuts.

---

# 29 — AUTHORIZATION SERVICE

There must be one centralized authorization service.

Conceptually:

```text
can(userId, permission, context)
```

The exact implementation may differ.

It must resolve:

```text
Current User
+
User Status
+
Role
+
Role Permissions
+
Explicit User Override if supported
+
Trusted Device
+
SHOP_ID
```

Result:

```text
ALLOW
or
DENY
```

Unknown state:

```text
DENY
```

---

# 30 — UI AUTHORIZATION

Use the same authorization service for:

* Sidebar
* Navigation
* Routes
* Buttons
* Tabs
* Dropdown actions
* Forms
* Modals
* Context menus
* Mobile UI

Unauthorized UI should normally be hidden or disabled.

But:

```text
UI ≠ Security Boundary
```

Direct URL access, modified frontend state or manually triggered actions must still be rejected by the business layer.

---

# 31 — BUSINESS-LAYER AUTHORIZATION

Every sensitive mutation checks authorization before changing data.

Example:

```text
adjustInventory()
      ↓
authorize("inventory.adjust")
      ↓
validate
      ↓
SQLite transaction
```

Never rely on:

```text
Button hidden
↓
Therefore secure
```

The service/domain layer must enforce authorization.

---

# 32 — FAIL-CLOSED SECURITY

Authorization must fail closed.

If any required state is:

* Missing
* Invalid
* Unknown
* Corrupt
* User inactive
* Device untrusted
* Device revoked
* SHOP_ID mismatched
* Permission undefined

then:

```text
DENY
```

Golden rule:

```text
UNKNOWN = DENY
```

---

# 33 — NO FRONTEND SECURITY BYPASS

Never trust frontend-supplied:

```text
role = "ADMIN"
isAdmin = true
permissions = [...]
userId = arbitrary
deviceId = arbitrary
```

The application must derive authorization from trusted local state and authenticated local identity.

---

# 34 — BUSINESS ACTION PIPELINE

Every sensitive business action follows:

```text
Current User
      ↓
User Active?
      ↓
Device Trusted?
      ↓
SHOP_ID Valid?
      ↓
Permission?
      ↓
Business Validation
      ↓
SQLite Transaction
      ↓
Main Transaction
      ↓
Effects
      ↓
Audit
      ↓
Event
      ↓
Outbox
      ↓
COMMIT
```

If authorization or validation fails:

```text
ZERO BUSINESS EFFECT
```

---

# 35 — EVENT IDENTITY

Every business mutation event must contain the canonical event identity required by the event schema.

Minimum conceptual fields:

```text
EVENT_ID
SHOP_ID
DEVICE_ID
USER_ID
SEQUENCE
EVENT_TYPE
ENTITY_TYPE
ENTITY_ID
PAYLOAD
CREATED_AT
```

Security metadata may additionally include:

```text
EVENT_HASH
SIGNATURE
KEY_ID
PARENT / CAUSAL REFERENCES
```

according to the final event-security architecture.

`EVENT_ID` must be globally unique within the shop.

---

# 36 — EVENT IMMUTABILITY

Events are append-only.

Do not:

* Rewrite historical events
* Modify financial event meaning
* Delete committed business events
* Replace one financial event with another

Corrections are represented through new events/transactions.

---

# 37 — OUTBOX ATOMICITY

A successful local business mutation must commit:

```text
Business Data
+
Effects
+
Audit
+
Event
+
Outbox
```

inside the same SQLite transaction.

Therefore:

```text
SUCCESS
→ all required records committed

FAILURE
→ none committed
```

Never create business data without its event.

Never create a committed event for a failed transaction.

Never create an outbox record for a transaction that did not commit.

---

# 38 — IDEMPOTENCY

Every business operation must have appropriate unique transaction/request identity.

Protect against:

* Double click
* Retry
* App restart
* Connection interruption
* Duplicate WebRTC delivery
* Repeated request
* User retry after timeout

The same logical operation must never create duplicate financial or inventory effects.

---

# 39 — INCOMING P2P EVENT VALIDATION

Incoming event flow:

```text
Receive
 ↓
Validate SHOP_ID
 ↓
Validate trusted DEVICE_ID
 ↓
Validate device status
 ↓
Validate cryptographic identity/signature where required
 ↓
Validate event schema
 ↓
Validate actor/user
 ↓
Validate authorization context where applicable
 ↓
Check EVENT_ID
 ↓
Validate sequence/version rules
 ↓
Apply transactionally
 ↓
Record inbox/event
 ↓
ACK
```

Invalid event:

```text
REJECT
```

No business mutation is allowed.

---

# 40 — DUPLICATE EVENT HANDLING

Before applying an incoming event:

```text
EVENT_ID exists?
```

If yes:

```text
DO NOT APPLY AGAIN
ACK
```

This protects against:

* Duplicate packet
* Retry
* Reconnect
* Double delivery
* Device restart

---

# 41 — P2P SYNC

Normal synchronization:

```text
Supabase signaling
        ↓
WebRTC connection
        ↓
Exchange sync checkpoints
        ↓
Determine missing events
        ↓
Transfer missing events
        ↓
Validate
        ↓
Apply transactionally
        ↓
ACK
```

Supabase must not store or become authoritative for the business transaction.

---

# 42 — INITIAL BOOTSTRAP

Only a newly joining authorized device requires the initial bootstrap.

Bootstrap may include the required authorized dataset:

```text
Shop
Users
Roles
Permissions
Products
Images
Inventory state/history required
Customers
Suppliers
Sales
Payments
Expenses
Wallets
Ledgers
Settings
Audit
Sync metadata
```

The exact bootstrap dataset must follow the final database architecture and authorization rules.

---

# 43 — NORMAL SYNC RULE

After bootstrap:

```text
NEVER send the complete database on every sync.
```

Instead:

```text
Exchange checkpoints
 ↓
Find missing events/changes
 ↓
Transfer only missing data
 ↓
Validate
 ↓
Apply
 ↓
ACK
```

This prevents unnecessary whole-database transfers.

---

# 44 — RBAC SYNC

RBAC changes are themselves business/security state changes.

Examples:

```text
USER_CREATED
USER_UPDATED
USER_ROLE_UPDATED
USER_STATUS_CHANGED
USER_PIN_RESET
ROLE_PERMISSION_UPDATED
USER_PERMISSION_UPDATED
```

Only the event types actually required by the final schema should be implemented.

Sensitive credentials must never be synchronized as plaintext.

---

# 45 — CONFLICT MODEL

Not every field uses the same conflict strategy.

## Safe ordinary fields

Deterministic versioning/LWW may be used where appropriate.

Examples:

```text
Product name
Product description
Display settings
Non-financial metadata
```

## Never LWW

Never use LWW to resolve:

```text
Inventory
Sales
Payments
Refunds
Returns
Wallet
Customer ledger
Supplier ledger
Expenses
Financial transactions
```

These use immutable transactions/effects/events.

---

# 46 — INVENTORY INTEGRITY

Inventory is transaction-based.

Never do:

```text
Device A = stock 5
Device B = stock 2

LAST WRITE WINS
```

Instead preserve all valid movements.

Example:

```text
Opening = 6

Device A sells 5
Device B sells 4
```

Calculated stock:

```text
6 - 5 - 4 = -3
```

The system may report:

```text
Oversold = 3
```

Never delete or overwrite one valid sale to hide the conflict.

---

# 47 — WALLET INTEGRITY

Wallet balances are derived from immutable movements.

```text
Opening
+
IN
-
OUT
=
Balance
```

Do not overwrite a wallet balance merely because another device has a newer value.

Every wallet movement must remain traceable.

---

# 48 — CUSTOMER LEDGER INTEGRITY

Customer receivable:

```text
Opening Receivable
+
Credit
-
Payments
=
Current Receivable
```

Payments and credit effects are immutable transactions.

Never use LWW to hide conflicting ledger movements.

---

# 49 — SUPPLIER LEDGER INTEGRITY

Supplier payable:

```text
Opening Payable
+
Purchases
-
Payments
=
Current Payable
```

All movements remain traceable.

---

# 50 — FINANCIAL INTEGRITY

Never use LWW for:

* Sales
* Payments
* Refunds
* Returns
* Expenses
* Wallet movements
* Customer ledger
* Supplier ledger
* Financial transactions

Corrections must be represented as explicit transactions/effects.

---

# 51 — SALE TRANSACTION

A successful sale may create:

```text
SALE
+
SALE ITEMS
+
INVENTORY OUT
+
PAYMENT EFFECTS
+
CUSTOMER EFFECT if applicable
+
AUDIT
+
EVENT
+
OUTBOX
```

All required effects commit atomically.

---

# 52 — CASH SALE

Example:

```text
Sale = Rs 5,000
```

Effects:

```text
Inventory OUT
Cash IN 5,000
```

---

# 53 — BANK / CARD / ONLINE SALE

Example:

```text
Inventory OUT
Bank/Card/Online IN
```

The payment effect must match the actual selected payment method.

---

# 54 — SPLIT PAYMENT

Example:

```text
Total = Rs 10,000

Cash = Rs 4,000
Bank = Rs 6,000
```

Effects:

```text
Inventory OUT

Cash IN 4,000
Bank IN 6,000
```

All belong to the same sale transaction.

---

# 55 — CREDIT SALE

Example:

```text
Total = Rs 10,000
Paid = Rs 3,000
Credit = Rs 7,000
```

Effects:

```text
Inventory OUT
Payment Wallet IN 3,000
Customer Receivable +7,000
```

---

# 56 — PARTIAL CREDIT

Partial credit must be represented as:

```text
Total Sale
-
Actual Payments
=
Receivable
```

The resulting customer ledger effect must equal the unpaid amount.

---

# 57 — SALE EDIT

Never blindly overwrite committed financial history.

Compute:

```text
Original committed state
        ↓
New requested state
        ↓
Exact delta
        ↓
Required adjustment effects
```

Example:

```text
Original Qty = 2
New Qty = 1
```

Required inventory correction:

```text
Inventory IN 1
```

All adjustments must remain traceable.

---

# 58 — SALE REVERSAL

Never delete the original sale.

Create a reversal transaction.

Original:

```text
Inventory OUT 5
Cash IN 5,000
```

Reversal:

```text
Inventory IN 5
Cash OUT 5,000
```

The original transaction remains permanently traceable.

---

# 59 — DOUBLE REVERSAL

If a transaction has already been fully reversed:

```text
REJECT
```

Do not create another reversal.

The system must enforce this through transaction state/constraints, not only UI logic.

---

# 60 — RETURNS

Return without refund:

```text
Inventory IN
```

Return with refund:

```text
Inventory IN
Wallet OUT
```

Refund without physical return:

```text
Wallet OUT
```

No inventory movement is created when no physical inventory is returned.

---

# 61 — RESTOCK

Restock creates:

```text
Inventory IN
```

If supplier payment is made:

```text
Wallet OUT
Supplier Payable DECREASE
```

The purchase/restock/payment relationship must remain traceable.

---

# 62 — EXPENSE

Expense:

```text
Wallet OUT
```

Reversal:

```text
Wallet IN
```

The original expense remains traceable.

---

# 63 — CUSTOMER PAYMENT

Customer payment:

```text
Wallet IN
Customer Receivable DECREASE
```

Reversal:

```text
Wallet OUT
Customer Receivable INCREASE
```

Both remain traceable.

---

# 64 — SUPPLIER PAYMENT

Supplier payment:

```text
Wallet OUT
Supplier Payable DECREASE
```

Reversal:

```text
Wallet IN
Supplier Payable INCREASE
```

---

# 65 — WALLET TRANSFER

Example:

```text
Cash OUT 10,000
Bank IN 10,000
```

Both effects must commit atomically.

If transaction fails:

```text
ROLLBACK BOTH
```

Never allow only one side of the transfer to commit.

---

# 66 — INVENTORY ADJUSTMENT

Default:

```text
ADMIN = ALLOW
MANAGER = DENY unless explicitly granted
CASHIER = DENY
SALESMAN = DENY
```

No approval queue.

No amount threshold.

No asynchronous approval.

An adjustment must include:

```text
Reason
Actor
Device
Timestamp
Reference
Event
```

The final authorization is simply:

```text
Permission exists → ALLOW
Permission absent → DENY
```

---

# 67 — NO PARTIAL TRANSACTIONS

Golden rule:

```text
ALL REQUIRED EFFECTS COMMIT

OR

ZERO EFFECTS COMMIT
```

Example:

```text
Sale creation fails
    ↓
NO committed sale
NO inventory OUT
NO wallet IN
NO ledger effect
NO committed business event
NO outbox record
```

---

# 68 — TRANSACTION GRAPH

Each business transaction must be traceable:

```text
MAIN TRANSACTION
    ├── Inventory Effects
    ├── Wallet Effects
    ├── Customer/Supplier Effects
    ├── Audit
    └── Event
```

Reversal:

```text
Original Transaction
        ↓
Original Effects
        ↓
Reversal Transaction
        ↓
Exact Opposite Effects
```

---

# 69 — AUDIT LOG

Audit records are append-only.

Conceptual fields:

```text
AUDIT_ID
SHOP_ID
USER_ID
DEVICE_ID
ACTION
ENTITY_TYPE
ENTITY_ID
TIMESTAMP
DETAILS
EVENT_ID
```

Audit history must not be editable/deletable by normal users.

Audit details must not contain plaintext secrets.

---

# 70 — REPORTING

Reports query local SQLite.

```text
SQLite
 ↓
Query
 ↓
Aggregation
 ↓
Report
```

No cloud query is required.

Supported reporting dimensions may include:

```text
Sales by salesman
Sales by cashier
Sales by device
Sales by date
Sales by product
Sales by customer
```

Manager receives operational reporting.

Admin receives full reporting.

Cashier/Salesman receive only permitted reports.

---

# 71 — UI ROLE VISIBILITY

The UI should automatically reflect permissions.

Cashier should not normally see:

```text
Users
Devices
Settings
Inventory Adjustment
Expenses
Suppliers
```

Salesman should not normally see:

```text
Users
Devices
Wallet Management
Inventory Adjustment
Settings
Expenses
```

Manager should not normally see:

```text
User Administration
Device Management
Security
Root Recovery
```

However, hiding navigation is not sufficient.

Direct actions must still be rejected by the business layer.

---

# 72 — HARD DELETE POLICY

## Users

```text
Disable
```

rather than destructive deletion when historical references exist.

## Products

```text
Archive
```

when historical transactions reference them.

## Financial Transactions

```text
Reverse / Void
```

rather than destructive deletion.

## Audit

```text
Append-only
```

---

# 73 — LOCAL OFFLINE OPERATION

Normal POS must continue working when:

```text
Internet = OFF
Supabase = OFF
Other Devices = OFF
```

Users must still be able to perform authorized local operations such as:

* Local login
* Sales
* Returns
* Customer payments
* Permitted data changes
* Inventory movements
* Financial transactions
* Event creation
* Outbox queuing

---

# 74 — RECONNECT

When connectivity returns:

```text
Supabase signaling
 ↓
WebRTC connection
 ↓
Sync checkpoints
 ↓
Missing events
 ↓
P2P transfer
 ↓
Validation
 ↓
Transactional apply
 ↓
ACK
```

No business transaction is uploaded to Supabase as the business source of truth.

---

# 75 — DATA CONVERGENCE

Example:

```text
Device A offline
→ Sale A

Device B offline
→ Sale B
```

After synchronization:

```text
Device A
→ Sale A
→ Sale B

Device B
→ Sale A
→ Sale B
```

Valid independent transactions must both survive.

The system must not overwrite one transaction merely because another transaction has a newer timestamp.

---

# 76 — REQUIRED INTEGRITY CHECKS

The system must detect:

* Orphan inventory effect
* Orphan wallet effect
* Duplicate effect
* Missing source transaction
* Missing reversal
* Double reversal
* Invalid event
* Unauthorized event
* Broken ledger relationship
* Incorrect calculated balance
* Missing event
* Duplicate event
* Invalid device
* Revoked device event
* SHOP_ID mismatch
* Invalid actor
* Invalid event sequence
* Corrupt event payload

Detected corruption must not be silently hidden.

---

# 77 — SECURITY CHECKS

Search the entire codebase for:

```text
isAdmin
role ===
role ==
admin
permission
permissions
can(
authorize
auth
supabase
rpc
RLS
JWT
action_hash
approval
PENDING_APPROVAL
```

Audit every result.

Remove or migrate:

* Hardcoded admin bypasses
* Duplicate permission systems
* Frontend-only authorization
* Supabase-only authorization
* JWT role assumptions
* Cloud transaction authority
* Legacy approval workflows
* Fail-open logic
* Hidden cloud dependencies

Do not blindly delete working code.

Inspect first, then migrate.

---

# 78 — REMOVE LEGACY SUPABASE RBAC

Completely remove business authorization dependency on:

```text
Supabase Auth role authority
Supabase RLS
Supabase RPC authorization
Supabase Edge Function authorization
Cloud permission authority
Cloud user authority
JWT role claims
Cloud transaction authority
```

Required replacement:

```text
Local SQLite
+
Local Authorization Service
+
Immutable Event Ledger
+
P2P Synchronization
```

Supabase remains signaling-only.

---

# 79 — NO FAKE SECURITY

The implementation must never pretend security exists when it does not.

Do not trust:

```text
role = "ADMIN"
isAdmin = true
permissions = [...]
```

from client-controlled payloads.

Do not implement fake:

```text
P2P
SQLite
authorization
sync
signatures
device trust
```

that only simulate functionality.

All production paths must connect to the real implementation.

---

# 80 — ROLE × BUSINESS MATRIX

| Capability          | ADMIN |      MANAGER      |   CASHIER   |    SALESMAN    |
| ------------------- | :---: | :---------------: | :---------: | :------------: |
| Dashboard           |  Full |        Yes        |   Limited   |     Limited    |
| POS                 |  Yes  |        Yes        |     Yes     |       Yes      |
| Sales Create        |  Yes  |        Yes        |     Yes     |       Yes      |
| Sale Tracking       |  All  |        All        | Own/Allowed |       Own      |
| Sale Edit           |  Yes  |      Allowed      |   Allowed   |    Draft/Own   |
| Sale Reverse        |  Yes  |        Yes        |      No     |       No       |
| Returns             |  Yes  |        Yes        |     Yes     |   Yes/Allowed  |
| Refunds             |  Yes  |        Yes        |    Normal   |       No       |
| Products View       |  Yes  |        Yes        |     POS     |       Yes      |
| Product Create/Edit |  Yes  |        Yes        |      No     |       No       |
| Inventory View      |  Yes  |        Yes        |   Limited   |     Limited    |
| Restock             |  Yes  |        Yes        |      No     |       No       |
| Inventory Adjust    |  Yes  | Optional Explicit |      No     |       No       |
| Purchases           |  Yes  |        Yes        |      No     |       No       |
| Suppliers           |  Yes  |        Yes        |      No     |       No       |
| Supplier Payment    |  Yes  |        Yes        |      No     |       No       |
| Expenses            |  Yes  |        Yes        |      No     |       No       |
| Wallet View         |  Full |    Operational    |   Assigned  |       No       |
| Wallet Adjust       |  Yes  |         No        |      No     |       No       |
| Wallet Transfer     |  Yes  |         No        |      No     |       No       |
| Customers           |  Yes  |        Yes        |     Yes     |       Yes      |
| Customer Payment    |  Yes  |        Yes        |     Yes     |   No/Allowed   |
| Users               |  Yes  |         No        |      No     |       No       |
| Roles               |  Yes  |         No        |      No     |       No       |
| Permissions         |  Yes  |         No        |      No     |       No       |
| Devices             |  Yes  |         No        |      No     |       No       |
| Device Pairing      |  Yes  |         No        |      No     |       No       |
| Device Revocation   |  Yes  |         No        |      No     |       No       |
| Sync Status         |  Full |        View       |     View    |      View      |
| Reports             |  Full |    Operational    |  Own/Basic  |    Own/Basic   |
| Financial Reports   |  Yes  |        Yes        |      No     |       No       |
| Settings            |  Yes  |         No        |      No     |       No       |
| Security            |  Yes  |         No        |      No     |       No       |
| Backup              |  Yes  |         No        |      No     |       No       |
| Restore             |  Yes  |         No        |      No     |       No       |
| Audit               |  Full |        View       |      No     | Own if allowed |
| Data Export         |  Yes  |         No        |      No     |       No       |
| Recovery            |  Yes  |         No        |      No     |       No       |

The exact final permission matrix must be implemented through the centralized permission definitions, not hardcoded directly into individual UI components.

---

# 81 — COMMON USER SCREEN

User management should display:

```text
Name
User ID
Role
Status
Created At
Last Activity
```

PIN input is only shown where required for:

* Initial creation
* PIN change/reset

Never display the stored PIN verifier.

System-generated fields:

```text
USER_ID
CREATED_BY
CREATED_AT
UPDATED_AT
```

---

# 82 — USER EVENT RULES

User creation:

```text
USER_CREATED
```

User update:

```text
USER_UPDATED
```

Role change:

```text
USER_ROLE_UPDATED
```

Status change:

```text
USER_STATUS_CHANGED
```

PIN reset:

```text
USER_PIN_RESET
```

Permission change:

```text
ROLE_PERMISSION_UPDATED
```

or:

```text
USER_PERMISSION_UPDATED
```

Only canonical event types defined by the final event schema should be used.

All events:

```text
SQLite
 ↓
Outbox
 ↓
WebRTC
 ↓
Trusted Devices
```

---

# 83 — SALE IDENTITY RULE

At sale creation, automatically capture:

```text
USER_ID
DEVICE_ID
SALESMAN_ID
CASHIER_ID
```

Do not require users to manually type their own identity.

If a separate salesman is selected, only the appropriate authorized user-selection control is exposed.

The authenticated current user remains the authoritative actor.

---

# 84 — BUSINESS TRANSACTION AUTHORIZATION ORDER

Every sensitive operation:

```text
Current User
 ↓
Active?
 ↓
Trusted Device?
 ↓
Correct SHOP_ID?
 ↓
Permission?
 ↓
Validate Input
 ↓
Validate Business Rules
 ↓
SQLite Transaction
 ↓
Business Rows
 ↓
Effects
 ↓
Audit
 ↓
Event
 ↓
Outbox
 ↓
Commit
```

Failure at any point before commit:

```text
ZERO BUSINESS EFFECT
```

---

# 85 — CRITICAL TRANSACTION TESTS

Must test at minimum:

### Sales

* Cash sale
* Card sale
* Bank sale
* Online sale
* Split payment
* Credit sale
* Partial credit
* Sale edit
* Sale reversal
* Double reversal rejection

### Returns / Refunds

* Return
* Return + refund
* Refund without return

### Inventory

* Restock
* Inventory adjustment
* Concurrent/offline inventory movements

### Financial

* Expense
* Expense reversal
* Customer payment
* Customer payment reversal
* Supplier payment
* Supplier payment reversal
* Wallet transfer

### Reliability

* Failed transaction
* Double click
* Duplicate request
* Retry
* App restart
* Offline transaction
* Reconnect
* P2P duplicate event
* P2P missing event
* P2P invalid event

### Security

* Device revoke
* Untrusted device
* User disable
* Role change
* Permission change
* Cashier unauthorized action
* Salesman unauthorized action
* Manager unauthorized action
* Unknown permission
* Invalid SHOP_ID
* Invalid event
* Invalid actor

---

# 86 — ZERO PARTIAL EFFECT TEST

A failed sale must result in:

```text
NO Sale
+
NO Inventory OUT
+
NO Wallet IN
+
NO Customer Ledger Effect
+
NO Committed Business Event
+
NO Outbox Record
```

The same principle applies to every atomic business transaction.

---

# 87 — P2P CONVERGENCE TEST

Two offline devices:

```text
Device A
→ Sale A

Device B
→ Sale B
```

After synchronization:

```text
Device A
→ A + B

Device B
→ A + B
```

No valid transaction may disappear because another device had a later timestamp.

Financial/inventory events must remain additive and traceable.

---

# 88 — DEVICE REVOCATION TEST

After Admin revokes a device:

```text
Device status
→ REVOKED
```

The system must enforce:

```text
No trusted business sync
No new authorized business operation
```

according to the final offline revocation/security model.

Historical local records remain intact.

---

# 89 — ACCEPTANCE CRITERIA

Implementation is complete only when all are true:

```text
[ ] Admin automatically created on first setup
[ ] Manager created only when needed
[ ] Cashier created only when needed
[ ] Salesman created only when needed

[ ] Sale tracks salesman
[ ] Sale tracks cashier
[ ] Sale tracks authenticated user
[ ] Sale tracks device

[ ] Local SQLite is business-data authority
[ ] Local SQLite is RBAC authority
[ ] Event ledger is change authority
[ ] WebRTC is P2P business synchronization
[ ] Supabase is signaling only

[ ] No Supabase RPC/RLS dependency in core POS loop
[ ] No cloud business-data authority remains
[ ] No cloud RBAC authority remains

[ ] User creation syncs
[ ] User updates sync
[ ] User disable syncs
[ ] Role changes sync
[ ] Permission changes sync

[ ] Device identity verified
[ ] Device trust enforced
[ ] Revoked device rejected
[ ] SHOP_ID validated

[ ] PIN plaintext never stored
[ ] PIN plaintext never synced
[ ] PIN plaintext never logged

[ ] Central authorization service exists
[ ] UI authorization works
[ ] Business-layer authorization works
[ ] Unknown permission = DENY
[ ] Unauthorized action = ZERO EFFECT
[ ] No hardcoded admin bypass

[ ] Inventory uses immutable effects
[ ] Wallet uses immutable effects
[ ] Sales use immutable transactions/events
[ ] Financial data never uses LWW
[ ] Inventory never uses LWW

[ ] Sale reversal reverses actual committed effects
[ ] Double reversal impossible
[ ] Failed transactions produce zero effects
[ ] Duplicate operations are idempotent
[ ] Duplicate events are idempotent

[ ] Offline POS works
[ ] Initial bootstrap works
[ ] Normal incremental sync works
[ ] Only missing events/changes are transferred
[ ] P2P invalid events are rejected
[ ] P2P duplicate events are safely ignored

[ ] Reports use local SQLite
[ ] Audit is append-only
[ ] Historical user identity preserved
[ ] Financial history is not destructively deleted
[ ] Products with history are archived

[ ] No legacy competing RBAC remains
[ ] No fake P2P remains
[ ] No fake SQLite remains
[ ] No fake authorization remains
[ ] No hidden Supabase business dependency remains
```

---

# 90 — IMPLEMENTATION RULES

Before changing code:

```text
1. Inspect complete existing codebase.
2. Inspect package/dependency structure.
3. Inspect SQLite/database implementation.
4. Inspect schema and migrations.
5. Inspect current authentication.
6. Inspect current RBAC.
7. Inspect all permission checks.
8. Inspect business services.
9. Inspect transaction handling.
10. Inspect inventory effects.
11. Inspect wallet/ledger effects.
12. Inspect audit system.
13. Inspect event/outbox system.
14. Inspect P2P synchronization.
15. Inspect Supabase references.
16. Inspect existing tests.
```

Do not create a parallel architecture.

Do not blindly delete existing functionality.

Migrate existing working functionality into the authoritative architecture.

---

# 91 — LEGACY CODE MIGRATION

For every old RBAC/auth/data path:

```text
DISCOVER
 ↓
CLASSIFY
 ↓
VERIFY CURRENT USAGE
 ↓
MIGRATE
 ↓
TEST
 ↓
REMOVE ONLY WHEN SAFE
```

Classify legacy code as:

```text
KEEP
REFACTOR
MIGRATE
REMOVE
```

Do not remove code simply because it references Supabase.

First determine whether it performs:

* Signaling
* Presence
* Business data
* Authentication
* Authorization
* Sync
* Storage
* UI functionality

Supabase signaling functionality may remain.

Supabase business authority must not remain.

---

# 92 — NO DUPLICATE ARCHITECTURE

There must not be:

```text
Local RBAC
+
Supabase RBAC
```

or:

```text
Local transaction ledger
+
Cloud transaction ledger
```

or:

```text
Real P2P
+
Fake sync layer
```

or:

```text
Two competing permission services
```

There must be one authoritative implementation for each responsibility.

---

# 93 — FINAL RESPONSIBILITY MODEL

```text
┌──────────────────────────────────────────────┐
│                  POS APP                     │
├──────────────────────────────────────────────┤
│ React + Vite + TypeScript                    │
│ UI + Domain + Business Services              │
├──────────────────────────────────────────────┤
│ Local Authorization Service                  │
│ Users + Roles + Permissions + Device Trust   │
├──────────────────────────────────────────────┤
│ Local SQLite                                 │
│ Business Data + Transactions + Audit         │
├──────────────────────────────────────────────┤
│ Event Ledger + Outbox + Inbox                │
│ Durable Change / Sync State                  │
├──────────────────────────────────────────────┤
│ WebRTC P2P                                   │
│ Business Data Synchronization                │
├──────────────────────────────────────────────┤
│ Supabase                                     │
│ Signaling / Presence ONLY                    │
└──────────────────────────────────────────────┘
```

---

# 94 — FINAL GOLDEN RULES

```text
ADMIN = CONTROL

MANAGER = OPERATE

CASHIER = CHECKOUT

SALESMAN = SELL + TRACK SALES
```

```text
LOCAL SQLITE
= BUSINESS DATA AUTHORITY
```

```text
LOCAL AUTHORIZATION SERVICE
= RBAC AUTHORITY
```

```text
EVENT LEDGER
= CHANGE AUTHORITY
```

```text
WEBRTC P2P
= BUSINESS DATA SYNC
```

```text
SUPABASE
= SIGNALING ONLY
```

```text
UI CHECK
= UX
```

```text
BUSINESS-LAYER CHECK
= SECURITY
```

```text
UNKNOWN AUTHORIZATION
= DENY
```

```text
BUSINESS ACTION
=
AUTHORIZATION
+
VALIDATION
+
TRANSACTION
+
EFFECTS
+
AUDIT
+
EVENT
+
OUTBOX
```

```text
SUCCESS
=
ALL REQUIRED EFFECTS COMMIT
```

```text
FAILURE
=
ZERO EFFECTS
```

```text
REVERSE
=
EXACT OPPOSITE EFFECTS
```

```text
DUPLICATE EVENT
=
APPLY ONCE
```

```text
INVENTORY / FINANCE
=
NEVER LWW
```

```text
USER HISTORY
=
PRESERVE
```

```text
FINANCIAL HISTORY
=
REVERSE, NEVER DESTRUCTIVELY DELETE
```

```text
NORMAL SYNC
=
MISSING CHANGES ONLY
```

```text
INITIAL JOIN
=
AUTHORIZED BOOTSTRAP
```

---

# 95 — FINAL IMPLEMENTATION COMMAND

The implementation MUST modify the existing POS architecture.

It MUST NOT create a parallel POS, RBAC, transaction, database, or synchronization system.

First inspect the complete existing implementation.

Then:

```text
INSPECT
 ↓
PLAN
 ↓
MIGRATE
 ↓
IMPLEMENT
 ↓
TEST
 ↓
RECONCILE
 ↓
VERIFY
 ↓
REPORT
```

Every change must preserve existing valid business functionality while moving authority to the final local-first architecture.

The final application must be:

```text
OFFLINE-FIRST
LOCAL-AUTHORITATIVE
P2P-SYNCHRONIZED
TRANSACTION-SAFE
RBAC-CENTRALIZED
AUDITABLE
IDEMPOTENT
FAIL-CLOSED
```

There must be no fake security, fake synchronization, fake database behavior, hidden cloud authority, duplicate RBAC, partial financial transactions, destructive financial history deletion, or LWW-based financial/inventory reconciliation.

---

# CREDIT / UDHAR SYSTEM — Complete RBAC & Flow Reference

## Credit System Overview

Credit (Udhar) allows customers to take goods without immediate payment. The outstanding balance is tracked as a receivable in `customer_ledger` and `customers.current_balance`.

## Global Settings (Settings → General)

| Setting | Key | Scope | P2P |
|---|---|---|---|
| Enable Credit Sales | `enableCreditSales` | Global toggle | ✅ SHAREABLE |
| Cashier Can Give Credit | `cashierCanCredit` | Restrict by role | ✅ SHAREABLE |

Both settings are SHAREABLE — they sync to all devices via P2P outbox.

## RBAC Permission Matrix

| Action | Admin | Manager | Cashier | Salesman |
|---|---|---|---|---|
| Enable Credit Sales (setting) | ✅ | ❌ | ❌ | ❌ |
| Cashier Can Give Credit (setting) | ✅ | ❌ | ❌ | ❌ |
| Create Credit Sale | ✅ | ✅ | ✅ (if cashierCanCredit=ON) | ✅ (if cashierCanCredit=ON) |
| Receive Customer Payment | ✅ | ✅ | ❌ | ❌ |
| View Customer Ledger | ✅ | ✅ | ✅ (own sales) | ❌ |
| View Credit in Financial Report | ✅ | ✅ | ❌ | ❌ |

## Credit Button Visibility Rules

```text
isCreditAllowed = true IF:
  1. appSettings.enableCreditSales === true
  2. customer is selected (appSelectedCustomer?.id is set)
  3. role !== 'cashier' OR appSettings.cashierCanCredit === true
```

Credit button appears in Settlement modal ONLY when all 3 conditions are met.

## Credit Sale Flow (Day 1)

```text
Cashier selects customer → opens Settlement modal
  → selects "Credit" payment method
  → clicks Process Payment

System executes atomic SQLite transaction:
  1. INSERT sales (payment_method = 'credit', status = 'completed')
  2. INSERT sale_items
  3. INSERT inventory_transactions (INVENTORY_OUT) per item
  4. UPDATE products.stock (recomputed from ledger)
  5. INSERT payments (mode_id = 'credit', sale_id = sale.id)
  6. ⚡ payment_modes.balance NOT updated (credit ≠ physical cash)
  7. INSERT customer_ledger (type = 'sale', amount = total, balance_after = new_balance)
  8. UPDATE customers.current_balance += total
  9. INSERT sync_outbox (entityType = 'SALE', payload includes paymentMethod='credit')
```

P2P: Remote device receives SALE event → salesEventHandlers.ts applies steps 1-8 identically.

## Credit Repayment Flow (Day N)

```text
Admin/Manager → Customers page → Customer card → "Receive Payment"
  → enters amount + payment mode (cash/card/online)
  → submits

System executes atomic SQLite transaction:
  1. INSERT customer_ledger (type = 'payment', amount = repayment, balance_after = new_balance)
  2. UPDATE customers.current_balance -= repayment
  3. INSERT payments (sale_id = NULL, mode_id = repayment_mode, customer_id = customer.id)
  4. UPDATE payment_modes.balance += repayment (for actual payment mode)
  5. INSERT sync_outbox (entityType = 'CUSTOMER_LEDGER', eventType = 'CUSTOMER_PAYMENT')
```

P2P: Remote device receives CUSTOMER_LEDGER event → customerEventHandlers.ts applies steps 1-4.

## Financial Report Credit Display

| Report Section | What Shows | Day |
|---|---|---|
| Sales page "Payment: Credit" filter | All credit sales | Sale day |
| Financial → Credit wallet card | Credit Given (total receivables) | Sale day |
| Financial → Cash wallet card | Credit Received (repayments received in cash) | Repayment day |
| Customers → Ledger tab | Full debit/credit history | Both days |
| Overview → Total Revenue | Credit sales included | Sale day |

## Wallet Balance Rules

```text
Credit sale:         Cash wallet = 0 change, Credit receivable +amount
Credit repayment:    Cash wallet +repayment_amount, Credit receivable -repayment_amount
```

Credit wallet balance = Σ(credit sales) − Σ(credit repayments) = Outstanding receivable

## P2P Sync Verification Checklist

After any credit-related change, verify:
- [ ] Credit sale on Device A → Device B shows customer balance updated
- [ ] Credit sale on Device A → Device B customer_ledger has entry
- [ ] Credit repayment on Device A → Device B customer balance decreases
- [ ] Credit repayment on Device A → Device B payments table has entry (sale_id NULL)
- [ ] Financial report: Credit wallet shows correct amount on both devices
- [ ] Sales filter: "Credit" option visible when enableCreditSales = ON
