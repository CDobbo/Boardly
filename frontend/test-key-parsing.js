// Test key parsing logic locally
const testKey = "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC\\nXXXXXX\\n-----END PRIVATE KEY-----";

console.log('Original key:');
console.log('Length:', testKey.length);
console.log('First 100:', testKey.substring(0, 100));
console.log('Includes \\n:', testKey.includes('\\n'));
console.log('Includes newlines:', testKey.includes('\n'));

let privateKey = testKey.trim();

// Remove quotes (none in this test)
while ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
       (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
  privateKey = privateKey.slice(1, -1).trim();
}

console.log('\nAfter quote removal:');
console.log('Length:', privateKey.length);
console.log('First 100:', privateKey.substring(0, 100));

// Replace escaped newlines
privateKey = privateKey
  .replace(/\\\\n/g, '\n')  // double escaped
  .replace(/\\n/g, '\n')    // single escaped
  .replace(/\\\n/g, '\n');  // backslash before actual newline

console.log('\nAfter newline replacement:');
console.log('Length:', privateKey.length);
console.log('First 100:', privateKey.substring(0, 100));
console.log('Includes newlines:', privateKey.includes('\n'));
console.log('Number of newlines:', (privateKey.match(/\n/g) || []).length);

console.log('\nFinal key structure:');
console.log(privateKey);