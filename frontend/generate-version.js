const fs = require('fs');
const path = require('path');

const versionFile = path.join(__dirname, 'src', 'version.json');

// Read existing version or start at 1
let version = { build: 1 };
if (fs.existsSync(versionFile)) {
  try {
    version = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
  } catch (e) {
    console.warn('Could not read version file, starting from build 1');
  }
}

// Increment build number
version.build = (version.build || 0) + 1;
version.timestamp = new Date().toISOString();

// Write updated version
fs.writeFileSync(versionFile, JSON.stringify(version, null, 2));

console.log(`Build #${version.build} generated at ${version.timestamp}`);