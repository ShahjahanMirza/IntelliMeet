// Basic test script for API endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8001';

// Test data
const testRoom = {
  title: 'Test Meeting Room',
  description: 'This is a test room',
  maxParticipants: 5
};

const testParticipant = {
  participantName: 'Test User',
  password: ''
};

async function runTests() {
  console.log('🚀 Starting API tests...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();

    if (healthResponse.ok && healthData.status === 'OK') {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed');
    }

    // Test 2: Create room
    console.log('\n2️⃣  Testing room creation...');
    const createResponse = await fetch(`${BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRoom)
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create room: ${createResponse.status}`);
    }

    const roomData = await createResponse.json();
    console.log('✅ Room created successfully');
    console.log(`   Room ID: ${roomData.id}`);
    console.log(`   Room Title: ${roomData.title}`);

    // Test 3: Get room details
    console.log('\n3️⃣  Testing room details...');
    const getRoomResponse = await fetch(`${BASE_URL}/api/rooms/${roomData.id}`);

    if (getRoomResponse.ok) {
      const roomDetails = await getRoomResponse.json();
      console.log('✅ Room details retrieved successfully');
      console.log(`   Participants: ${roomDetails.participantCount || 0}/${roomDetails.maxParticipants}`);
    } else {
      console.log('❌ Failed to get room details');
    }

    // Test 4: Join room
    console.log('\n4️⃣  Testing room join...');
    testParticipant.roomId = roomData.id;

    const joinResponse = await fetch(`${BASE_URL}/api/rooms/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testParticipant)
    });

    if (joinResponse.ok) {
      const joinData = await joinResponse.json();
      console.log('✅ Successfully joined room');
      console.log(`   Participant ID: ${joinData.participant.id}`);
      console.log(`   Is Host: ${joinData.participant.isHost}`);

      // Test 5: Get participants
      console.log('\n5️⃣  Testing participants list...');
      const participantsResponse = await fetch(`${BASE_URL}/api/participants/room/${roomData.id}`);

      if (participantsResponse.ok) {
        const participantsData = await participantsResponse.json();
        console.log('✅ Participants retrieved successfully');
        console.log(`   Total participants: ${participantsData.participants.length}`);
        participantsData.participants.forEach((p, index) => {
          console.log(`   ${index + 1}. ${p.name} ${p.isHost ? '(Host)' : ''}`);
        });
      } else {
        console.log('❌ Failed to get participants');
      }

      // Test 6: Leave room
      console.log('\n6️⃣  Testing room leave...');
      const leaveResponse = await fetch(`${BASE_URL}/api/rooms/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantId: joinData.participant.id })
      });

      if (leaveResponse.ok) {
        console.log('✅ Successfully left room');
      } else {
        console.log('❌ Failed to leave room');
      }

      // Test 7: Check timeout
      console.log('\n7️⃣  Testing timeout check...');
      const timeoutResponse = await fetch(`${BASE_URL}/api/rooms/${roomData.id}/timeout`);

      if (timeoutResponse.ok) {
        const timeoutData = await timeoutResponse.json();
        console.log('✅ Timeout check successful');
        console.log(`   Should close: ${timeoutData.shouldClose}`);
        console.log(`   Remaining minutes: ${timeoutData.remainingMinutes}`);
      } else {
        console.log('❌ Timeout check failed');
      }

    } else {
      console.log('❌ Failed to join room');
      const errorData = await joinResponse.json();
      console.log(`   Error: ${errorData.message}`);
    }

    console.log('\n🎉 API tests completed!');

  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🔍 Testing error handling...\n');

  try {
    // Test invalid room ID
    console.log('Testing invalid room ID...');
    const invalidResponse = await fetch(`${BASE_URL}/api/rooms/invalid-room-id`);

    if (invalidResponse.status === 404) {
      console.log('✅ Invalid room ID handled correctly');
    } else {
      console.log('❌ Invalid room ID not handled properly');
    }

    // Test missing required fields
    console.log('\nTesting missing required fields...');
    const missingFieldsResponse = await fetch(`${BASE_URL}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (missingFieldsResponse.status === 400) {
      console.log('✅ Missing fields validation working');
    } else {
      console.log('❌ Missing fields validation not working');
    }

    // Test rate limiting (if enabled)
    console.log('\nTesting rate limiting...');
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(fetch(`${BASE_URL}/api/health`));
    }

    const results = await Promise.all(promises);
    const rateLimited = results.some(r => r.status === 429);

    if (rateLimited) {
      console.log('✅ Rate limiting is working');
    } else {
      console.log('ℹ️  Rate limiting not triggered (this is okay)');
    }

  } catch (error) {
    console.error('Error testing error handling:', error.message);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Running performance tests...\n');

  try {
    const startTime = Date.now();
    const promises = [];

    // Create multiple rooms simultaneously
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: `Performance Test Room ${i + 1}`,
            maxParticipants: 3
          })
        })
      );
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();

    const successful = results.filter(r => r.ok).length;
    console.log(`✅ Created ${successful}/5 rooms in ${endTime - startTime}ms`);

    if (successful === 5 && (endTime - startTime) < 2000) {
      console.log('✅ Performance test passed');
    } else {
      console.log('⚠️  Performance could be improved');
    }

  } catch (error) {
    console.error('Performance test failed:', error.message);
  }
}

// Run all tests
async function main() {
  console.log('='.repeat(50));
  console.log('🧪 MeetClone API Test Suite');
  console.log('='.repeat(50));

  await runTests();
  await testErrorHandling();
  await performanceTest();

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary Complete');
  console.log('='.repeat(50));
}

// Check if server is running first
async function checkServerStatus() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, { timeout: 5000 });
    if (response.ok) {
      return true;
    }
  } catch (error) {
    console.error('❌ Server is not running or not accessible');
    console.error('   Please start the server with: npm run dev');
    console.error(`   Expected server at: ${BASE_URL}`);
    return false;
  }
  return false;
}

// Entry point
checkServerStatus().then(serverRunning => {
  if (serverRunning) {
    main();
  } else {
    process.exit(1);
  }
});
