## Applications Loading & Sync Flow

```mermaid
flowchart TD
    subgraph AdminAuth
        A1[Admin opens dashboard] --> A2[/auth/login POST]
        A2 --> A3[Session cookie issued]
    end

    subgraph DiscoverySync
        S1[Admin clicks “Sync Apps”] --> S2[/api/applications/sync POST]
        S2 -->|verify admin session| S3[discoverApps()]
        S3 --> S4[syncAppsToDatabase()]
        S4 --> S5[Firestore applications collection]
        S4 --> L4[writeLog apps.sync.*]
    end

    subgraph Firestore
        F1[(applications)]
    end
    S5 --> F1

    subgraph APIs
        P1[/api/applications GET]
        P1 -->|role check| P2[Query Firestore with optional filters]
        P2 --> P3[Supervisor filter if needed]
        P3 --> L1[writeLog applications.list.*]

        Q1[/api/applications/{id} GET/PUT/DELETE]
        Q1 -->|role check| Q2[Read/update/delete doc]
        Q2 --> L2[writeLog applications.get/update/delete]

        R1[/api/applications/sync GET]
        R1 -->|admin check| R2[discoverApps() only]
        R2 --> L3[writeLog apps.sync.status]
    end
    P2 --> F1
    Q2 --> F1
    R2 --> S3

    subgraph AdminUI
        U1[Applications page mounts] --> U2[fetch('/api/applications')]
        U2 --> U3[Render stats/cards]
        U3 --> U4[User actions\n(create/update/delete)]
        U4 -->|POST/PUT/DELETE| Q1
        U4 -->|Sync button| S1
        Q1 -->|success| U5[Refetch list]
        U5 --> U2
    end
```

