# StudyPilot

### An AI-Powered Study Planning Agent for Students

> **Hackathon:** Amazon Developer Hackathon\
> **Target tracks:** Alexa+ primary track and AWS Builder
> mini-challenge\
> **Project status:** React + Vite prototype; Supabase database
> connected; Google OAuth and AWS/agent integrations are still being
> configured or implemented.

StudyPilot helps students turn assignments, reports, daily Data
Structures and Algorithms (DSA) practice, and project deadlines into a
realistic, prioritized study plan. Rather than acting as only a static
to-do list, StudyPilot is designed to help students understand **what to
work on next, why it matters, and how to fit it into the time they
actually have**.

> **Status honesty:** The current frontend prototype is not proof that
> Amazon Bedrock, Strands, MCP, Alexa+, or AWS deployment is working.
> Those integrations are planned and should only be marked complete
> after implementation and testing.

## Table of Contents

-   [The Problem](#the-problem)
-   [Our Solution](#our-solution)
-   [Hackathon Theme and Track Fit](#hackathon-theme-and-track-fit)
-   [Features](#features)
-   [How It Works](#how-it-works)
-   [Planned Architecture](#planned-architecture)
-   [Technology Stack](#technology-stack)
-   [Agent Tools and MCP Design](#agent-tools-and-mcp-design)
-   [Security and Privacy](#security-and-privacy)
-   [Current Implementation Status](#current-implementation-status)
-   [Getting Started](#getting-started)
-   [Environment Configuration](#environment-configuration)
-   [Development Roadmap](#development-roadmap)
-   [Demo Scenario](#demo-scenario)
-   [Limitations and Responsible AI](#limitations-and-responsible-ai)
-   [Submission Checklist](#submission-checklist)

## The Problem

Students commonly balance college assignments, homework, reports, DSA
practice, project work, and revision. A basic to-do list can store
tasks, but it does not necessarily help students decide how to
distribute work across a limited week. A student may overlook a
deadline, spend too long on a low-priority task, or plan more study
hours than are actually available.

StudyPilot focuses on this planning gap by considering task deadlines,
importance, estimated effort, recurring goals, and available study time.

## Our Solution

StudyPilot is a student-focused planning application that turns task
information into an editable study plan. Students can add tasks, set
deadlines and importance, estimate the required effort, record recurring
goals, and specify available study hours. The **Analyze This Week**
workflow is designed to produce a prioritized plan that students can
review and edit.

The intended AI-enabled version adds an agent that explains its
recommendations and invokes controlled application tools to retrieve
tasks or save approved changes. The student remains in control of the
final schedule.

### Product goals

1.  **Prioritize realistically:** Consider urgency, importance, effort,
    and available time.
2.  **Explain recommendations:** Make priorities understandable rather
    than presenting an unexplained ranking.
3.  **Keep the student in control:** Let students review and edit a
    proposed plan before saving it.
4.  **Use real, authorized data:** Work with the signed-in student's own
    tasks and preferences.
5.  **Support agentic interaction:** Expose useful StudyPilot actions
    through tools, with MCP planned for the Alexa+ integration route.
6.  **Keep the experience simple:** Make planning quick and accessible
    through a clean, responsive interface.

## Hackathon Theme and Track Fit

StudyPilot is being developed for two hackathon goals. These are
intended integrations and must not be described as completed until they
have been implemented and tested against the current event rules.

### Alexa+ primary track --- planned MCP integration

The planned route is to expose StudyPilot capabilities through an MCP
server using the transport and authentication required by the current
hackathon rules. Candidate tools include retrieving tasks, generating a
proposed weekly plan, updating task progress, and saving an approved
plan. The server should be tested with the required Alexa+ integration
path; a local MCP server or standalone website alone does not prove that
the required integration works.

### AWS Builder mini-challenge --- planned AWS integration

The planned AWS implementation uses **Amazon Bedrock** for model
inference and the **Strands Agents SDK** to build the agent workflow.
The agent will use controlled tools to work with StudyPilot data. AWS
Lambda or Amazon Bedrock AgentCore may be evaluated for hosting after
the local end-to-end flow works; neither is represented as implemented
in the current prototype.

### Why an agent?

A deterministic planner can calculate priorities with explicit rules. An
agent can add natural-language interaction, explain trade-offs, and
choose among approved tools. The application must still validate
schedules and enforce authorization outside the model.

## Features

### Available in the current frontend prototype

-   Responsive React dashboard
-   Add, edit, and manage tasks
-   Task details such as title, category, importance, deadline, and
    estimated effort
-   Recurring goals and available-study-time controls
-   Progress tracking
-   Deterministic local planning/scoring workflow
-   Local browser persistence for prototype data
-   Exporting a plan
-   File-selection interface that queues file metadata only; it does
    **not** extract or analyze document contents

### Planned or still being completed

-   Google sign-in through Supabase Auth
-   Verified persistent reads and writes for all task and plan flows
-   Secure backend API
-   Amazon Bedrock model calls from a backend
-   Strands-powered StudyPilot agent
-   MCP server and required Alexa+ connectivity
-   Tool-based operations on authenticated user data
-   Deployment and end-to-end integration tests

## How It Works

The intended user journey is:

1.  **Sign in:** The student authenticates.
2.  **Add tasks:** Record assignments, DSA goals, projects, deadlines,
    importance, and estimated effort.
3.  **Set availability:** Specify the time available for studying.
4.  **Analyze the week:** Retrieve the student's tasks and generate a
    proposed schedule.
5.  **Review recommendations:** Display priorities and explanations.
6.  **Edit and approve:** Allow the student to adjust the proposed plan.
7.  **Save and track:** Persist the approved plan and task progress.

The existing deterministic planner can provide a predictable baseline.
The planned AI workflow should validate model-generated suggestions
against real task data and time constraints before displaying or saving
them.

## Planned Architecture

``` text
Student
  |
  v
React + Vite frontend
  |
  v
Secure backend API (planned: Python + FastAPI)
  |                         |
  |                         +--> Amazon Bedrock
  |                                  |
  |                                  v
  |                           Strands agent
  |                                  |
  |                                  v
  |                           Controlled tools
  |                                  |
  +--> Supabase Auth/DB <------------+
             ^
             |
      User-owned tasks,
      preferences and plans

MCP-compatible client
  |
  v
MCP server (planned, Streamable HTTP)
  |
  v
Approved StudyPilot tools
```

### Responsibilities

-   **React + Vite:** User interface, task editing, progress display,
    and plan review.
-   **Supabase Auth:** Authentication and session management.
-   **Supabase PostgreSQL:** Tasks, preferences, and saved plans,
    protected by Row Level Security (RLS).
-   **Backend API:** Verifies sessions, validates input, calls services
    securely, and applies access-control checks.
-   **Amazon Bedrock:** Access to a selected foundation model.
-   **Strands Agents SDK:** Coordinates agent/model interaction and tool
    calling.
-   **MCP server:** Exposes supported StudyPilot tools to a compatible
    client through the required transport.
-   **Optional hosting:** Lambda or AgentCore may be considered after
    the core flow has been tested.

The frontend must never call Bedrock using a secret key. AWS credentials
and Supabase service-role credentials must remain server-side or in a
suitable secret-management system.

## Technology Stack

  -----------------------------------------------------------------------
  Technology              Purpose                 Status
  ----------------------- ----------------------- -----------------------
  React                   Frontend UI             In current prototype

  Vite                    Development/build       In current prototype
                          tooling                 

  CSS                     Responsive styling      In current prototype

  JavaScript              Frontend logic          In current prototype

  Supabase Auth           Authentication and      Google OAuth
                          planned Google OAuth    setup/troubleshooting
                                                  may remain

  Supabase PostgreSQL     Application database    Connected according to
                                                  current project status

  Python + FastAPI        Backend API             Planned

  Amazon Bedrock          Model inference         Not yet confirmed
                                                  working

  Strands Agents SDK      Agent workflow          Not yet integrated

  MCP / Streamable HTTP   Planned tool interface  Not yet integrated
                          for Alexa+ route        

  AWS Lambda or Bedrock   Possible hosting        Optional; not yet
  AgentCore                                       selected/implemented
  -----------------------------------------------------------------------

Check current versions, model IDs, supported AWS Regions, permissions,
and pricing during implementation.

## Agent Tools and MCP Design

These are proposed tool contracts, not claims of existing functionality.

  ------------------------------------------------------------------------
  Tool                     Purpose                 Safety rule
  ------------------------ ----------------------- -----------------------
  `get_tasks`              Retrieve tasks for the  Do not accept an
                           authenticated user      arbitrary user ID as
                                                   proof of access

  `generate_weekly_plan`   Propose a schedule      Validate deadlines and
                           based on tasks and      time limits
                           available time          

  `create_task`            Create a task           Validate fields and
                                                   derive ownership from
                                                   the verified session

  `update_progress`        Update                  Check ownership and
                           completion/progress     valid state transitions

  `save_weekly_plan`       Persist a reviewed plan Authorize the write and
                                                   require user approval
                                                   where appropriate
  ------------------------------------------------------------------------

### Tool design principles

-   Derive user identity from a verified session or trusted server-side
    identity, not model-generated arguments.
-   Validate every input and output.
-   Give each tool the minimum permissions it needs.
-   Require confirmation for consequential writes where appropriate.
-   Log useful operational events without recording secrets or
    unnecessary personal data.
-   Return structured, concise tool results.

## Security and Privacy

StudyPilot may contain personal academic schedules and work details.
User isolation is a core requirement.

-   Use Supabase RLS so users can access only their own records.
-   Verify authenticated tokens in the backend.
-   Never expose the Supabase service-role key or AWS secret credentials
    in client code.
-   Use local environment files excluded by Git during development and a
    suitable secret manager or secure runtime configuration in
    production.
-   Send the model only the task details needed to create a plan.
-   Do not claim document parsing: the current file UI only queues
    metadata.
-   Provide clear error messages when the database, model, or agent is
    unavailable.

## Current Implementation Status

This section intentionally distinguishes what exists from what is
planned.

### Current

-   React + Vite frontend prototype
-   Task management and editable planning interface
-   Local deterministic planning logic
-   Supabase database connected
-   Google OAuth setup is being configured/troubleshot
-   Frontend can be deployed independently while AWS/backend work
    continues

### In progress or not confirmed complete

-   Successful Google sign-in
-   Fully verified, user-isolated task and plan persistence
-   Secure backend API
-   Successful Bedrock request from the backend
-   Strands agent and application tools
-   MCP server with required transport/authentication
-   Alexa+ integration test
-   AWS deployment and complete hackathon demo

Deploying the frontend is useful, but does not by itself demonstrate the
required AWS or Alexa+ functionality.

## Getting Started

### Prerequisites

-   Node.js and npm
-   StudyPilot source code
-   Supabase project and frontend URL/key
-   Python 3.10+ for the planned Python backend
-   AWS account with required permissions and model access for the
    AWS-enabled version

### Run the frontend

From the directory containing `package.json`:

``` bash
npm install
npm run dev
```

Open the local URL printed by Vite, commonly `http://localhost:5173`. If
commands fail, check the scripts in `package.json`.

### Backend setup (planned)

After the backend files and dependencies have actually been created, a
typical Python environment can be prepared with:

``` bash
cd backend
python -m venv .venv
```

Windows PowerShell:

``` powershell
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

Install dependencies from the backend's actual `requirements.txt` or
project configuration. The backend is not runnable until its entry
point, dependencies, environment variables, and endpoints have been
implemented and tested.

## Environment Configuration

Never commit real credentials. Use placeholders in documentation and
keep actual values in local environment files excluded by Git.

Example frontend environment variables:

``` env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use the public/publishable Supabase key intended for browser clients,
with RLS configured correctly. Never put a service-role key in a `VITE_`
variable.

Potential backend configuration (illustrative until the backend is
implemented):

``` env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SET_ONLY_IF_SERVER_SIDE_ACCESS_IS_REQUIRED
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=YOUR_AVAILABLE_MODEL_ID
```

Use a secure AWS credential mechanism appropriate to the environment.
Never commit API keys, client secrets, access keys, or service-role
credentials. Do not include secret values in screenshots, logs, or
public repositories.

### Google OAuth setup notes

For Google sign-in through Supabase:

1.  Create a Google OAuth Web application client in Google Cloud.
2.  Copy the exact Supabase Auth callback URL into Google's **Authorized
    redirect URIs**.
3.  Save the Google Client ID and Client Secret in Supabase's Google
    provider settings.
4.  Configure local and production redirect destinations in Supabase URL
    Configuration.
5.  Test sign-in on both local and deployed URLs.

A `redirect_uri_mismatch` error commonly means Google's authorized
redirect URI does not exactly match the callback URL used by Supabase.

## Development Roadmap

### Milestone 1 --- Stable prototype

-   Run the frontend locally.
-   Confirm task creation, editing, planning, and refresh behavior.
-   Confirm Supabase reads/writes use the authenticated user's data.
-   Fix Google OAuth and verify sign-in.

### Milestone 2 --- Bedrock proof of concept

-   Confirm AWS Console access and Bedrock model availability.
-   Make a successful model request from a local backend.
-   Keep credentials server-side.
-   Add error handling and a deterministic-planner fallback.

### Milestone 3 --- Agent and tools

-   Add Strands.
-   Implement and test `get_tasks` and `generate_weekly_plan`.
-   Add write tools only after authorization and validation are in
    place.
-   Validate generated plans against available hours and actual
    deadlines.

### Milestone 4 --- MCP and Alexa+ route

-   Expose approved tools through an MCP server.
-   Implement the exact transport and authentication required by current
    Alexa+ rules.
-   Test discovery, tool calls, validation, and failure cases.
-   Test with the required Alexa+ integration path.

### Milestone 5 --- Deployment and demo

-   Deploy the frontend and backend.
-   Configure production environment variables and redirect URLs.
-   Confirm HTTPS and access controls.
-   Run an end-to-end test with a test account.
-   Record a demo showing actual model/tool use and saved results.
-   Verify event requirements and deadlines against the official rules.

## Demo Scenario

A student has a DSA practice goal due today, an assignment due tomorrow,
a project due in seven days, and two hours available today.

A successful demo should show the student entering or selecting those
tasks, asking StudyPilot to analyze the week, receiving a schedule that
fits the available time, seeing explanations for the priorities, editing
the proposal, and saving the approved result.

For the AWS-enabled version, the demo should show or otherwise verify a
real Bedrock call and relevant tool calls. For the Alexa+ route,
demonstrate the actual required integration rather than only a
standalone dashboard.

## Limitations and Responsible AI

-   AI recommendations can be incorrect or impractical; validate them
    against task data and time limits.
-   Students should be able to review and edit recommendations.
-   Model output must never bypass database authorization.
-   Do not invent tasks, deadlines, course details, or progress.
-   If a model call fails, show a clear error or use the deterministic
    planner where appropriate.
-   The current file-selection UI does not parse document contents.
-   AWS integration, agent tools, and MCP/Alexa+ connectivity remain
    incomplete until implemented and tested.

## Submission Checklist

Before submitting, verify the current official hackathon rules and
record evidence of working integrations rather than relying only on
architecture diagrams.

-   [ ] Demo URL accessible to reviewers
-   [ ] README accurately reflects implemented features
-   [ ] Student problem and solution are clearly explained
-   [ ] Supabase authentication and user-isolated data work
-   [ ] Bedrock model invocation works, if claiming AWS Builder
    integration
-   [ ] Strands agent and tool calls work, if claimed
-   [ ] MCP server and required Alexa+ integration are tested, if
    claimed
-   [ ] Setup instructions work in a clean environment
-   [ ] No secrets are committed to the repository
-   [ ] Demo video/screenshots show the actual working product
-   [ ] Track eligibility and deadlines checked against official rules

## Project Summary

**StudyPilot is designed to help students make better use of limited
study time.** It combines an editable study planner with a planned agent
workflow that can explain priorities and perform controlled actions
through tools. The current prototype establishes the user experience;
the next milestones are secure backend integration, Amazon Bedrock and
Strands, and the required MCP/Alexa+ integration.

The guiding principle is simple: **AI should make the plan easier to
understand and act on, while the student stays in control.**
