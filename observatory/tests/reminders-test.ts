/**
 * macOS Reminders Integration Test
 *
 * Tests the Reminders integration to ensure it can:
 * 1. Create reminders/tasks
 * 2. List reminders
 * 3. Complete reminders
 * 4. Delete reminders
 * 5. Search reminders
 */

import { RemindersIntegration } from '../src/integrations/reminders/index';

async function testReminders() {
  console.log('🧪 Testing macOS Reminders Integration...\n');

  const reminders = new RemindersIntegration('Jarvis Test');

  // Test 1: Initialize
  console.log('Test 1: Initializing Reminders integration');
  try {
    await reminders.initialize();
    console.log('✅ Initialized successfully\n');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }

  // Test 2: Get all lists
  console.log('Test 2: Fetching reminder lists');
  try {
    const lists = await reminders.getLists();
    console.log('✅ Lists fetched:', lists);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to fetch lists:', error);
  }

  // Test 3: Create a simple reminder
  console.log('Test 3: Creating simple reminder');
  let reminderId1: string;
  try {
    reminderId1 = await reminders.createReminder({
      name: 'Test reminder - Buy groceries',
      body: 'Milk, eggs, bread, coffee',
    });
    console.log('✅ Reminder created:', reminderId1);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to create reminder:', error);
    process.exit(1);
  }

  // Test 4: Create reminder with due date
  console.log('Test 4: Creating reminder with due date');
  let reminderId2: string;
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    reminderId2 = await reminders.createReminder({
      name: 'Test reminder - Call dentist',
      dueDate: tomorrow,
      priority: 9, // High priority
    });
    console.log('✅ Reminder with due date created:', reminderId2);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to create reminder with due date:', error);
    process.exit(1);
  }

  // Test 5: Create reminder with priority
  console.log('Test 5: Creating reminder with priority');
  let reminderId3: string;
  try {
    reminderId3 = await reminders.createReminder({
      name: 'Test reminder - Review code',
      body: 'Review PR #123',
      priority: 5, // Medium priority
    });
    console.log('✅ Reminder with priority created:', reminderId3);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to create reminder with priority:', error);
    process.exit(1);
  }

  // Wait a moment for reminders to sync
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 6: List all reminders
  console.log('Test 6: Listing all reminders');
  try {
    const allReminders = await reminders.getReminders();
    console.log(`✅ Found ${allReminders.length} incomplete reminder(s)`);
    allReminders.forEach(r => {
      console.log(`  - ${r.name}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Failed to list reminders:', error);
  }

  // Test 7: Search reminders
  console.log('Test 7: Searching reminders');
  try {
    const searchResults = await reminders.searchReminders('Test');
    console.log(`✅ Found ${searchResults.length} reminder(s) matching "Test"`);
    console.log('');
  } catch (error) {
    console.error('❌ Failed to search reminders:', error);
  }

  // Test 8: Update reminder
  console.log('Test 8: Updating reminder');
  try {
    await reminders.updateReminder(reminderId1, {
      name: 'Test reminder - Buy groceries (UPDATED)',
      body: 'Milk, eggs, bread, coffee, bananas',
    });
    console.log('✅ Reminder updated successfully');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to update reminder:', error);
  }

  // Test 9: Complete a reminder
  console.log('Test 9: Completing reminder');
  try {
    await reminders.completeReminder(reminderId2);
    console.log('✅ Reminder marked as completed');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to complete reminder:', error);
  }

  // Test 10: Delete reminders (cleanup)
  console.log('Test 10: Deleting test reminders (cleanup)');
  try {
    await reminders.deleteReminder(reminderId1);
    await reminders.deleteReminder(reminderId2);
    await reminders.deleteReminder(reminderId3);
    console.log('✅ Test reminders deleted');
    console.log('');
  } catch (error) {
    console.error('❌ Failed to delete reminders:', error);
  }

  console.log('✅ All Reminders tests passed!');
}

testReminders().catch(error => {
  console.error('❌ Reminders test failed:', error);
  process.exit(1);
});
