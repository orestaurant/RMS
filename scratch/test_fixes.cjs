// Verification of coordinate validation & logic

function isValidCoord(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false
  const nLat = Number(lat)
  const nLng = Number(lng)
  if (isNaN(nLat) || isNaN(nLng)) return false
  if (nLat === 0 && nLng === 0) return false
  if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) return false
  return Math.abs(nLat) > 0.0001 || Math.abs(nLng) > 0.0001
}

const testCases = [
  { lat: 0, lng: 0, expected: false, name: 'Null Island (0, 0)' },
  { lat: null, lng: null, expected: false, name: 'Null coordinates' },
  { lat: undefined, lng: undefined, expected: false, name: 'Undefined coordinates' },
  { lat: 26.8467, lng: 80.9462, expected: true, name: 'Valid Lucknow GPS' },
  { lat: 28.6139, lng: 77.2090, expected: true, name: 'Valid Delhi GPS' },
  { lat: 100, lng: 80, expected: false, name: 'Out of range latitude (>90)' },
  { lat: 26.8, lng: 200, expected: false, name: 'Out of range longitude (>180)' },
  { lat: '0', lng: '0', expected: false, name: 'String zero ("0", "0")' },
  { lat: '26.8467', lng: '80.9462', expected: true, name: 'Valid String GPS' },
]

let allPassed = true
for (const tc of testCases) {
  const result = isValidCoord(tc.lat, tc.lng)
  if (result !== tc.expected) {
    console.error(`❌ FAILED: ${tc.name} -> got ${result}, expected ${tc.expected}`)
    allPassed = false
  } else {
    console.log(`✅ PASSED: ${tc.name}`)
  }
}

if (allPassed) {
  console.log('\nAll coordinate validation test cases passed successfully!')
} else {
  process.exit(1)
}

