Feature: Filter Sidebar
  As a user of the IAM dashboard
  I want to filter the displayed data by type
  So that I can focus on specific categories of information

  Background:
    Given I am on the IAM dashboard
    And I have selected the "bidevt" environment

  @sidebar
  Scenario: Sidebar auto-expands after environment selection
    Then the filter sidebar should be expanded after selecting environment
    And the sidebar toggle button should be visible
    And the data type filters should be visible

  @sidebar
  Scenario: Collapse the sidebar
    When I click the sidebar toggle button
    Then the filter sidebar should collapse
    And the data type filters should not be visible

  @sidebar @skip
  Scenario: Re-expand the sidebar
    When I click the sidebar toggle button
    And I click the sidebar toggle button again
    Then the filter sidebar should expand
    And the filter accordion should be present

  @sidebar
  Scenario: Accordion sections are present
    Then I should see an accordion item for "bidevt"
    And the accordion item should contain data type checkboxes

  @sidebar
  Scenario: Environment accordion default state
    Then the "bidevt" accordion should be expanded by default
    And all data type checkboxes should be visible

  @sidebar
  Scenario: Toggle individual data type
    And I uncheck the "Applications" data type
    Then the "Applications" checkbox should be unchecked
    And applications data should not be displayed in visualizations

  @sidebar
  Scenario: Toggle multiple data types
    And I uncheck the "Applications" data type
    And I uncheck the "Federations" data type
    Then both "Applications" and "Federations" should be unchecked
    And only the remaining data types should be visible in visualizations

  @sidebar
  Scenario: Check all data types
    And all data types are checked
    Then all available data should be displayed in visualizations

  @sidebar @skip
  Scenario: Data type selections persist in URL
    And I uncheck the "MFA" data type
    Then the URL should reflect the data type selection
    When I refresh the page
    Then the "MFA" data type should still be unchecked

  Scenario: Sidebar state persists across theme changes
    Then the sidebar should be expanded
    When I switch to dark theme
    Then the sidebar should remain expanded
    And the sidebar styling should adapt to dark theme
