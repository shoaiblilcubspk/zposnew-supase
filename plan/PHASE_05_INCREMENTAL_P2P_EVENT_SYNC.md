# Phase 05: Incremental P2P Event Synchronization Engine

> **Reference:** `docs/LOCAL_FIRST_ARCHITECTURE.md`, `AGENTS.md` & `GEMINI.md`  
> **Mandate:** Incremental P2P event sync over WebRTC DataChannels. Supabase is strictly for signaling. Whole-database overwrites are forbidden.

---

## 1. Objectives & Scope

Implement the decentralized peer-to-peer event replication protocol. Terminals in the same shop discover each other via Supabase signaling, establish direct WebRTC DataChannels, and replicate missing business events incrementally using vector clocks and outbox queues.

---

## 2. 4 Golden Rules for Zero-Cloud-Cost & Connection Optimization

To ensure 100% compliance with Supabase free-tier limits with zero unexpected costs or leaked connections:
1. **Singleton Client Instance:** Always use a single cached `SupabaseClient` instance (`getSupabase()`). Never create multiple client instances across renders.
2. **Mandatory `useEffect` Cleanup:** Whenever a Realtime signaling channel is opened, unsubscribe cleanly in the unmount callback: `return () => { supabase.removeChannel(channel); };`.
3. **Database Realtime 100% OFF:** Realtime `postgres_changes` on database tables is strictly disabled. Supabase Realtime is used solely for broadcast signaling (`presence`, `webrtc_signal`).
4. **Binary Media over WebRTC:** Images and binary assets are transferred directly via WebRTC DataChannels, never via Supabase Storage or DB tables.

---

## 3. Incremental P2P Replication Protocol

```text
Terminal A (Online)                          Terminal B (Online)
       │                                            │
       │─────── Supabase Signaling Discovery ───────│
       │           (Presence Broadcast)             │
       │                                            │
       │◄══════ Establish WebRTC DataChannel ══════►│
       │                                            │
       │ 1. Vector Clock Exchange                   │
       │    "I have Device B up to seq: 104"        │
       │───────────────────────────────────────────►│
       │                                            │
       │ 2. Query Missing Delta Events              │
       │    SELECT * FROM sync_outbox               │
       │    WHERE sequence > 104                    │
       │                                            │
       │ 3. Send Delta Event Batch (105, 106, 107)  │
       │───────────────────────────────────────────►│
       │                                            │
       │                                 4. Validate & Apply
       │                                    • Check event_id idempotency
       │                                    • Validate device trust & key
       │                                    • Commit SQLite Transaction
       │                                    • Record in sync_inbox
       │                                            │
       │ 5. Send EVENT_ACK (seq: 107)               │
       │◄───────────────────────────────────────────│
       │                                            │
 6. Mark is_synced = 1 in Terminal A outbox         │
```

---

## 4. Deduplication & Idempotency Rules

1. **Unique `event_id`:** Every event is generated with a UUID-v4 identifier.
2. **Inbox Check:** Before applying an incoming event:
   ```sql
   SELECT 1 FROM sync_inbox WHERE event_id = ?;
   ```
   * If found: The event has already been applied. Immediately send an `EVENT_ACK` and do not re-execute the business logic.
3. **Sequence Ordering:** Events from the same source device are applied in strict ascending sequence order (`sequence = lastAppliedSeq + 1`).

---

## 5. Offline Operation & Standalone Mode

* **No Cloud Dependency:** If internet or Wi-Fi is unavailable, the terminal continues recording transactions locally in SQLite.
* **Outbox Accumulation:** Events accumulate in `sync_outbox` with `is_synced = 0`.
* **Automatic Drain:** As soon as a peer connects (over local Wi-Fi or WebRTC), the outbox worker drains pending events incrementally.

---

## 6. Verification & Acceptance Criteria

- [ ] Supabase client is a single cached singleton.
- [ ] No `postgres_changes` subscriptions exist on any database tables.
- [ ] Two terminals establish a direct WebRTC DataChannel.
- [ ] Terminal A sends only missing events (`sequence > remoteKnownSeq`) to Terminal B.
- [ ] Duplicate events are acknowledged without duplicate database mutations.
- [ ] Offline terminal accumulates outbox events and synchronizes automatically upon reconnection.
