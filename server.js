const express = require('express');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = 4874;

// JSON body parser
app.use(express.json());

// Helper to get base URL from request
function getBaseUrl(req) {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

// Root URL handler - return marketplace.json for Claude Code, index.html for browsers
app.get('/', (req, res, next) => {
  // Check if request accepts JSON (Claude Code) or HTML (browser)
  const acceptHeader = req.headers.accept || '';

  // If client wants JSON or doesn't accept HTML, return marketplace.json
  if (acceptHeader.includes('application/json') || !acceptHeader.includes('text/html')) {
    try {
      const marketplace = getMarketplaceData();
      const baseUrl = getBaseUrl(req);

      // Convert to proper source format for Claude Code
      const result = {
        ...marketplace,
        plugins: marketplace.plugins.map(plugin => {
          // Get git URL from .git/config (HTTPS format)
          let gitUrl = getPluginGitUrl(plugin.name);

          // Convert SSH URL to HTTPS if needed
          if (gitUrl && gitUrl.startsWith('git@github.com:')) {
            gitUrl = gitUrl.replace('git@github.com:', 'https://github.com/');
          }

          // Ensure .git extension for proper git clone
          if (gitUrl && !gitUrl.endsWith('.git')) {
            gitUrl = gitUrl + '.git';
          }

          return {
            name: plugin.name,
            description: plugin.description,
            source: gitUrl ? {
              source: "url",
              url: gitUrl
            } : plugin.source  // Fallback to original source if no git URL
          };
        })
      };

      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Otherwise, serve index.html
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// CORS for external access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  next();
});

const MARKETPLACE_PATH = path.join(__dirname, '.claude-plugin', 'marketplace.json');
const PLUGINS_DIR = path.join(__dirname, 'plugins');

// Ensure plugins directory exists
if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

// Read marketplace.json
function getMarketplaceData() {
  const data = fs.readFileSync(MARKETPLACE_PATH, 'utf8');
  return JSON.parse(data);
}

// Save marketplace.json
function saveMarketplaceData(data) {
  fs.writeFileSync(MARKETPLACE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Read plugin details
function getPluginDetails(pluginName) {
  const pluginPath = path.join(PLUGINS_DIR, pluginName, '.claude-plugin', 'plugin.json');
  if (fs.existsSync(pluginPath)) {
    const data = fs.readFileSync(pluginPath, 'utf8');
    return JSON.parse(data);
  }
  return null;
}

// Get plugin commands from commands folder
function getPluginCommands(pluginName) {
  const commandsDir = path.join(PLUGINS_DIR, pluginName, 'commands');
  const commands = [];

  if (fs.existsSync(commandsDir)) {
    const files = fs.readdirSync(commandsDir);
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const commandPath = path.join(commandsDir, file);
        const content = fs.readFileSync(commandPath, 'utf8');
        const name = file.replace('.md', '');

        // Extract description from frontmatter
        const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
        let description = '';
        if (frontmatterMatch) {
          const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
          if (descMatch) {
            description = descMatch[1].trim();
          }
        }

        commands.push({ name, description });
      }
    });
  }

  return commands;
}

// Get plugin skills from skills folder
function getPluginSkills(pluginName) {
  const skillsDir = path.join(PLUGINS_DIR, pluginName, 'skills');
  const skills = [];

  if (fs.existsSync(skillsDir)) {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    entries.forEach(entry => {
      if (entry.isDirectory()) {
        const skillJsonPath = path.join(skillsDir, entry.name, 'SKILL.md');
        const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');

        // Try to get description from SKILL.md frontmatter
        let description = '';
        if (fs.existsSync(skillMdPath)) {
          const content = fs.readFileSync(skillMdPath, 'utf8');
          const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
          if (frontmatterMatch) {
            const descMatch = frontmatterMatch[1].match(/description:\s*(.+)/);
            if (descMatch) {
              description = descMatch[1].trim();
            }
          }
        }

        skills.push({ name: entry.name, description });
      }
    });
  }

  return skills;
}

// Extract plugin name from git URL
function extractPluginName(gitUrl) {
  const match = gitUrl.match(/\/([^\/]+?)(\.git)?$/);
  return match ? match[1].replace('.git', '') : null;
}

// Get git remote URL from plugin's .git/config
function getPluginGitUrl(pluginName) {
  const gitConfigPath = path.join(PLUGINS_DIR, pluginName, '.git', 'config');
  if (fs.existsSync(gitConfigPath)) {
    const config = fs.readFileSync(gitConfigPath, 'utf8');
    const urlMatch = config.match(/url\s*=\s*(.+)/);
    if (urlMatch) {
      return urlMatch[1].trim();
    }
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
      const commands = getPluginCommands(plugin.name);
      const skills = getPluginSkills(plugin.name);
      const gitUrl = getPluginGitUrl(plugin.name);

      return {
        ...plugin,
        version: details?.version || '1.0.0',
        author: details?.author?.name || marketplace.owner?.name || 'Unknown',
        commands: commands,
        skills: skills,
        gitUrl: gitUrl
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

// API: Add plugin from git URL
app.post('/api/plugins', (req, res) => {
  try {
    const { gitUrl, name, description } = req.body;

    if (!gitUrl) {
      return res.status(400).json({ error: 'gitUrl is required' });
    }

    // Extract plugin name from URL if not provided
    const pluginName = name || extractPluginName(gitUrl);
    if (!pluginName) {
      return res.status(400).json({ error: 'Could not extract plugin name from URL. Please provide name explicitly.' });
    }

    const pluginPath = path.join(PLUGINS_DIR, pluginName);

    // Check if plugin already exists
    if (fs.existsSync(pluginPath)) {
      return res.status(409).json({ error: `Plugin '${pluginName}' already exists` });
    }

    // Clone the repository
    console.log(`Cloning ${gitUrl} to ${pluginPath}...`);
    execSync(`git clone "${gitUrl}" "${pluginPath}"`, { stdio: 'pipe' });

    // Read plugin.json to get description if not provided
    const details = getPluginDetails(pluginName);
    const pluginDescription = description || details?.description || 'No description';

    // Add to marketplace.json (gitUrl is NOT saved here to maintain Claude Code compatibility)
    const marketplace = getMarketplaceData();
    marketplace.plugins.push({
      name: pluginName,
      source: `./plugins/${pluginName}`,
      description: pluginDescription
    });
    saveMarketplaceData(marketplace);

    console.log(`Plugin '${pluginName}' added successfully`);
    res.status(201).json({
      message: `Plugin '${pluginName}' added successfully`,
      plugin: {
        name: pluginName,
        source: `./plugins/${pluginName}`,
        gitUrl: gitUrl,
        description: pluginDescription,
        version: details?.version || '1.0.0'
      }
    });
  } catch (error) {
    console.error('Error adding plugin:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Update plugin (git pull)
app.post('/api/plugins/:name/update', (req, res) => {
  try {
    const pluginName = req.params.name;
    const pluginPath = path.join(PLUGINS_DIR, pluginName);

    if (!fs.existsSync(pluginPath)) {
      return res.status(404).json({ error: `Plugin '${pluginName}' not found` });
    }

    // Check if it's a git repository
    const gitDir = path.join(pluginPath, '.git');
    if (!fs.existsSync(gitDir)) {
      return res.status(400).json({ error: `Plugin '${pluginName}' is not a git repository` });
    }

    // Pull latest changes
    console.log(`Updating plugin '${pluginName}'...`);
    execSync(`git -C "${pluginPath}" pull`, { stdio: 'pipe' });

    const details = getPluginDetails(pluginName);
    console.log(`Plugin '${pluginName}' updated successfully`);
    res.json({
      message: `Plugin '${pluginName}' updated successfully`,
      version: details?.version || '1.0.0'
    });
  } catch (error) {
    console.error('Error updating plugin:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// API: Remove plugin
app.delete('/api/plugins/:name', (req, res) => {
  try {
    const pluginName = req.params.name;
    const pluginPath = path.join(PLUGINS_DIR, pluginName);

    if (!fs.existsSync(pluginPath)) {
      return res.status(404).json({ error: `Plugin '${pluginName}' not found` });
    }

    // Remove plugin directory
    fs.rmSync(pluginPath, { recursive: true, force: true });

    // Remove from marketplace.json
    const marketplace = getMarketplaceData();
    marketplace.plugins = marketplace.plugins.filter(p => p.name !== pluginName);
    saveMarketplaceData(marketplace);

    console.log(`Plugin '${pluginName}' removed successfully`);
    res.json({ message: `Plugin '${pluginName}' removed successfully` });
  } catch (error) {
    console.error('Error removing plugin:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Serve .claude-plugin/marketplace.json for Claude Code
app.get('/.claude-plugin/marketplace.json', (req, res) => {
  try {
    const marketplace = getMarketplaceData();

    // Convert to proper source format for Claude Code
    const result = {
      ...marketplace,
      plugins: marketplace.plugins.map(plugin => {
        let gitUrl = getPluginGitUrl(plugin.name);

        // Convert SSH URL to HTTPS if needed
        if (gitUrl && gitUrl.startsWith('git@github.com:')) {
          gitUrl = gitUrl.replace('git@github.com:', 'https://github.com/');
        }

        // Ensure .git extension for proper git clone
        if (gitUrl && !gitUrl.endsWith('.git')) {
          gitUrl = gitUrl + '.git';
        }

        return {
          name: plugin.name,
          description: plugin.description,
          source: gitUrl ? {
            source: "url",
            url: gitUrl
          } : plugin.source
        };
      })
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve plugin files
app.use('/plugins', express.static(PLUGINS_DIR));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Claude Code Plugin Marketplace`);
  console.log(`  ==============================`);
  console.log(`  Local:    http://localhost:${PORT}`);
  console.log(`  Network:  http://<your-ip>:${PORT}`);
  console.log(`\n  API Endpoints:`);
  console.log(`  - GET    /api/marketplace          Marketplace info`);
  console.log(`  - GET    /api/plugins              Plugin list`);
  console.log(`  - GET    /api/plugins/:name        Plugin details`);
  console.log(`  - POST   /api/plugins              Add plugin from git URL`);
  console.log(`  - POST   /api/plugins/:name/update Update plugin (git pull)`);
  console.log(`  - DELETE /api/plugins/:name        Remove plugin`);
  console.log(`\n  Add Plugin Example:`);
  console.log(`  curl -X POST http://localhost:${PORT}/api/plugins \\`);
  console.log(`       -H "Content-Type: application/json" \\`);
  console.log(`       -d '{"gitUrl": "https://github.com/user/plugin-repo.git"}'`);
  console.log(`\n  Claude Code Registration:`);
  console.log(`  /plugin marketplace add http://<your-ip>:${PORT}/.claude-plugin/marketplace.json\n`);
});
