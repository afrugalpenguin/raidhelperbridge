import { getMockImportString, MOCK_PAYLOAD } from '../lib/mockData';
import { generateImportSummary } from '../lib/importGenerator';

console.log('=== Mock Import String ===');
console.log(getMockImportString());
console.log('');
console.log('=== Summary ===');
console.log(generateImportSummary(MOCK_PAYLOAD));
