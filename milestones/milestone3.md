# Milestone 3

This document should be completed and submitted during **Unit 7** of this course. You **must** check off all completed tasks in this document in order to receive credit for your work.

## Checklist

This unit, be sure to complete all tasks listed below. To complete a task, place an `x` between the brackets.

You will need to reference the GitHub Project Management guide in the course portal for more information about how to complete each of these steps.

- [x] In your repo, create a project board.
  - *Please be sure to share your project board with the grading team's GitHub **codepathreview**. This is separate from your repository's sharing settings.*
- [x] In your repo, create at least 5 issues from the features on your feature list.
  - List the title of each issue you created:
    1. Implement Timed Game Loop Mode (Feature 1)
    2. Build Dynamic Word Reveal Modal Cards (Feature 2)
    3. Construct Final Similarity Meter Dashboard (Feature 3)
    4. Set up Personal Missed Words History Join Table (Feature 4)
    5. Implement Custom Deck Creator CRUD Operations (Feature 5)
- [x] In your repo, update the status of issues in your project board.
- [x] In your repo, create a GitHub Milestone for each final project unit, corresponding to each of the 5 milestones in your `milestones/` directory.
  - List the name of each milestone you created:
    1. Milestone 1 - Unit 5
    2. Milestone 2 - Unit 6
    3. Milestone 3 - Unit 7
  - [x] Set the completion percentage of each milestone. The GitHub Milestone for this unit (Milestone 3 - Unit 7) should be 100% completed when you submit for full points.
- [x] In `readme.md`, check off the features you have completed in this unit by adding a ✅ emoji in front of the feature's name.
  - [x] Under each feature you have completed, include a GIF showing feature functionality.
- [x] In this document, complete all five questions in the **Reflection** section below.

## Reflection

### 1. What went well during this unit?
Our team successfully transitioned from planning and schema architecture into building core functional game loops and API integrations. Coordinating our feature ownership across (Game Loop), (Reveal Cards), (Similarity Meter & Missed Words), (Deck CRUD), and (Leaderboards & Auth) allowed us to develop components in parallel with minimal merge conflicts.

### 2. What were some challenges your group faced in this unit?
Managing precise state synchronization between the React frontend timers and backend API requests during the rapid-fire quiz sessions required careful handling. We had to ensure that clicking an answer correctly halted the countdown timer, recorded player state immediately, and triggered the word reveal modal smoothly without dropping state.

### 3. Did you finish all of your tasks in your sprint plan for this week? If you did not finish all of the planned tasks, how would you prioritize the remaining tasks on your list?
Yes, we completed our sprint goals for Unit 7, including setting up our GitHub project board, creating granular issues linked to our feature list, and configuring our GitHub Milestones with 100% completion for Milestone 3.

### 4. Which features and user stories would you consider “at risk”? How will you change your plan if those items remain “at risk”?
The stretch features involving cloud image uploads and advanced audio sound effect preloading carry minor risks due to browser autoplay policies and third-party storage configuration. If necessary, we will prioritize solidifying our core baseline and custom CRUD requirements before fine-tuning optional stretch assets.

### 5. What additional support will you need in upcoming units as you continue to work on your final project?
As we enter Milestone 4 and prepare for final deployment on Render, we will focus on rigorous end-to-end testing and ensuring our PostgreSQL database migrations and environment variables are provisioned.
