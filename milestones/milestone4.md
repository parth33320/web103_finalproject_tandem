# Milestone 4

This document should be completed and submitted during **Unit 8** of this course. You **must** check off all completed tasks in this document in order to receive credit for your work.

## Checklist

This unit, be sure to complete all tasks listed below. To complete a task, place an `x` between the brackets.

- [x] Update the completion percentage of each GitHub Milestone. The milestone for this unit (Milestone 4 - Unit 8) should be 100% completed when you submit for full points.
- [x] In `readme.md`, check off the features you have completed in this unit by adding a ✅ emoji in front of the feature's name.
  - [x] Under each feature you have completed, include a GIF showing feature functionality.
- [x] In this document, complete all five questions in the **Reflection** section below.

## Reflection

### 1. What went well during this unit?

We successfully consolidated all our features into a single `tandem-app` directory and connected it to a live PostgreSQL database. Players can now authenticate using GitHub OAuth, which allowed us to build out personalized features. We added a community word pool where players can submit and vote on false friends, and a leaderboard separated by language direction. We also started saving wrong answers automatically to a personal trap list, which led to the creation of a really fun "practice mode" where players can master their hardest words.

### 2. What were some challenges your group faced in this unit?

Our biggest challenge was getting GitHub sign-in to work on Render. We kept getting a 500 error because our live database still had old tables from an earlier prototype. Even though the table names were the same, the columns were different, so the new data couldn't be saved. We fixed this by updating our server startup code to automatically move any old tables into a "legacy" schema and create fresh ones. We also had to handle Render's free tier going to sleep, so we added spinners and clear "server is waking up" messages to improve the user experience.

### Did you finish all of your tasks in your sprint plan for this week? If you did not finish all of the planned tasks, how would you prioritize the remaining tasks on your list?

Yes, we completed all the planned features for this sprint. What's left before the final submission is to redeploy with the new environment variables, re-record the feature GIFs to reflect the new app, and record the final walkthrough GIF. We will prioritize the deployment first, because every other step depends on the live app working smoothly.

### Which features and user stories would you consider “at risk”? How will you change your plan if those items remain “at risk”?

The main risk is the "dynamic frontend routes created with React Router" requirement, because our app uses TanStack Router instead. We are currently reaching out to our TA to confirm if this satisfies the rubric requirement. A smaller risk is the live deployment stability, since GitHub sign-in depends on the Render environment variables being set correctly. We will test the full sign-in flow on the live site after every deploy to ensure it doesn't break.

### 5. What additional support will you need in upcoming units as you continue to work on your final project?

We would like confirmation from a TA that TanStack Router satisfies the React Router requirement so we can plan accordingly. We would also appreciate feedback on our walkthrough GIF to ensure it clearly demonstrates every feature on the final rubric checklist.