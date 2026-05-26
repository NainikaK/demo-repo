# Phase 2 Build Guide: Copilot Studio Bot Setup

## Overview

This guide walks through creating the `SDLC Pipeline Bot` in Copilot Studio. The bot
collects a feature requirement from a Teams user, confirms the details, and calls the
Power Automate flow to create an ADO work item.

---

## Prerequisites

- Copilot Studio access in the **SDLC Bot** environment
- The **SDLC - Create ADO Work Item** Power Automate flow (from phase2-power-automate-flow.md)
  and its HTTP endpoint URL
- Basic familiarity with Copilot Studio topics and variables

---

## Section 1: Create the Bot

1. Open **Copilot Studio** (`https://copilotstudio.microsoft.com`)
2. Top right: select the **SDLC Bot** environment
3. Click **+ Create** → **New bot**
4. Name: `SDLC Pipeline Bot`
5. Description: "Collects software requirements and creates Azure DevOps work items"
6. Language: English
7. Click **Create**

The bot builder opens. You now have a default **Greeting** topic.

---

## Section 2: Configure the Greeting Topic

The Greeting topic is triggered when the user first opens the bot. It should welcome
the user but NOT ask intake questions (those go in a separate topic).

**Important:** The Greeting topic must have NO trigger phrases. It only triggers on
conversation start.

1. Click the **Greeting** topic
2. Under **Trigger phrases**, delete any default phrases
3. Leave the trigger phrase section empty
4. Edit the message text to:

```
Hi! I'm the SDLC Pipeline Bot. I help you create Azure DevOps work items for new
features and tasks. Just tell me what you'd like to build, and I'll handle the
work item creation for you.

What feature or task would you like to add?
```

5. **Recommended:** add a Route to Topics action to guide the user:
   - Click **+ Add node** → **Route to Topics**
   - Select or create a new topic: `CollectRequirement`

---

## Section 3: Create the CollectRequirement Topic

This topic asks the user to provide details about their feature request.

### 3.1: Create the Topic

1. Top left: click **+ New topic**
2. Name: `CollectRequirement`
3. Description: "Collects feature title, description, and type"
4. Click **Create**

### 3.2: Add Questions

The topic should ask the user three questions and store the answers as variables.

**Question 1: Title**

1. Click **+ Add node** → **Ask a question**
2. Question text: `What's the title of your feature or task?`
3. Variable name: `RequestTitle` (must be string type — see note below)
4. Type: Text input

**Question 2: Description**

1. Click **+ Add node** → **Ask a question**
2. Question text: `Please describe what you want to build. Include any acceptance criteria.`
3. Variable name: `RequestDescription` (string type)
4. Type: Text input (multiline)

**Question 3: Work Item Type**

1. Click **+ Add node** → **Ask a question**
2. Question text: `Is this a Feature or a User Story?`
3. Variable name: `RequestType` (string type — NOT choice type, see note below)
4. Type: Text input
   - **Recommended responses:** "Feature", "User Story"

### 3.3: Variable Type Note

**IMPORTANT:** All three variables must be **String** type, not Choice type.
Even though Question 3 has recommended responses ("Feature", "User Story"),
store the user's answer as a string. This ensures compatibility with the
Power Automate flow which expects string inputs.

---

## Section 4: Create the Confirmation Topic

Before submitting to ADO, confirm the details with the user.

### 4.1: Create the Topic

1. Top left: click **+ New topic**
2. Name: `ConfirmSubmission`
3. Description: "Confirms the requirement details before submission"
4. Click **Create**

### 4.2: Add Confirmation Message

1. Click **+ Add node** → **Message**
2. Edit the message to include the user's inputs:

```
Let me confirm the details:

**Title:** {RequestTitle}
**Description:** {RequestDescription}
**Type:** {RequestType}

Is this correct? Reply "yes" to create the work item, or "no" to start over.
```

(In Copilot Studio, replace `{RequestTitle}` with the variable reference syntax for your version, typically `@variables('RequestTitle')` or the visual picker.)

### 4.3: Add Conditional Logic

1. Click **+ Add node** → **Condition**
2. Set up the condition:
   - If user responds "yes" → proceed to flow action
   - Else → route back to `CollectRequirement` topic

---

## Section 5: Call the Power Automate Flow

