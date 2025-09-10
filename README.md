# Pokémon Database API

A comprehensive RESTful API for Pokémon data built with Node.js, Express, and PostgreSQL.

## 🌟 Features

- **RESTful API** - Full CRUD operations for Pokémon data
- **PostgreSQL Database** - Robust data persistence
- **Production Ready** - PM2 process management, Nginx reverse proxy
- **Secure** - HTTPS with Let's Encrypt SSL certificates
- **CORS Enabled** - Cross-origin resource sharing support
- **Rate Limited** - API protection against abuse
- **Comprehensive Data** - Pokémon stats, types, abilities, and more

## 🚀 Live API

**Base URL:** `https://api.ouismaisbon.com`

### Endpoints

- `GET /` - API documentation
- `GET /health` - Health check
- `GET /api/v1/pokemon` - Get all Pokémon (with pagination)
- `GET /api/v1/pokemon/:id` - Get specific Pokémon
- `POST /api/v1/pokemon` - Create new Pokémon
- `PUT /api/v1/pokemon/:id` - Update Pokémon
- `DELETE /api/v1/pokemon/:id` - Delete Pokémon
- `GET /api/v1/search` - Search Pokémon
- `GET /api/v1/types` - Get all types

### Query Parameters

- `?page=1&limit=20` - Pagination
- `?type=Electric` - Filter by type
- `?generation=1` - Filter by generation
- `?name=pikachu` - Filter by name
- `?sort=name&order=ASC` - Sorting

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt
- **Server:** Ubuntu 24.04 on Linode

## 📊 Example Usage

### Get all Pokémon
```bash
curl https://api.ouismaisbon.com/api/v1/pokemon

### Add a new Pokémon
curl -X POST https://api.ouismaisbon.com/api/v1/pokemon \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bulbasaur",
    "species": "Seed Pokémon",
    "types": ["Grass", "Poison"],
    "baseStats": {
      "hp": 45,
      "attack": 49,
      "defense": 49,
      "specialAttack": 65,
      "specialDefense": 65,
      "speed": 45
    },
    "generation": 1
  }'

### Search
curl "https://api.ouismaisbon.com/api/v1/search?q=electric"


