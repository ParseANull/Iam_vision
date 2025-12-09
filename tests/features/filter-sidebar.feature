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

  @sidebar
  Scenario: Re-expand the sidebar
    When I click the sidebar toggle button
    And I click the sidebar toggle button again
    Then the filter sidebar should expand
    And the data type filters should be visible

  @sidebar
  Scenario: Accordion sections are present
    When I click the sidebar toggle button
    Then I should see the "Data Types" accordion section
    And I should see the "Data Limiting" accordion section

  @sidebar
  Scenario: Data Types accordion default state
    When I click the sidebar toggle button
    Then the "Data Types" accordion should be expanded by default
    And all data type checkboxes should be visible

  @sidebar
  Scenario: Toggle individual data type
    When I click the sidebar toggle button
    And I uncheck the "Applications" data type
    Then the "Applications" checkbox should be unchecked
    And applications data should not be displayed in visualizations

  Scenario: Toggle multiple data types
    When I click the sidebar toggle button
    And I uncheck the "Applications" data type
    And I uncheck the "Federations" data type
    Then both "Applications" and "Federations" should be unchecked
    And only the remaining data types should be visible in visualizations

  Scenario: Check all data types
    When I click the sidebar toggle button
    And all data types are checked
    Then all available data should be displayed in visualizations

  Scenario: Data type selections persist in URL
    When I click the sidebar toggle button
    And I uncheck the "MFA" data type
    Then the URL should reflect the data type selection
    When I refresh the page
    Then the "MFA" data type should still be unchecked

  Scenario: Sidebar state persists across theme changes
    When I click the sidebar toggle button
    Then the sidebar should be expanded
    When I switch to dark theme
    Then the sidebar should remain expanded
    And the sidebar styling should adapt to dark theme
