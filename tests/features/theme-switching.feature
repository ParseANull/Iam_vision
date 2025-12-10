Feature: Theme Switching
  As a user of the IAM dashboard
  I want to switch between light and dark themes
  So that I can use the dashboard comfortably in different lighting conditions

  Background:
    Given I am on the IAM dashboard

  Scenario: Default theme on page load
    Then the page should load with a default theme
    And the theme toggle button should be visible

  Scenario: Switch to dark theme
    When I click the theme toggle button
    Then the page should switch to dark theme
    And the body element should have the "dark" theme attribute
    And all UI components should adapt to dark theme colors

  @skip
  Scenario: Switch to light theme
    When I click the theme toggle button
    And I click the theme toggle button again
    Then the page should switch to light theme
    And the body element should have the "light" theme attribute
    And all UI components should adapt to light theme colors

  Scenario: Environment selector visibility in both themes
    When I click the environment selector
    Then the selector should be clearly visible
    When I click the theme toggle button
    Then the environment selector should remain visible and readable
    And the text color should contrast properly with the background

  Scenario: Navigation menu adapts to theme
    Then the navigation menu should be styled appropriately for the current theme
    When I click the theme toggle button
    Then the navigation menu styling should update
    And the active navigation item should remain clearly visible

  Scenario: Sidebar adapts to theme
    When I click the sidebar toggle button
    Then the sidebar should be styled appropriately for the current theme
    When I click the theme toggle button
    Then the sidebar styling should update to match the new theme
    And all checkboxes and labels should be readable

  Scenario: Visualizations adapt to theme
    When I have selected the "bidevt" environment
    And I am on the "Overview" page
    Then the visualizations should be styled for the current theme
    When I click the theme toggle button
    Then the visualizations should update their styling
    And data should remain clearly visible

  Scenario: Performance warning adapts to theme
    When I set the data limit slider to 10%
    Then if a performance warning appears, it should be styled for the current theme
    When I click the theme toggle button
    Then the warning styling should adapt to the new theme

  Scenario: Theme preference persists
    When I click the theme toggle button
    And the page is in dark theme
    And I refresh the page
    Then the page should load in dark theme
    And the theme preference should be remembered

  Scenario: All text remains readable in both themes
    When I click the theme toggle button
    Then all text elements should have sufficient contrast
    And no text should be invisible or hard to read
    When I click the theme toggle button again
    Then all text elements should have sufficient contrast
    And no text should be invisible or hard to read
