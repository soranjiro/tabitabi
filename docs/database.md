# Database Schema

## ER Diagram

```mermaid
erDiagram
    itineraries ||--o{ steps : contains

    itineraries {
        TEXT id PK
        TEXT title
        TEXT theme_id
        TEXT memo
        TEXT password
        TEXT created_at
        TEXT updated_at
    }

    steps {
        TEXT id PK
        TEXT itinerary_id FK
        TEXT title
        TEXT date
        TEXT time
        TEXT location
        TEXT notes
        TEXT created_at
        TEXT updated_at
    }
```
