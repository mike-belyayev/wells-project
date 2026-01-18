// src/diagnostic.js
const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNOSTIC: Searching for malformed routes...\n');

const routeFiles = [
  'userRoutes.js',
  'passengerRoutes.js', 
  'tripRoutes.js',
  'siteRoutes.js'
];

const routesDir = path.join(__dirname, 'routes');

let totalErrors = 0;

routeFiles.forEach(fileName => {
  const filePath = path.join(routesDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`📄 ${fileName}: File not found`);
    return;
  }
  
  console.log(`\n=== Checking: ${fileName} ===`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Look for problematic route patterns line by line
    lines.forEach((line, lineNumber) => {
      // Check for router.get('/:'), router.post('/:'), etc.
      const routePatterns = [
        /router\.(get|post|put|delete|patch|route|options|head)\(\s*['"`]\//g,
        /app\.(get|post|put|delete|patch|route|options|head)\(\s*['"`]\//g
      ];
      
      routePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          // Extract the route string
          const start = match.index + match[0].length;
          let quoteChar = line[start - 1]; // ', ", or `
          let routeString = '';
          let i = start;
          let inEscape = false;
          
          while (i < line.length) {
            const char = line[i];
            
            if (inEscape) {
              routeString += char;
              inEscape = false;
            } else if (char === '\\') {
              inEscape = true;
            } else if (char === quoteChar) {
              break;
            } else {
              routeString += char;
            }
            i++;
          }
          
          // Check if route contains malformed parameter
          if (routeString.includes('/:') && !routeString.includes('/: ')) {
            const afterColon = routeString.split('/:')[1];
            if (!afterColon || afterColon.match(/^[^a-zA-Z0-9_]/)) {
              console.log(`   ❌ Line ${lineNumber + 1}: Found malformed route`);
              console.log(`       Pattern: ${match[0]}...`);
              console.log(`       Route: "${routeString}"`);
              console.log(`       Issue: Missing parameter name after :`);
              totalErrors++;
            }
          }
        }
      });
    });
    
    if (totalErrors === 0) {
      console.log(`   ✅ ${fileName}: No obvious malformed routes found`);
    }
    
  } catch (error) {
    console.log(`   💥 Error reading ${fileName}: ${error.message}`);
  }
});

console.log('\n' + '='.repeat(50));
if (totalErrors > 0) {
  console.log(`🔴 Found ${totalErrors} malformed route(s)`);
  console.log('\n🔧 Common fixes:');
  console.log('   Change router.get(\'/:\') to router.get(\'/:id\')');
  console.log('   Change router.route(\'/:\') to router.route(\'/:id\')');
} else {
  console.log('✅ No malformed routes found in file scanning');
  console.log('\n💡 The issue might be:');
  console.log('   1. A syntax error in a route file');
  console.log('   2. A missing or extra character');
  console.log('   3. Try running: node -c src/routes/userRoutes.js');
}