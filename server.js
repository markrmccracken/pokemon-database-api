// server.js - Production Pokemon Database API
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'pokemondb',
  process.env.DB_USER || 'pokemonapi',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Pokemon Model
const Pokemon = sequelize.define('Pokemon', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  species: {
    type: DataTypes.STRING,
    allowNull: false
  },
  types: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false
  },
  height: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  abilities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  baseStats: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  generation: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  evolutionChain: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: []
  },
  habitat: {
    type: DataTypes.STRING,
    defaultValue: 'Unknown'
  },
  captureRate: {
    type: DataTypes.INTEGER,
    defaultValue: 45
  },
  baseExperience: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  genderRatio: {
    type: DataTypes.JSONB,
    defaultValue: { male: 50, female: 50 }
  },
  eggGroups: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: ['Field']
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sprite: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'pokemon',
  timestamps: true
});

// Type Model
const Type = sequelize.define('Type', {
  name: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  weaknesses: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  strengths: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  immunities: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  }
}, {
  tableName: 'types',
  timestamps: false
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for development
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: { 
    error: 'Too many requests',
    message: 'Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Utility functions
const paginate = (query, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return {
    ...query,
    offset,
    limit: Math.min(limit, 100) // Max 100 items per page
  };
};

const buildWhereClause = (filters) => {
  const where = {};
  
  if (filters.name) {
    where.name = { [Sequelize.Op.iLike]: `%${filters.name}%` };
  }
  
  if (filters.type) {
    where.types = { [Sequelize.Op.contains]: [filters.type] };
  }
  
  if (filters.generation) {
    where.generation = parseInt(filters.generation);
  }
  
  if (filters.minStats || filters.maxStats) {
    const statsFilter = {};
    if (filters.minStats) {
      statsFilter[Sequelize.Op.gte] = parseInt(filters.minStats);
    }
    if (filters.maxStats) {
      statsFilter[Sequelize.Op.lte] = parseInt(filters.maxStats);
    }
    where['baseStats.total'] = statsFilter;
  }
  
  return where;
};

// Routes

// API Documentation
app.get('/', (req, res) => {
  res.json({
    name: "Pokémon Database API",
    version: "1.0.0",
    description: "A comprehensive RESTful API for Pokémon data",
    server: {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    },
    endpoints: {
      pokemon: {
        "GET /api/v1/pokemon": "Get all Pokémon with pagination and filtering",
        "GET /api/v1/pokemon/:id": "Get a specific Pokémon by ID",
        "POST /api/v1/pokemon": "Create a new Pokémon entry",
        "PUT /api/v1/pokemon/:id": "Update a Pokémon entry",
        "DELETE /api/v1/pokemon/:id": "Delete a Pokémon entry"
      },
      types: {
        "GET /api/v1/types": "Get all Pokémon types",
        "GET /api/v1/types/:name": "Get specific type information"
      },
      search: {
        "GET /api/v1/search": "Search Pokémon by various criteria"
      },
      health: {
        "GET /health": "Health check endpoint"
      }
    },
    documentation: `${req.protocol}://${req.get('host')}/docs`
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: 'connected',
      version: '1.0.0',
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Get all Pokémon
app.get('/api/v1/pokemon', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'id', order = 'ASC', ...filters } = req.query;
    
    const whereClause = buildWhereClause(filters);
    const queryOptions = paginate({
      where: whereClause,
      order: [[sort, order.toUpperCase()]]
    }, parseInt(page), parseInt(limit));
    
    const { count, rows } = await Pokemon.findAndCountAll(queryOptions);
    
    const totalPages = Math.ceil(count / parseInt(limit));
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1
      },
      meta: {
        filters,
        sort,
        order,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// Get specific Pokémon
app.get('/api/v1/pokemon/:id', async (req, res) => {
  try {
    const pokemon = await Pokemon.findByPk(req.params.id);
    
    if (!pokemon) {
      return res.status(404).json({
        success: false,
        error: "Pokémon not found",
        message: `No Pokémon found with ID ${req.params.id}`
      });
    }
    
    res.json({
      success: true,
      data: pokemon,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching Pokemon:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// Create new Pokémon
app.post('/api/v1/pokemon', async (req, res) => {
  try {
    const pokemonData = req.body;
    
    // Calculate total stats
    if (pokemonData.baseStats && typeof pokemonData.baseStats === 'object') {
      pokemonData.baseStats.total = Object.values(pokemonData.baseStats)
        .reduce((sum, stat) => sum + (typeof stat === 'number' ? stat : 0), 0);
    }
    
    const pokemon = await Pokemon.create(pokemonData);
    
    res.status(201).json({
      success: true,
      data: pokemon,
      message: "Pokémon created successfully"
    });
  } catch (error) {
    console.error('Error creating Pokemon:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        message: error.errors.map(e => e.message).join(', ')
      });
    }
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// Update Pokémon
app.put('/api/v1/pokemon/:id', async (req, res) => {
  try {
    const pokemon = await Pokemon.findByPk(req.params.id);
    
    if (!pokemon) {
      return res.status(404).json({
        success: false,
        error: "Pokémon not found",
        message: `No Pokémon found with ID ${req.params.id}`
      });
    }
    
    const updateData = req.body;
    
    // Recalculate total stats if baseStats were updated
    if (updateData.baseStats && typeof updateData.baseStats === 'object') {
      updateData.baseStats.total = Object.values(updateData.baseStats)
        .reduce((sum, stat) => sum + (typeof stat === 'number' ? stat : 0), 0);
    }
    
    await pokemon.update(updateData);
    
    res.json({
      success: true,
      data: pokemon,
      message: "Pokémon updated successfully"
    });
  } catch (error) {
    console.error('Error updating Pokemon:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// Delete Pokémon
app.delete('/api/v1/pokemon/:id', async (req, res) => {
  try {
    const pokemon = await Pokemon.findByPk(req.params.id);
    
    if (!pokemon) {
      return res.status(404).json({
        success: false,
        error: "Pokémon not found",
        message: `No Pokémon found with ID ${req.params.id}`
      });
    }
    
    await pokemon.destroy();
    
    res.json({
      success: true,
      data: pokemon,
      message: "Pokémon deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting Pokemon:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// Get all types
app.get('/api/v1/types', async (req, res) => {
  try {
    const types = await Type.findAll();
    
    res.json({
      success: true,
      data: types,
      meta: {
        totalTypes: types.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching types:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// Search endpoint
app.get('/api/v1/search', async (req, res) => {
  try {
    const { q, ...filters } = req.query;
    
    let whereClause = buildWhereClause(filters);
    
    if (q) {
      whereClause = {
        ...whereClause,
        [Sequelize.Op.or]: [
          { name: { [Sequelize.Op.iLike]: `%${q}%` } },
          { species: { [Sequelize.Op.iLike]: `%${q}%` } },
          { description: { [Sequelize.Op.iLike]: `%${q}%` } }
        ]
      };
    }
    
    const results = await Pokemon.findAll({ where: whereClause });
    
    res.json({
      success: true,
      data: results,
      meta: {
        query: { q, ...filters },
        resultCount: results.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in search:', error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : "Something went wrong!"
  });
});

// Database initialization and server start
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database (create tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database synchronized successfully.');
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Pokémon API Server running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;
