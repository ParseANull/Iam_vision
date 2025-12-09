Feature: Navigation Menu
  As a user of the IAM dashboard
  I want to navigate between different views
  So that I can access different types of IAM information

  Background:
    Given I am on the IAM dashboard

  Scenario: Navigation menu is visible
    Then the navigation menu should be visible in the header
    And I should see navigation items:
      | Overview      |
      | Applications  |
      | Federations   |
      | MFA           |
      | Attributes    |

  Scenario: Default view is Overview
    Then the "Overview" navigation item should be marked as active
    And the Overview page content should be displayed

  Scenario: Navigate to Applications page
    When I click on the "Applications" navigation item
    Then the "Applications" navigation item should be marked as active
    And the "Overview" navigation item should not be active
    And the Applications page content should be displayed
    And the URL should update to reflect the Applications view

  Scenario: Navigate to Federations page
    When I click on the "Federations" navigation item
    Then the "Federations" navigation item should be marked as active
    And the Federations page content should be displayed

  Scenario: Navigate to MFA page
    When I click on the "MFA" navigation item
    Then the "MFA" navigation item should be marked as active
    And the MFA page content should be displayed

  Scenario: Navigate to Attributes page
    When I click on the "Attributes" navigation item
    Then the "Attributes" navigation item should be marked as active
    And the Attributes page content should be displayed

  Scenario: Navigation persists selected environments
    When I click the environment selector
    And I select the "bidevt" environment
    And I click on the "Applications" navigation item
    Then the "bidevt" environment should still be selected
    And the Applications data should be from "bidevt"

  Scenario: Navigation persists data type filters
    When I click the sidebar toggle button
    And I uncheck the "MFA" data type
    And I click on the "Federations" navigation item
    Then the "MFA" data type should still be unchecked
    And MFA data should not be displayed

  Scenario: Active navigation item visual indicator
    When I click on the "Applications" navigation item
    Then the "Applications" item should have a blue bottom border
    And the "Applications" item should have a distinct visual style

  Scenario: Navigation works in both themes
    When I click on the "Applications" navigation item
    Then the navigation should work correctly
    When I switch to dark theme
    And I click on the "Federations" navigation item
    Then the navigation should work correctly
    And the active item should be clearly visible in dark theme
