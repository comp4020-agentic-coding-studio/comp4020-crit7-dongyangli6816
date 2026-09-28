# Crit 7 reflection

## What was the breakthrough that moved the work forward?

Walking the real ISIS flow to its end instead of describing it from memory.
I had the agent click all the way to Save, and ISIS answered "The
transaction was not processed" with an internal error code. Then I added
what the screens couldn't show: a missing permission code or an unmet
prerequisite is refused at that same last step. That turned a vague "ISIS
is clunky" into one design rule: tell students whether they can take a
course before they press anything. Every card's verdict, the reasons naming
courses by title, and the permission-code notice all come from that rule.

## What did this work change about who I want to be as a software developer?

It showed me that a passing suite isn't the same as working software. Every
test was green while the enrol confirmation sometimes vanished, while the
week grid misread the timetable, and while README images failed in
production. Each was found by using the thing the way a student would:
clicking, tabbing, turning JavaScript off, opening the live site. I want to
be the developer who checks the surface people touch and asks what would
prove a check wrong before trusting it.

It also made me more deliberate about what I let an agent reach. I first
chose to connect it to my whole browser, then switched to a separate window
where I logged in myself once I saw that meant every tab. Deciding the
boundary is part of the work, not a setup step.
