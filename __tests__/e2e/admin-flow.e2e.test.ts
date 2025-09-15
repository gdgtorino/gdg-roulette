/**
 * Admin Flow End-to-End Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Admin Flow E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();

    // Clear any existing authentication
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Admin Authentication Flow', () => {
    test('should complete full admin login flow', async () => {
      // Navigate to admin login
      await page.goto('/admin');

      // Should redirect to login page
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.locator('h1')).toContainText('Admin Login');

      // Fill login form
      await page.fill('[data-testid="username-input"]', 'admin1');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');

      // Submit login form
      await page.click('[data-testid="login-button"]', { force: true });

      // Wait for either navigation to dashboard or error message
      try {
        await page.waitForURL('/admin/dashboard', { timeout: 10000 });
      } catch (error) {
        // If navigation fails, check for error messages
        const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
        console.log('Login failed with error:', errorMessage);
        throw new Error(`Login did not redirect to dashboard. Error: ${errorMessage}`);
      }

      // Should redirect to admin dashboard
      await expect(page).toHaveURL('/admin/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText(
        'Welcome, admin1',
      );

      // Verify admin navigation menu is present
      await expect(page.locator('[data-testid="admin-nav"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-event-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="events-list"]')).toBeVisible();
    });

    test('should reject invalid login credentials', async () => {
      await page.goto('/admin/login');

      // Try with wrong credentials
      await page.fill('[data-testid="username-input"]', 'wronguser');
      await page.fill('[data-testid="password-input"]', 'wrongpass');
      await page.click('[data-testid="login-button"]');

      // Should show error and remain on login page
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Invalid credentials',
      );
      await expect(page).toHaveURL(/\/admin\/login/);
    });

    test('should validate required login fields', async () => {
      await page.goto('/admin/login');

      // Try to submit with empty fields
      await page.click('[data-testid="login-button"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="username-error"]')).toContainText(
        'Username is required',
      );
      await expect(page.locator('[data-testid="password-error"]')).toContainText(
        'Password is required',
      );

      // Should not redirect
      await expect(page).toHaveURL(/\/admin\/login/);
    });

    test('should persist session across page refreshes', async () => {
      // Login first
      await page.goto('/admin/login');
      await page.fill('[data-testid="username-input"]', 'admin1');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');

      await expect(page).toHaveURL('/admin/dashboard');

      // Refresh the page
      await page.reload();

      // Should still be on dashboard and logged in
      await expect(page).toHaveURL('/admin/dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText(
        'Welcome, admin1',
      );
    });

    test('should handle logout correctly', async () => {
      // Login first
      await page.goto('/admin/login');
      await page.fill('[data-testid="username-input"]', 'admin1');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');

      await expect(page).toHaveURL('/admin/dashboard');

      // Click logout
      await page.click('[data-testid="logout-button"]');

      // Should redirect to login and clear session
      await expect(page).toHaveURL(/\/admin\/login/);

      // Verify cannot access dashboard without authentication
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  });

  test.describe('Event Creation and Management Flow', () => {
    test.beforeEach(async () => {
      // Login as admin for each test
      await page.goto('/admin/login');
      await page.fill('[data-testid="username-input"]', 'admin1');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
      await expect(page).toHaveURL('/admin/dashboard');
    });

    test('should create new event successfully', async () => {
      // Click create event button
      await page.click('[data-testid="create-event-button"]');

      // Fill event creation form
      await page.fill('[data-testid="event-name-input"]', 'E2E Test Event');
      await page.fill('[data-testid="event-description-input"]', 'Test event for E2E testing');
      await page.fill('[data-testid="max-participants-input"]', '100');

      // Submit form
      await page.click('[data-testid="create-event-submit"]');

      // Should show success message and new event in list
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Event created successfully',
      );
      await expect(page.locator('[data-testid="events-list"]')).toContainText('E2E Test Event');

      // New event should be in INIT state
      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'E2E Test Event' });
      await expect(eventCard.locator('[data-testid="event-state"]')).toContainText('INIT');
    });

    test('should validate event creation form', async () => {
      await page.click('[data-testid="create-event-button"]');

      // Try to submit empty form
      await page.click('[data-testid="create-event-submit"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText(
        'Event name is required',
      );
      await expect(page.locator('[data-testid="description-error"]')).toContainText(
        'Description is required',
      );

      // Try with invalid max participants
      await page.fill('[data-testid="event-name-input"]', 'Test Event');
      await page.fill('[data-testid="event-description-input"]', 'Test description');
      await page.fill('[data-testid="max-participants-input"]', '-1');
      await page.click('[data-testid="create-event-submit"]');

      await expect(page.locator('[data-testid="max-participants-error"]')).toContainText(
        'Must be a positive number',
      );
    });

    test('should transition event through all states', async () => {
      // Create event first
      await page.click('[data-testid="create-event-button"]');
      await page.fill('[data-testid="event-name-input"]', 'State Transition Event');
      await page.fill('[data-testid="event-description-input"]', 'Testing state transitions');
      await page.click('[data-testid="create-event-submit"]');

      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'State Transition Event' });

      // Should start in INIT state
      await expect(eventCard.locator('[data-testid="event-state"]')).toContainText('INIT');

      // Transition to REGISTRATION
      await eventCard.locator('[data-testid="open-registration-button"]').click();
      await expect(eventCard.locator('[data-testid="event-state"]')).toContainText('REGISTRATION');
      await expect(eventCard.locator('[data-testid="registration-open-indicator"]')).toBeVisible();

      // Should show QR code and registration link
      await eventCard.locator('[data-testid="view-event-button"]').click();
      await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
      await expect(page.locator('[data-testid="registration-url"]')).toBeVisible();

      // Go back to dashboard
      await page.click('[data-testid="back-to-dashboard"]');

      // Transition to DRAW (after some participants register - mocked)
      await eventCard.locator('[data-testid="start-draw-button"]').click();

      // Should show confirmation dialog
      await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
      await page.click('[data-testid="confirm-start-draw"]');

      await expect(eventCard.locator('[data-testid="event-state"]')).toContainText('DRAW');
      await expect(eventCard.locator('[data-testid="draw-winners-button"]')).toBeVisible();

      // Transition to CLOSED (after drawing all participants)
      await eventCard.locator('[data-testid="close-event-button"]').click();
      await page.click('[data-testid="confirm-close-event"]');

      await expect(eventCard.locator('[data-testid="event-state"]')).toContainText('CLOSED');
    });

    test('should prevent invalid state transitions', async () => {
      // Create event
      await page.click('[data-testid="create-event-button"]');
      await page.fill('[data-testid="event-name-input"]', 'Invalid Transition Event');
      await page.fill('[data-testid="event-description-input"]', 'Testing invalid transitions');
      await page.click('[data-testid="create-event-submit"]');

      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Invalid Transition Event' });

      // In INIT state, should not be able to start draw directly
      await expect(eventCard.locator('[data-testid="start-draw-button"]')).not.toBeVisible();
      await expect(eventCard.locator('[data-testid="close-event-button"]')).not.toBeVisible();

      // Only "Open Registration" should be available
      await expect(eventCard.locator('[data-testid="open-registration-button"]')).toBeVisible();
    });

    test('should handle event deletion with confirmation', async () => {
      // Create event
      await page.click('[data-testid="create-event-button"]');
      await page.fill('[data-testid="event-name-input"]', 'Event to Delete');
      await page.fill('[data-testid="event-description-input"]', 'Will be deleted');
      await page.click('[data-testid="create-event-submit"]');

      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Event to Delete' });

      // Click delete button
      await eventCard.locator('[data-testid="delete-event-button"]').click();

      // Should show confirmation dialog
      await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-warning"]')).toContainText(
        'This action cannot be undone',
      );

      // Cancel first
      await page.click('[data-testid="cancel-delete"]');
      await expect(page.locator('[data-testid="delete-confirmation-dialog"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="events-list"]')).toContainText('Event to Delete');

      // Delete for real
      await eventCard.locator('[data-testid="delete-event-button"]').click();
      await page.fill('[data-testid="delete-confirmation-input"]', 'Event to Delete');
      await page.click('[data-testid="confirm-delete"]');

      // Should show success and remove from list
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Event deleted successfully',
      );
      await expect(page.locator('[data-testid="events-list"]')).not.toContainText(
        'Event to Delete',
      );
    });
  });

  test.describe('Lottery Draw Management Flow', () => {
    test.beforeEach(async () => {
      // Login and create event in DRAW state
      await page.goto('/admin/login');
      await page.fill('[data-testid="username-input"]', 'admin1');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');

      // Create event and set up for drawing
      await page.click('[data-testid="create-event-button"]');
      await page.fill('[data-testid="event-name-input"]', 'Lottery Test Event');
      await page.fill('[data-testid="event-description-input"]', 'Testing lottery functionality');
      await page.click('[data-testid="create-event-submit"]');

      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Lottery Test Event' });
      await eventCard.locator('[data-testid="open-registration-button"]').click();

      // Mock participants being registered
      // In real implementation, this would be done through the participant registration flow
      await page.evaluate(() => {
        // Simulate participants registration via API calls
        window.mockParticipants = [
          { name: 'Alice Johnson', id: 'p1' },
          { name: 'Bob Smith', id: 'p2' },
          { name: 'Charlie Brown', id: 'p3' },
          { name: 'Diana Prince', id: 'p4' },
          { name: 'Eve Wilson', id: 'p5' },
        ];
      });

      await eventCard.locator('[data-testid="start-draw-button"]').click();
      await page.click('[data-testid="confirm-start-draw"]');
    });

    test('should execute single winner draw', async () => {
      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Lottery Test Event' });

      // Click draw single winner
      await eventCard.locator('[data-testid="draw-single-winner-button"]').click();

      // Should show drawing animation
      await expect(page.locator('[data-testid="lottery-animation"]')).toBeVisible();

      // Should show winner result
      await expect(page.locator('[data-testid="winner-announcement"]')).toBeVisible();
      const winnerName = await page.locator('[data-testid="winner-name"]').textContent();
      expect([
        'Alice Johnson',
        'Bob Smith',
        'Charlie Brown',
        'Diana Prince',
        'Eve Wilson',
      ]).toContain(winnerName);

      // Should show draw order
      await expect(page.locator('[data-testid="draw-order"]')).toContainText('1');

      // Should update participants count
      await expect(page.locator('[data-testid="remaining-participants"]')).toContainText('4');
    });

    test('should execute draw all remaining participants', async () => {
      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Lottery Test Event' });

      // Click draw all
      await eventCard.locator('[data-testid="draw-all-button"]').click();

      // Should show confirmation
      await expect(page.locator('[data-testid="draw-all-confirmation"]')).toBeVisible();
      await page.click('[data-testid="confirm-draw-all"]');

      // Should show batch drawing progress
      await expect(page.locator('[data-testid="batch-drawing-progress"]')).toBeVisible();

      // Should show all winners list in order
      await expect(page.locator('[data-testid="winners-list"]')).toBeVisible();
      const winnerItems = page.locator('[data-testid="winner-item"]');
      await expect(winnerItems).toHaveCount(5);

      // Verify draw order sequence
      for (let i = 1; i <= 5; i++) {
        await expect(winnerItems.nth(i - 1).locator('[data-testid="draw-position"]')).toContainText(
          i.toString(),
        );
      }

      // Event should be automatically closed
      await expect(eventCard.locator('[data-testid="event-state"]')).toContainText('CLOSED');
    });

    test('should show real-time draw updates', async () => {
      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Lottery Test Event' });

      // Open event management view
      await eventCard.locator('[data-testid="view-event-button"]').click();

      // Should show live draw interface
      await expect(page.locator('[data-testid="live-draw-interface"]')).toBeVisible();
      await expect(page.locator('[data-testid="participants-count"]')).toContainText('5');
      await expect(page.locator('[data-testid="winners-count"]')).toContainText('0');

      // Execute single draw
      await page.click('[data-testid="draw-single-winner-button"]');

      // Should update counts in real-time
      await expect(page.locator('[data-testid="participants-count"]')).toContainText('4');
      await expect(page.locator('[data-testid="winners-count"]')).toContainText('1');

      // Should show winner in live list
      await expect(
        page.locator('[data-testid="live-winners-list"] [data-testid="winner-item"]'),
      ).toHaveCount(1);
    });

    test('should handle draw with no participants', async () => {
      // Create event with no participants
      await page.goto('/admin/dashboard');
      await page.click('[data-testid="create-event-button"]');
      await page.fill('[data-testid="event-name-input"]', 'Empty Event');
      await page.fill('[data-testid="event-description-input"]', 'No participants');
      await page.click('[data-testid="create-event-submit"]');

      const emptyEventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Empty Event' });
      await emptyEventCard.locator('[data-testid="open-registration-button"]').click();
      await emptyEventCard.locator('[data-testid="start-draw-button"]').click();
      await page.click('[data-testid="confirm-start-draw"]');

      // Try to draw winner
      await emptyEventCard.locator('[data-testid="draw-single-winner-button"]').click();

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'No participants available for drawing',
      );
    });

    test('should display winner statistics and analytics', async () => {
      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Lottery Test Event' });

      // Draw all participants
      await eventCard.locator('[data-testid="draw-all-button"]').click();
      await page.click('[data-testid="confirm-draw-all"]');

      // View event details
      await eventCard.locator('[data-testid="view-event-button"]').click();

      // Should show statistics
      await expect(page.locator('[data-testid="event-statistics"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-participants-stat"]')).toContainText('5');
      await expect(page.locator('[data-testid="total-winners-stat"]')).toContainText('5');
      await expect(page.locator('[data-testid="draw-duration-stat"]')).toBeVisible();

      // Should show winners export option
      await expect(page.locator('[data-testid="export-winners-button"]')).toBeVisible();

      // Should show full winners list
      const winnersList = page.locator('[data-testid="final-winners-list"]');
      await expect(winnersList).toBeVisible();
      await expect(winnersList.locator('[data-testid="winner-row"]')).toHaveCount(5);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test.beforeEach(async () => {
      // Login for each test
      await page.goto('/admin/login');
      await page.fill('[data-testid="username-input"]', 'admin1');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');
    });

    test('should handle network connectivity issues', async () => {
      // Simulate network offline
      await page.context().setOffline(true);

      // Try to create event
      await page.click('[data-testid="create-event-button"]');
      await page.fill('[data-testid="event-name-input"]', 'Offline Event');
      await page.fill('[data-testid="event-description-input"]', 'Testing offline handling');
      await page.click('[data-testid="create-event-submit"]');

      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toContainText(
        'Network connection lost',
      );
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Restore connection
      await page.context().setOffline(false);

      // Retry should work
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Event created successfully',
      );
    });

    test('should handle session timeout gracefully', async () => {
      // Simulate session expiration by clearing cookies
      await page.context().clearCookies();

      // Try to perform admin action
      await page.click('[data-testid="create-event-button"]');

      // Should redirect to login with session expired message
      await expect(page).toHaveURL(/\/admin\/login/);
      await expect(page.locator('[data-testid="session-expired-message"]')).toContainText(
        'Session expired. Please log in again.',
      );
    });

    test('should validate browser compatibility', async () => {
      // Test would check for required features like WebSockets, Local Storage, etc.
      const hasWebSocket = await page.evaluate(() => 'WebSocket' in window);
      const hasLocalStorage = await page.evaluate(() => 'localStorage' in window);

      expect(hasWebSocket).toBe(true);
      expect(hasLocalStorage).toBe(true);

      // If unsupported browser, should show compatibility warning
      if (!hasWebSocket || !hasLocalStorage) {
        await expect(page.locator('[data-testid="compatibility-warning"]')).toBeVisible();
        await expect(page.locator('[data-testid="feature-limitations-message"]')).toBeVisible();
      }
    });

    test('should handle concurrent admin operations', async () => {
      // Create event
      await page.click('[data-testid="create-event-button"]');
      await page.fill('[data-testid="event-name-input"]', 'Concurrent Test Event');
      await page.fill('[data-testid="event-description-input"]', 'Testing concurrent operations');
      await page.click('[data-testid="create-event-submit"]');

      // Open second tab with same admin session
      const page2 = await context.newPage();
      await page2.goto('/admin/dashboard');

      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Concurrent Test Event' });
      const eventCard2 = page2
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Concurrent Test Event' });

      // Try to perform same operation from both tabs
      await Promise.all([
        eventCard.locator('[data-testid="open-registration-button"]').click(),
        eventCard2.locator('[data-testid="open-registration-button"]').click(),
      ]);

      // One should succeed, one should show conflict error
      const successMessages = await Promise.all([
        page.locator('[data-testid="success-message"]').isVisible(),
        page2.locator('[data-testid="success-message"]').isVisible(),
      ]);

      const conflictMessages = await Promise.all([
        page.locator('[data-testid="conflict-error"]').isVisible(),
        page2.locator('[data-testid="conflict-error"]').isVisible(),
      ]);

      // Exactly one should succeed and one should show conflict
      expect(successMessages.filter(Boolean)).toHaveLength(1);
      expect(conflictMessages.filter(Boolean)).toHaveLength(1);

      await page2.close();
    });

    test('should provide accessibility features', async () => {
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').getAttribute('data-testid');
      expect(focusedElement).toBeTruthy();

      // Test ARIA labels and roles
      const createButton = page.locator('[data-testid="create-event-button"]');
      const ariaLabel = await createButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('Create new event');

      // Test high contrast mode support
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * { border: 1px solid red !important; }
          }
        `,
      });

      // Elements should remain visible and functional
      await expect(createButton).toBeVisible();
    });

    test('should handle data validation and sanitization', async () => {
      await page.click('[data-testid="create-event-button"]');

      // Test XSS prevention
      await page.fill('[data-testid="event-name-input"]', '<script>alert("xss")</script>');
      await page.fill('[data-testid="event-description-input"]', 'Safe description');
      await page.click('[data-testid="create-event-submit"]');

      // Should sanitize input and show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toContainText(
        'Invalid characters detected',
      );

      // Test SQL injection prevention
      await page.fill('[data-testid="event-name-input"]', "'; DROP TABLE events; --");
      await page.click('[data-testid="create-event-submit"]');

      await expect(page.locator('[data-testid="validation-error"]')).toContainText(
        'Invalid characters detected',
      );
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle large event lists efficiently', async () => {
      // Login
      await page.goto('/admin/login');
      await page.fill('[data-testid="username-input"]', 'admin1');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');

      // Mock large number of events
      await page.evaluate(() => {
        window.mockLargeEventList = Array.from({ length: 100 }, (_, i) => ({
          id: `event-${i}`,
          name: `Event ${i}`,
          state: Math.random() > 0.5 ? 'REGISTRATION' : 'CLOSED',
          participantCount: Math.floor(Math.random() * 200),
          createdAt: new Date(),
        }));
      });

      // Navigate to events list and measure performance
      const startTime = Date.now();
      await page.goto('/admin/dashboard');

      // Wait for events list to load
      await expect(page.locator('[data-testid="events-list"]')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time (< 3 seconds)
      expect(loadTime).toBeLessThan(3000);

      // Should implement pagination or virtual scrolling
      const eventCards = page.locator('[data-testid="event-card"]');
      const visibleEvents = await eventCards.count();

      // Should not render all 100 events at once (performance optimization)
      expect(visibleEvents).toBeLessThanOrEqual(20);

      // Should have pagination controls
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    });

    test('should handle rapid user interactions', async () => {
      // Login and create event
      await page.goto('/admin/login');
      await page.fill('[data-testid="username-input"]', 'admin1');
      await page.fill('[data-testid="password-input"]', 'SecurePass123!');
      await page.click('[data-testid="login-button"]');

      await page.click('[data-testid="create-event-button"]');
      await page.fill('[data-testid="event-name-input"]', 'Rapid Click Test');
      await page.fill('[data-testid="event-description-input"]', 'Testing rapid interactions');
      await page.click('[data-testid="create-event-submit"]');

      const eventCard = page
        .locator('[data-testid="event-card"]')
        .filter({ hasText: 'Rapid Click Test' });

      // Rapidly click same button multiple times
      const openRegistrationButton = eventCard.locator('[data-testid="open-registration-button"]');

      await Promise.all([
        openRegistrationButton.click(),
        openRegistrationButton.click(),
        openRegistrationButton.click(),
        openRegistrationButton.click(),
        openRegistrationButton.click(),
      ]);

      // Should handle gracefully - only one state change should occur
      await expect(eventCard.locator('[data-testid="event-state"]')).toContainText('REGISTRATION');

      // Should not show multiple success messages
      const successMessages = page.locator('[data-testid="success-message"]');
      const messageCount = await successMessages.count();
      expect(messageCount).toBeLessThanOrEqual(1);
    });
  });
});
