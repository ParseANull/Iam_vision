Feature: Performance Monitoring
  As a user of the IAM dashboard
  I want to monitor and control rendering performance
  So that I can manage large datasets effectively

  Background:
    Given I am on the IAM dashboard
    And I have selected the "bidevt" environment

  Scenario: Data limiting control is present
    Then I should see the data limit slider
    And the slider should show a percentage value

  Scenario: Default data limit is 100%
    Then the data limit slider should be set to 100%
    And the slider label should display "100%"

  Scenario: Adjust data limit slider
    When I set the data limit slider to 50%
    Then the slider label should display "50%"
    And the visualizations should reload with limited data

  Scenario: Data limit affects all visualizations
    When I set the data limit slider to 30%
    And I navigate to the "Applications" page
    Then only 30% of the data should be displayed
    When I navigate to the "Federations" page
    Then only 30% of the data should be displayed

  Scenario: Performance warning for slow renders
    When rendering takes longer than 30 seconds
    Then a performance warning should be displayed
    And the warning should suggest reducing the data limit

  Scenario: Performance warning disappears when render is fast
    When rendering takes longer than 30 seconds
    And a performance warning is displayed
    And I reduce the data limit to 20%
    And rendering completes in less than 30 seconds
    Then the performance warning should disappear

  Scenario: Data limit persists across page navigation
    When I set the data limit slider to 60%
    And I navigate to the "Applications" page
    And I navigate back to the "Overview" page
    Then the data limit slider should still be set to 60%

  Scenario: Slider visual feedback
    Then the slider should have a gradient fill
    And the fill should reflect the current percentage
    When I adjust the slider
    Then the gradient fill should update dynamically
