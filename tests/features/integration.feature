Feature: Integration and State Management
  As a user of the IAM dashboard
  I want all features to work together seamlessly
  So that I have a consistent and reliable experience

  Background:
    Given I am on the IAM dashboard

  Scenario: Complete workflow from start to finish
    When I click the environment selector
    And I select the "bidevt" environment
    And I uncheck the "MFA" data type
    And I set the data limit slider to 70%
    And I click on the "Applications" navigation item
    Then MFA data should not be included
    And only 70% of the data should be displayed

  Scenario: URL parameters capture all state
    When I click the environment selector
    And I select the "bidevt" environment
    And I select the "biqat" environment
    And I uncheck the "Federations" data type
    And I click on the "Applications" navigation item
    Then the URL should contain all state parameters
    When I copy and paste the URL in a new window
    Then all the state should be restored correctly

  Scenario: State persists across page refreshes
    When I click the environment selector
    And I select the "widevt" environment
    And I uncheck the "Attributes" data type
    And I click on the "Federations" navigation item
    And I click the theme toggle button
    And I refresh the page
    Then the "widevt" environment should still be selected
    And the "Attributes" data type should still be unchecked
    And the Federations view should be active
    And the dark theme should still be applied

  Scenario: Multiple rapid state changes
    When I click the environment selector
    And I rapidly select and deselect environments
    And I rapidly toggle data types
    And I rapidly switch between views
    Then the application should remain stable
    And no errors should occur
    And the final state should be consistent

  Scenario: Sidebar interactions don't affect navigation
    When I click the sidebar toggle button
    And I navigate through all menu items
    Then the sidebar should remain in its state
    And the data limit setting should persist

  Scenario: Theme changes don't affect data state
    When I click the environment selector
    And I select the "biprt" environment
    And I click the theme toggle button
    Then the "biprt" environment should still be selected
    And all data should still be displayed correctly
    When I click the theme toggle button again
    Then the environment selection should be unchanged

  Scenario: Console logs remain informative
    When I select an environment with empty data files
    Then console logs should use informative icons (ℹ, ✓, ⚠)
    And no alarming error messages should appear
    And the application should continue working normally

  Scenario: All five environments work correctly
    When I select each environment individually:
      | bidevt |
      | widevt |
      | biqat  |
      | wiqat  |
      | biprt  |
    Then each environment should load its data correctly
    And each should be assigned a unique color
    And the environment legend should update for each selection