Add an action to call the flow you created in phase2-power-automate-flow.md.

1. Click **+ Add node** → **Call an action**
2. Select **Call a flow** (or **Power Automate**)
3. Search for: `SDLC - Create ADO Work Item`
4. Select the flow
5. Configure the flow inputs:
   - **title:** `@variables('RequestTitle')`
   - **description:** `@variables('RequestDescription')`
   - **type:** `@variables('RequestType')`

6. Save the flow action

---

## Section 6: Handle the Flow Response

After the flow runs, confirm to the user that the work item was created.

1. Click **+ Add node** → **Message**
2. Message text:

```
✓ Work item created successfully!

Your request has been logged in Azure DevOps. The pipeline will automatically
review and implement it. You'll receive updates as progress is made.

Thank you for using SDLC Pipeline Bot!
```

---

## Section 7: Configure the Bot's Initial Response

Ensure the bot greets the user and then routes to the requirement collection.

1. In the **Greeting** topic, add a Route to Topics node that directs to `CollectRequirement`
2. Alternatively, use a simple message like "What feature would you like to create?" 
   that implicitly starts the collection flow

---

## Section 8: Publish the Bot

Before deploying to Teams, publish the bot to ensure all changes are saved.

1. Top right: click **Publish**
2. Review the changes
3. Click **Publish** to confirm

---

## Known Issues from Phase 2 Testing

### Issue 1: Output Variables Are Lowercase

**Problem:** When you reference flow outputs in Copilot Studio, the variable names
may be converted to lowercase automatically. For example, `workItemId` becomes
`workitemid`.

**Solution:** Be aware of this when building conditional logic. Test the flow
end-to-end to verify variable names in the response.

### Issue 2: Greeting Topic Timing

**Problem:** The Greeting topic sometimes doesn't trigger on conversation start if
the bot is already in memory (e.g., user opens it again).

**Solution:** Always have a primary topic (like `CollectRequirement`) that the
Greeting topic routes to. This ensures the conversation flow is consistent.

### Issue 3: Choice Questions Can Cause Type Mismatches

**Problem:** If Question 3 (Work Item Type) is configured as a Choice question,
Copilot Studio may store the selection as an object instead of a string, breaking
the Power Automate flow.

**Solution:** Keep Question 3 as a Text input with recommended responses shown.
The user's typed answer is stored as a string, compatible with the flow.

---

## Testing the Bot

### Local Testing (Within Copilot Studio)

1. Top right: click **Test bot**
2. Type: "Add dark mode toggle"
3. Wait for the bot to ask the follow-up questions
4. Answer each question
5. Confirm the details
6. The bot should call the flow and return a success message

### Teams Testing

After deploying to Teams (see phase2-teams-deployment.md):

1. Open Teams
2. Apps → `SDLC Pipeline Bot` → Open
3. Send a message: "Add a new dashboard"
4. Follow the conversation flow
5. Check Azure DevOps (`dev.azure.com/{ADO_ORG}/{ADO_PROJECT}`) for the new work item

---

## Topic Flow Diagram

```
[User opens bot]
        │
        ▼
Greeting Topic (no trigger phrases)
        │ (Route to Topics)
        ▼
CollectRequirement Topic
  • Ask title → store in RequestTitle
  • Ask description → store in RequestDescription
  • Ask type → store in RequestType
        │
        ▼
ConfirmSubmission Topic
  • Show confirmation with variable values
  • Ask: "Is this correct?"
        │
    Yes │ No
        │  └─────────────────────┐
        ▼                        │
Call Power Automate Flow         │
  (SDLC - Create ADO Work Item)  │
        │                        │
        ▼                        │
Success Message                 │
  (Work item created)          │
                                │
                    ┌───────────┘
                    │
                    ▼
            [Route back to CollectRequirement]
```

---

## Environment and Naming Notes

- **Environment:** Must be the same SDLC Bot environment where you created the Power Automate flow
- **Bot name:** `SDLC Pipeline Bot` — will appear in Teams as this name
- **Topics:** Use the exact names (Greeting, CollectRequirement, ConfirmSubmission) for clarity, but you can customize if needed
- **Variables:** Use string type for all user inputs, even for choice-like questions

---

*Last updated: 2026-05-26*
