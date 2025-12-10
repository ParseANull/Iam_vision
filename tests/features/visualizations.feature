Feature: Data Visualizations
  As a user of the IAM dashboard
  I want to see visual representations of the data
  So that I can understand the IAM configuration at a glance

  Background:
    Given I am on the IAM dashboard
    And I have selected the "bidevt" environment

  Scenario: Overview page displays statistics
    When I am on the "Overview" page
    Then I should see statistics cards
    And the cards should display data from the selected environment
    And each card should show a count and label

  Scenario: Applications page displays application data
    When I navigate to the "Applications" page
    Then I should see application visualizations
    And the visualizations should be color-coded by environment

  Scenario: Federations page displays federation data
    When I navigate to the "Federations" page
    Then I should see federation visualizations
    And the data should be from the selected environment

  Scenario: MFA page displays MFA configuration
    When I navigate to the "MFA" page
    Then I should see MFA configuration visualizations
    And the data should represent MFA settings

  Scenario: Attributes page displays attribute data
    When I navigate to the "Attributes" page
    Then I should see attribute visualizations
    And the data should be properly formatted

  Scenario: Multi-environment visualization colors
    When I click the environment selector
    And I select the "bidevt" environment
    And I select the "biqat" environment
    And I navigate to the "Applications" page
    Then the visualizations should show data from both environments
    And "bidevt" data should be displayed in its assigned color
    And "biqat" data should be displayed in its assigned color
    And the environment legend should show both color assignments

  Scenario: Visualizations update when environment changes
    When I am on the "Overview" page
    And I click the environment selector
    And I select the "widevt" environment
    Then the visualizations should update to show "widevt" data
    And the statistics should reflect the new environment

  @skip
  Scenario: Visualizations update when data types change
    When I click the sidebar toggle button
    And I uncheck the "Applications" data type
    Then the "Applications" data should not be visible in visualizations
    When I check the "Applications" data type again
    Then the "Applications" data should reappear in visualizations

  Scenario: Empty data handling
    When I select an environment with no data
    Then I should see informative messages
    And no error warnings should appear in the console
    And the page should not crash
