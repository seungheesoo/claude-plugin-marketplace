const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4874;

// JSON body parser
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// CORS for external access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Read marketplace.json
function getMarketplaceData() {
  const marketplacePath = path.join(__dirname, '.claude-plugin', 'marketplace.json');
  const data = fs.readFileSync(marketplacePath, 'utf8');
  return JSON.parse(data);
}

// Read plugin details
function getPluginDetails(pluginName) {
  const pluginPath = path.join(__dirname, 'plugins', pluginName, '.claude-plugin', 'plugin.json');
  if (fs.existsSync(pluginPath)) {
    const data = fs.readFileSync(pluginPath, 'utf8');
    return JSON.parse(data);
  }
  return null;
}

// API: Marketplace info
app.get('/api/marketplace', (req, res) => {
  try {
    const marketplace = getMarketplaceData();
    res.json(marketplace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Plugin list
app.get('/api/plugins', (req, res) => {
  try {
    const marketplace = getMarketplaceData();
    const plugins = marketplace.plugins.map(plugin => {
      const details = getPluginDetails(plugin.name);
      return {
        ...plugin,
        version: details?.version || '1.0.0',
        author: details?.author?.name || marketplace.owner?.name || 'Unknown',
        skills: details?.skills ? true : false,
        commands: details?.commands ? true : false
      };
    });
    res.json(plugins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Plugin details
app.get('/api/plugins/:name', (req, res) => {
  try {
    const pluginName = req.params.name;
    const details = getPluginDetails(pluginName);
    if (details) {
      res.json(details);
    } else {
      res.status(404).json({ error: 'Plugin not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve .claude-plugin/marketplace.json for Claude Code
app.get('/.claude-plugin/marketplace.json', (req, res) => {
  try {
    const marketplace = getMarketplaceData();
    res.json(marketplace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve plugin files
app.use('/plugins', express.static(path.join(__dirname, 'plugins')));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Claude Code Plugin Marketplace`);
  console.log(`  ==============================`);
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Network:  http://<your-ip>:${PORT}`);
  console.log(`\n  API Endpoints:`);
  console.log(`  - GET /api/marketplace    Marketplace info`);
  console.log(`  - GET /api/plugins        Plugin list`);
  console.log(`  - GET /api/plugins/:name  Plugin details`);
  console.log(`\n  Claude Code Registration:`);
  console.log(`  /plugin marketplace add http://<your-ip>:${PORT}/.claude-plugin/marketplace.json\n`);
});
