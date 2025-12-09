Feature: Environment Selection
  As a user of the IAM dashboard
  I want to select and switch between different environments
  So that I can view data from multiple environments

  Background:
    Given I am on the IAM dashboard

  Scenario: Initial page load with default environment
    Then the environment selector should be visible
    And no environment should be selected by default
    And the environment legend should not be visible

  Scenario: Select a single environment
    When I click the environment selector
    Then I should see all available environments:
      | bidevt |
      | widevt |
      | biqat  |
      | wiqat  |
      | biprt  |
    When I select the "bidevt" environment
    Then the "bidevt" environment should be selected
    And the environment legend should be visible
    And the legend should show "bidevt" with its assigned color

  Scenario: Select multiple environments
    When I click the environment selector
    And I select the "bidevt" environment
    And I select the "biqat" environment
    Then both "bidevt" and "biqat" should be selected
    And the environment legend should show both environments with their colors

  Scenario: Deselect an environment
    When I click the environment selector
    And I select the "bidevt" environment
    And I select the "biqat" environment
    And I deselect the "bidevt" environment
    Then only "biqat" should be selected
    And the legend should only show "biqat"

  Scenario: Environment selector visibility in different themes
    When I click the environment selector
    Then the selector should be visible and readable
    When I switch to dark theme
    Then the environment selector should remain visible with appropriate colors
    When I switch to light theme
    Then the environment selector should remain visible with appropriate colors

  Scenario: Environment selection persists in URL
    When I click the environment selector
    And I select the "bidevt" environment
    Then the URL should contain the selected environment parameters
    When I refresh the page
    Then the "bidevt" environment should still be selected
