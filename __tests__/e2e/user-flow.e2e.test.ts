/**
 * User Flow End-to-End Test Suite
 *
 * CRITICAL TDD RULE: These tests are IMMUTABLE and MUST NOT be modified
 * All tests should FAIL initially (red phase)
 * Tests define the expected behavior - implementation must make them pass
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('User Flow E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;
  let adminPage: Page;
  let eventId: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true
    });

    // Set up admin page to create events for testing
    adminPage = await context.newPage();
    await adminPage.goto('/admin/login');
    await adminPage.fill('[data-testid="username-input"]', 'admin1');
    await adminPage.fill('[data-testid="password-input"]', 'SecurePass123!');
    await adminPage.click('[data-testid="login-button"]');
    await expect(adminPage).toHaveURL('/admin/dashboard');
  });

  test.beforeEach(async () => {
    page = await context.newPage();

    // Create a fresh event for each test
    await adminPage.click('[data-testid="create-event-button"]');
    await adminPage.fill('[data-testid="event-name-input"]', `User Test Event ${Date.now()}`);
    await adminPage.fill('[data-testid="event-description-input"]', 'Event for user flow testing');
    await adminPage.click('[data-testid="create-event-submit"]');

    // Get the event ID from the newly created event
    const eventCard = adminPage.locator('[data-testid="event-card"]').first();
    eventId = await eventCard.getAttribute('data-event-id');

    // Open registration for the event
    await eventCard.locator('[data-testid="open-registration-button"]').click();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await adminPage.close();
    await context.close();
  });

  test.describe('User Registration Flow', () => {
    test('should complete successful user registration', async () => {
      // Navigate to registration page
      await page.goto(`/register/${eventId}`);

      // Should show event information
      await expect(page.locator('[data-testid="event-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();

      // Fill registration form
      await page.fill('[data-testid="participant-name-input"]', 'John Doe');

      // Submit registration
      await page.click('[data-testid="register-button"]');

      // Should show success message
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Successfully registered');
      await expect(page.locator('[data-testid="participant-name-display"]')).toContainText('John Doe');

      // Should show unique participant QR code
      await expect(page.locator('[data-testid="participant-qr-code"]')).toBeVisible();

      // Should transition to waiting screen
      await expect(page.locator('[data-testid="waiting-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="waiting-message"]')).toContainText('You will be notified when the draw begins');
    });

    test('should validate registration form inputs', async () => {
      await page.goto(`/register/${eventId}`);

      // Try to submit empty form
      await page.click('[data-testid="register-button"]');

      // Should show validation error
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
      await expect(page.locator('[data-testid="registration-success"]')).not.toBeVisible();

      // Try with invalid name formats
      const invalidNames = ['', '   ', 'A', 'B'.repeat(101)];

      for (const invalidName of invalidNames) {
        await page.fill('[data-testid="participant-name-input"]', invalidName);
        await page.click('[data-testid="register-button"]');

        await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="registration-success"]')).not.toBeVisible();
      }
    });

    test('should accept valid international names', async () => {
      await page.goto(`/register/${eventId}`);

      const validNames = [
        'María García',
        'Jean-Pierre Dupont',
        'O\'Sullivan',
        '李明',
        'José María de la Cruz'
      ];

      for (const validName of validNames) {
        // Refresh page for new registration
        await page.reload();

        await page.fill('[data-testid="participant-name-input"]', validName);
        await page.click('[data-testid="register-button"]');

        await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="participant-name-display"]')).toContainText(validName);
      }
    });

    test('should prevent duplicate name registration', async () => {
      await page.goto(`/register/${eventId}`);

      // First registration
      await page.fill('[data-testid="participant-name-input"]', 'Duplicate User');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();

      // Try to register again with same name in new session
      const page2 = await context.newPage();
      await page2.goto(`/register/${eventId}`);
      await page2.fill('[data-testid="participant-name-input"]', 'Duplicate User');
      await page2.click('[data-testid="register-button"]');

      // Should show duplicate error
      await expect(page2.locator('[data-testid="duplicate-error"]')).toContainText('Name already registered');
      await expect(page2.locator('[data-testid="registration-success"]')).not.toBeVisible();

      await page2.close();
    });

    test('should handle registration for non-existent event', async () => {
      await page.goto('/register/nonexistent-event-id');

      // Should show event not found error
      await expect(page.locator('[data-testid="event-not-found"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Event not found');
      await expect(page.locator('[data-testid="registration-form"]')).not.toBeVisible();
    });

    test('should prevent registration when event is closed', async () => {
      // Close registration from admin
      const eventCard = adminPage.locator(`[data-event-id="${eventId}"]`);
      await eventCard.locator('[data-testid="start-draw-button"]').click();
      await adminPage.click('[data-testid="confirm-start-draw"]');

      // Try to register
      await page.goto(`/register/${eventId}`);

      // Should show registration closed message
      await expect(page.locator('[data-testid="registration-closed"]')).toBeVisible();
      await expect(page.locator('[data-testid="closed-message"]')).toContainText('Registration is closed');
      await expect(page.locator('[data-testid="registration-form"]')).not.toBeVisible();
    });

    test('should handle participant limit reached', async () => {
      // This would require mocking or setting a very low participant limit
      // For now, we'll test the UI behavior when the API returns limit reached

      await page.goto(`/register/${eventId}`);

      // Mock API response for limit reached
      await page.route('/api/participants', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Event has reached maximum participant limit',
            maxParticipants: 50,
            currentParticipants: 50
          })
        });
      });

      await page.fill('[data-testid="participant-name-input"]', 'Late Participant');
      await page.click('[data-testid="register-button"]');

      // Should show limit reached error
      await expect(page.locator('[data-testid="limit-error"]')).toContainText('maximum participant limit');
      await expect(page.locator('[data-testid="current-count"]')).toContainText('50/50');
    });
  });

  test.describe('User State Recovery', () => {
    test('should recover registration state after browser refresh', async () => {
      await page.goto(`/register/${eventId}`);

      // Register user
      await page.fill('[data-testid="participant-name-input"]', 'State Recovery User');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();

      // Refresh page
      await page.reload();

      // Should recover registered state and show waiting screen
      await expect(page.locator('[data-testid="waiting-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="participant-name-display"]')).toContainText('State Recovery User');
      await expect(page.locator('[data-testid="registration-form"]')).not.toBeVisible();
    });

    test('should handle expired session recovery', async () => {
      await page.goto(`/register/${eventId}`);

      // Register user
      await page.fill('[data-testid="participant-name-input"]', 'Expired Session User');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();

      // Clear session cookies to simulate expiration
      await page.context().clearCookies();

      // Refresh page
      await page.reload();

      // Should show session expired message and registration form
      await expect(page.locator('[data-testid="session-expired-message"]')).toContainText('Session expired');
      await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
    });

    test('should maintain state across different screens', async () => {
      await page.goto(`/register/${eventId}`);

      // Register user
      await page.fill('[data-testid="participant-name-input"]', 'Cross Screen User');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('[data-testid="waiting-screen"]')).toBeVisible();

      // Navigate away and back
      await page.goto('/');
      await page.goto(`/register/${eventId}`);

      // Should still show waiting screen
      await expect(page.locator('[data-testid="waiting-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="participant-name-display"]')).toContainText('Cross Screen User');
    });
  });

  test.describe('Live Lottery Experience', () => {
    test.beforeEach(async () => {
      // Register multiple users for lottery testing
      const participants = ['Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince'];

      for (let i = 0; i < participants.length; i++) {
        const testPage = await context.newPage();
        await testPage.goto(`/register/${eventId}`);
        await testPage.fill('[data-testid="participant-name-input"]', participants[i]);
        await testPage.click('[data-testid="register-button"]');
        await expect(testPage.locator('[data-testid="registration-success"]')).toBeVisible();
        await testPage.close();
      }

      // Start draw from admin
      const eventCard = adminPage.locator(`[data-event-id="${eventId}"]`);
      await eventCard.locator('[data-testid="start-draw-button"]').click();
      await adminPage.click('[data-testid="confirm-start-draw"]');
    });

    test('should show live lottery screen during draw', async () => {
      // Register and wait for draw
      await page.goto(`/register/${eventId}`);
      await page.fill('[data-testid="participant-name-input"]', 'Live Lottery User');
      await page.click('[data-testid="register-button"]');

      // Start draw from admin (already done in beforeEach)
      // User should automatically see lottery screen
      await expect(page.locator('[data-testid="lottery-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="live-draw-title"]')).toContainText('Live Draw');
      await expect(page.locator('[data-testid="participants-remaining"]')).toBeVisible();
    });

    test('should receive real-time winner notifications', async () => {
      await page.goto(`/register/${eventId}`);
      await page.fill('[data-testid="participant-name-input"]', 'Notification User');
      await page.click('[data-testid="register-button"]');

      // Should be on lottery screen
      await expect(page.locator('[data-testid="lottery-screen"]')).toBeVisible();

      // Execute draw from admin
      const eventCard = adminPage.locator(`[data-event-id="${eventId}"]`);
      await eventCard.locator('[data-testid="draw-single-winner-button"]').click();

      // User should see winner notification in real-time
      await expect(page.locator('[data-testid="winner-notification"]')).toBeVisible({ timeout: 5000 });

      // Should show winner name and position
      const winnerName = await page.locator('[data-testid="winner-name"]').textContent();
      expect(winnerName).toBeTruthy();
      await expect(page.locator('[data-testid="winner-position"]')).toContainText('1');

      // Should update participants remaining count
      await expect(page.locator('[data-testid="participants-remaining"]')).toContainText('3'); // 5 total - 1 drawn - 1 current user
    });

    test('should show personal winner notification when selected', async () => {
      await page.goto(`/register/${eventId}`);
      await page.fill('[data-testid="participant-name-input"]', 'Winner User');
      await page.click('[data-testid="register-button"]');

      // Mock being selected as winner
      await page.route('/api/events/*/sse', (route) => {
        // Simulate SSE stream with personal win notification
        route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          body: `data: {"type":"YOU_ARE_WINNER","winner":{"participantName":"Winner User","drawOrder":1},"congratulationsMessage":"Congratulations! You have been selected!"}\n\n`
        });
      });

      await expect(page.locator('[data-testid="lottery-screen"]')).toBeVisible();

      // Should show personal winner celebration
      await expect(page.locator('[data-testid="personal-winner-celebration"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="congratulations-message"]')).toContainText('Congratulations!');
      await expect(page.locator('[data-testid="winner-position-display"]')).toContainText('1');

      // Should show confetti animation
      await expect(page.locator('[data-testid="confetti-animation"]')).toBeVisible();
    });

    test('should handle draw completion notification', async () => {
      await page.goto(`/register/${eventId}`);
      await page.fill('[data-testid="participant-name-input"]', 'Final User');
      await page.click('[data-testid="register-button"]');

      // Draw all participants from admin
      const eventCard = adminPage.locator(`[data-event-id="${eventId}"]`);
      await eventCard.locator('[data-testid="draw-all-button"]').click();
      await adminPage.click('[data-testid="confirm-draw-all"]');

      // User should see draw completion notification
      await expect(page.locator('[data-testid="draw-completed-notification"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="total-winners-count"]')).toBeVisible();

      // Should transition to final results screen
      await expect(page.locator('[data-testid="final-results-screen"]')).toBeVisible();
    });

    test('should maintain connection during network interruptions', async () => {
      await page.goto(`/register/${eventId}`);
      await page.fill('[data-testid="participant-name-input"]', 'Network Test User');
      await page.click('[data-testid="register-button"]');

      await expect(page.locator('[data-testid="lottery-screen"]')).toBeVisible();

      // Simulate network interruption
      await page.context().setOffline(true);

      // Should show connection lost message
      await expect(page.locator('[data-testid="connection-lost"]')).toBeVisible();
      await expect(page.locator('[data-testid="reconnecting-indicator"]')).toBeVisible();

      // Restore connection
      await page.context().setOffline(false);

      // Should automatically reconnect and resume
      await expect(page.locator('[data-testid="connection-restored"]')).toBeVisible();
      await expect(page.locator('[data-testid="lottery-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-lost"]')).not.toBeVisible();
    });
  });

  test.describe('Final Results Experience', () => {
    test('should show winner results screen', async () => {
      await page.goto(`/register/${eventId}`);
      await page.fill('[data-testid="participant-name-input"]', 'Results Winner');
      await page.click('[data-testid="register-button"]');

      // Complete the draw with user as winner
      const eventCard = adminPage.locator(`[data-event-id="${eventId}"]`);
      await eventCard.locator('[data-testid="draw-all-button"]').click();
      await adminPage.click('[data-testid="confirm-draw-all"]');

      // Mock user as winner in results
      await page.route('/api/participants/*/status', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            isWinner: true,
            winner: {
              participantName: 'Results Winner',
              drawOrder: 2,
              drawnAt: new Date().toISOString()
            },
            event: {
              name: 'User Test Event',
              totalParticipants: 5,
              totalWinners: 5
            }
          })
        });
      });

      await page.reload();

      // Should show winner results screen
      await expect(page.locator('[data-testid="winner-results-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="congratulations-header"]')).toContainText('Congratulations!');
      await expect(page.locator('[data-testid="winner-name"]')).toContainText('Results Winner');
      await expect(page.locator('[data-testid="winner-position"]')).toContainText('2');

      // Should show event statistics
      await expect(page.locator('[data-testid="event-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-participants"]')).toContainText('5');

      // Should show sharing options
      await expect(page.locator('[data-testid="share-results-button"]')).toBeVisible();
    });

    test('should show non-winner results screen', async () => {
      await page.goto(`/register/${eventId}`);
      await page.fill('[data-testid="participant-name-input"]', 'Non Winner');
      await page.click('[data-testid="register-button"]');

      // Complete the draw
      const eventCard = adminPage.locator(`[data-event-id="${eventId}"]`);
      await eventCard.locator('[data-testid="draw-all-button"]').click();
      await adminPage.click('[data-testid="confirm-draw-all"]');

      // Mock user as non-winner
      await page.route('/api/participants/*/status', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            isWinner: false,
            participant: {
              name: 'Non Winner'
            },
            event: {
              name: 'User Test Event',
              totalParticipants: 5,
              totalWinners: 3
            }
          })
        });
      });

      await page.reload();

      // Should show non-winner results screen
      await expect(page.locator('[data-testid="non-winner-results-screen"]')).toBeVisible();
      await expect(page.locator('[data-testid="thank-you-message"]')).toContainText('Thank you for participating');
      await expect(page.locator('[data-testid="participant-name"]')).toContainText('Non Winner');

      // Should show consolation message and statistics
      await expect(page.locator('[data-testid="consolation-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="event-stats"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-participants"]')).toContainText('5');
      await expect(page.locator('[data-testid="total-winners"]')).toContainText('3');
    });

    test('should provide navigation back to home', async () => {
      await page.goto(`/register/${eventId}`);
      await page.fill('[data-testid="participant-name-input"]', 'Navigation User');
      await page.click('[data-testid="register-button"]');

      // Complete draw and go to results
      const eventCard = adminPage.locator(`[data-event-id="${eventId}"]`);
      await eventCard.locator('[data-testid="draw-all-button"]').click();
      await adminPage.click('[data-testid="confirm-draw-all"]');

      await page.reload();
      await expect(page.locator('[data-testid="final-results-screen"]')).toBeVisible();

      // Click back to home button
      await page.click('[data-testid="back-to-home-button"]');

      // Should navigate to home page
      await expect(page).toHaveURL('/');
    });

    test('should handle results sharing functionality', async () => {
      await page.goto(`/register/${eventId}`);
      await page.fill('[data-testid="participant-name-input"]', 'Share User');
      await page.click('[data-testid="register-button"]');

      // Mock as winner for sharing test
      await page.route('/api/participants/*/status', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            isWinner: true,
            winner: {
              participantName: 'Share User',
              drawOrder: 1,
              drawnAt: new Date().toISOString()
            },
            event: {
              name: 'User Test Event'
            }
          })
        });
      });

      await page.reload();
      await expect(page.locator('[data-testid="winner-results-screen"]')).toBeVisible();

      // Test share functionality
      await page.click('[data-testid="share-results-button"]');
      await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();

      // Should show sharing options
      await expect(page.locator('[data-testid="share-link-option"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-social-option"]')).toBeVisible();

      // Test copy link functionality
      await page.click('[data-testid="copy-link-button"]');
      await expect(page.locator('[data-testid="link-copied-message"]')).toContainText('Link copied');
    });
  });

  test.describe('Mobile Responsiveness and Accessibility', () => {
    test.beforeEach(async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should work properly on mobile devices', async () => {
      await page.goto(`/register/${eventId}`);

      // Registration form should be mobile-friendly
      await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();

      // Form elements should be appropriately sized
      const nameInput = page.locator('[data-testid="participant-name-input"]');
      const inputBox = await nameInput.boundingBox();
      expect(inputBox?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size

      // Fill and submit form
      await page.fill('[data-testid="participant-name-input"]', 'Mobile User');
      await page.click('[data-testid="register-button"]');

      // Success screen should be mobile-optimized
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="waiting-screen"]')).toBeVisible();

      // QR code should be appropriately sized for mobile
      const qrCode = page.locator('[data-testid="participant-qr-code"]');
      const qrBox = await qrCode.boundingBox();
      expect(qrBox?.width).toBeLessThanOrEqual(300); // Should fit on mobile screen
    });

    test('should support keyboard navigation', async () => {
      await page.goto(`/register/${eventId}`);

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="participant-name-input"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="register-button"]')).toBeFocused();

      // Enter key should submit form
      await page.fill('[data-testid="participant-name-input"]', 'Keyboard User');
      await page.keyboard.press('Tab'); // Focus on submit button
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
    });

    test('should have proper ARIA labels and screen reader support', async () => {
      await page.goto(`/register/${eventId}`);

      // Form should have proper labels
      const nameInput = page.locator('[data-testid="participant-name-input"]');
      const ariaLabel = await nameInput.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();

      // Form should have proper roles
      const form = page.locator('[data-testid="registration-form"]');
      const role = await form.getAttribute('role');
      expect(role).toBe('form');

      // Error messages should be associated with inputs
      await page.click('[data-testid="register-button"]');
      const errorMessage = page.locator('[data-testid="name-error"]');
      const describedBy = await nameInput.getAttribute('aria-describedby');
      const errorId = await errorMessage.getAttribute('id');
      expect(describedBy).toContain(errorId);
    });

    test('should support high contrast mode', async () => {
      await page.goto(`/register/${eventId}`);

      // Enable high contrast mode simulation
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background: white !important;
              color: black !important;
              border: 1px solid black !important;
            }
            button {
              background: black !important;
              color: white !important;
            }
          }
        `
      });

      // Elements should still be visible and functional
      await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="participant-name-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="register-button"]')).toBeVisible();

      // Form should still work
      await page.fill('[data-testid="participant-name-input"]', 'High Contrast User');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API failures gracefully', async () => {
      await page.goto(`/register/${eventId}`);

      // Mock API failure
      await page.route('/api/participants', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });

      await page.fill('[data-testid="participant-name-input"]', 'API Failure User');
      await page.click('[data-testid="register-button"]');

      // Should show error message with retry option
      await expect(page.locator('[data-testid="api-error"]')).toContainText('server error');
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Retry should work when API is restored
      await page.route('/api/participants', (route) => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            participant: {
              id: 'participant-123',
              name: 'API Failure User',
              eventId: eventId
            },
            sessionToken: 'session-token-123'
          })
        });
      });

      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
    });

    test('should handle slow network connections', async () => {
      await page.goto(`/register/${eventId}`);

      // Simulate slow network
      await page.route('/api/participants', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            participant: {
              id: 'participant-123',
              name: 'Slow Network User'
            }
          })
        });
      });

      await page.fill('[data-testid="participant-name-input"]', 'Slow Network User');
      await page.click('[data-testid="register-button"]');

      // Should show loading indicator
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="loading-message"]')).toContainText('Registering');

      // Should eventually succeed
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
    });

    test('should handle browser compatibility issues', async () => {
      await page.goto(`/register/${eventId}`);

      // Mock unsupported browser (no WebSocket)
      await page.evaluate(() => {
        (window as any).WebSocket = undefined;
      });

      await page.fill('[data-testid="participant-name-input"]', 'Compatibility User');
      await page.click('[data-testid="register-button"]');

      // Should show compatibility warning
      await expect(page.locator('[data-testid="compatibility-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="limited-features-message"]')).toContainText('limited features');

      // Basic functionality should still work
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
    });

    test('should handle offline functionality', async () => {
      await page.goto(`/register/${eventId}`);

      // Register while online
      await page.fill('[data-testid="participant-name-input"]', 'Offline User');
      await page.click('[data-testid="register-button"]');
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();

      // Go offline
      await page.context().setOffline(true);

      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-message"]')).toContainText('offline');

      // Critical information should still be available
      await expect(page.locator('[data-testid="participant-name-display"]')).toContainText('Offline User');
      await expect(page.locator('[data-testid="participant-qr-code"]')).toBeVisible();

      // Go back online
      await page.context().setOffline(false);
      await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
    });
  });
});