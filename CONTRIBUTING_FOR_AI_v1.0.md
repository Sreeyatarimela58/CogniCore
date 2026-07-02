# CONTRIBUTING_FOR_AI.md

**Version:** 1.0

## Purpose

This document defines mandatory rules for AI coding agents and
developers contributing to CogniCore.

## Source of Truth

1.  README.md
2.  ARCHITECTURE_HANDBOOK.md
3.  IMPLEMENTATION_GUIDE.md
4.  Current Phase LLD

If documentation conflicts, stop and request clarification.

## Locked Technology Stack

### Frontend

-   React
-   Vite
-   JavaScript (ES Modules)
-   Tailwind CSS
-   shadcn/ui
-   React Router
-   React Query

### Backend

-   Node.js
-   Express.js
-   JavaScript only

### Database

-   PostgreSQL
-   Prisma ORM

### AI

-   Provider abstraction
-   Embeddings
-   Hybrid Schema-Aware RAG

### Infrastructure

-   Redis
-   BullMQ
-   Docker

## Technologies NOT Allowed Without Approval

-   Python
-   Flask
-   FastAPI
-   Django
-   Java
-   .NET
-   Go
-   Rust
-   GraphQL
-   MongoDB
-   Any ORM other than Prisma

Node.js is the only backend runtime for V1.

## Approval Required Before

-   Adding libraries
-   Adding frameworks
-   Changing architecture
-   Creating new services
-   Adding databases
-   Changing APIs
-   Changing repository structure
-   Using external services

Never assume approval.

## Credentials

Never hardcode or invent:

-   Usernames
-   Passwords
-   API Keys
-   JWT Secrets
-   Database credentials
-   Redis passwords
-   LLM keys

Always use placeholders or environment variables.

## Security

-   Never commit secrets
-   Never expose credentials
-   Use environment variables
-   Follow least-privilege principles

## Repository Rules

-   Follow the approved folder structure.
-   Do not move folders without approval.
-   Implement only the current phase.
-   Do not build future-phase features early.

## Testing

Before marking work complete: - Build passes - Unit tests pass -
Integration tests pass - No console errors - Acceptance criteria
satisfied

## Communication

If anything is unclear:

STOP.

Request approval before proceeding.

Do not guess requirements.
