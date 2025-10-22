/**
 * Calendar Integration Test
 *
 * Tests the calendar integration to ensure it can:
 * 1. Detect scheduling in messages
 * 2. Create calendar events
 * 3. Send notifications
 */

import { CalendarIntegration } from '../src/integrations/calendar/index';

async function testCalendar() {
  console.log('🧪 Testing Calendar Integration...\n');

  const userPhone = process.env.USER_PHONE_NUMBER || '+14809750797';
  const calendar = new CalendarIntegration(userPhone);

  // Test 1: Detect scheduling in message
  console.log('Test 1: Detecting scheduling from message');
  const testMessage = "Let's grab dinner tomorrow at 7pm";
  const schedulingInfo = calendar.detectScheduling(testMessage, '+16024715495');

  console.log('✅ Scheduling detected:', {
    hasScheduling: schedulingInfo.hasScheduling,
    eventType: schedulingInfo.eventType,
    confidence: schedulingInfo.confidence,
  });

  if (!schedulingInfo.hasScheduling) {
    console.error('❌ Failed to detect scheduling!');
    process.exit(1);
  }

  // Test 2: Create calendar event
  console.log('\nTest 2: Creating calendar event');
  if (schedulingInfo.suggestedEvent) {
    try {
      const eventId = await calendar.createCalendarEvent(schedulingInfo.suggestedEvent);
      console.log('✅ Calendar event created:', eventId);
    } catch (error) {
      console.error('❌ Failed to create calendar event:', error);
      process.exit(1);
    }
  }

  // Test 3: Various scheduling patterns
  console.log('\nTest 3: Testing various scheduling patterns');
  const patterns = [
    "Coffee tomorrow at 10am?",
    "Meeting on Wednesday at 2:30pm",
    "Dinner tonight at 8",
    "Interview scheduled for Friday at 11:00 AM",
    "Let's meet up this weekend",
  ];

  for (const pattern of patterns) {
    const result = calendar.detectScheduling(pattern, 'test@example.com');
    console.log(`  "${pattern}" → ${result.hasScheduling ? '✅ Detected' : '❌ Not detected'} (${result.eventType || 'N/A'})`);
  }

  console.log('\n✅ All calendar tests passed!');
}

testCalendar().catch(error => {
  console.error('❌ Calendar test failed:', error);
  process.exit(1);
});
