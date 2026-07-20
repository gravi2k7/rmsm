# RMSM Enterprise Trading Platform

# RUNBOOK.md

> **Document Version:** 1.0
>
> **Platform Version:** v2.4.0
>
> **Status:** Current
>
> **Audience:** Operations, DevOps, Developers
>
> **Last Updated:** <<Update Date>>

---

# Table of Contents

1. Purpose
2. System Overview
3. Daily Operations
4. Service Startup
5. Service Shutdown
6. Health Checks
7. Monitoring
8. Log Management
9. Database Operations
10. Backup & Restore
11. Incident Response
12. Common Operational Procedures
13. Troubleshooting
14. Emergency Procedures
15. Recovery Procedures
16. Maintenance Windows
17. Operational Checklists
18. Contacts & Escalation

---

# 1. Purpose

This runbook provides operational procedures for managing the RMSM Enterprise Trading Platform in production.

Objectives:

- Standardize operational procedures
- Reduce incident resolution time
- Improve platform reliability
- Ensure consistent recovery procedures

---

# 2. System Overview

Applications

```text
Trader Web (Next.js)

↓

Enterprise API (NestJS)

↓

PostgreSQL Database

↓

Infrastructure
```

Supporting Components

- Authentication
- Logging
- Monitoring
- Database
- Docker
- Shared Packages

---

# 3. Daily Operations

Daily checklist:

- [ ] Platform accessible
- [ ] API healthy
- [ ] Database connected
- [ ] Authentication working
- [ ] Scheduled jobs completed
- [ ] Error logs reviewed
- [ ] Disk space checked
- [ ] Backup verified

---

# 4. Service Startup

Development

```bash
pnpm install

pnpm dev
```

Docker

```bash
docker compose up -d
```

Verify services:

```bash
docker compose ps
```

---

# 5. Service Shutdown

Graceful shutdown:

```bash
docker compose down
```

Verify services have stopped:

```bash
docker compose ps
```

---

# 6. Health Checks

Verify:

### API

- HTTP status
- Response time
- Authentication endpoint

### Database

- Connectivity
- Query response
- Migration status

### Frontend

- Dashboard loads
- Authentication works
- Navigation functions

---

# 7. Monitoring

Monitor:

## Application

- API availability
- Error rate
- Request latency

## Database

- Connections
- Slow queries
- Storage growth

## Infrastructure

- CPU
- Memory
- Disk
- Network

Recommended monitoring frequency:

- Critical services: Continuous
- Infrastructure: Every 5–15 minutes
- Daily operational review

---

# 8. Log Management

Review logs for:

- Authentication failures
- API errors
- Database errors
- Unexpected exceptions
- Performance warnings

Docker logs:

```bash
docker compose logs
```

Follow logs:

```bash
docker compose logs -f
```

---

# 9. Database Operations

Generate Prisma Client:

```bash
pnpm --filter @rmsm/database prisma generate
```

Run migrations:

```bash
pnpm --filter @rmsm/database prisma migrate deploy
```

Check migration status:

```bash
pnpm --filter @rmsm/database prisma migrate status
```

Database maintenance should always be performed during approved maintenance windows when changes may impact availability.

---

# 10. Backup & Restore

Database Backups

Recommended schedule:

- Daily full backup
- Periodic restore verification

Restore Procedure

1. Verify backup integrity.
2. Stop applications if required.
3. Restore database.
4. Validate schema and data.
5. Restart services.
6. Perform health checks.

---

# 11. Incident Response

Incident workflow:

```text
Alert

↓

Assess

↓

Contain

↓

Investigate

↓

Recover

↓

Validate

↓

Post-Incident Review
```

Severity Levels

| Level | Description |
|---------|-------------|
| P1 | Complete outage |
| P2 | Major functionality unavailable |
| P3 | Partial degradation |
| P4 | Minor issue |

---

# 12. Common Operational Procedures

## Restart Services

```bash
docker compose restart
```

## Rebuild Containers

```bash
docker compose up --build
```

## Reinstall Dependencies

```bash
pnpm install
```

## Validate Platform

```bash
pnpm lint

pnpm typecheck

pnpm test

pnpm build
```

---

# 13. Troubleshooting

## Application Does Not Start

Check:

- Environment variables
- Node.js version
- Dependencies
- Build output

---

## Database Connection Failed

Verify:

- PostgreSQL running
- DATABASE_URL
- Credentials
- Network connectivity

---

## Prisma Errors

Run:

```bash
pnpm --filter @rmsm/database prisma generate
```

Check:

- Schema
- Migration history
- Database status

---

## Docker Problems

```bash
docker compose down

docker compose up --build
```

---

## Authentication Problems

Verify:

- JWT secrets
- Token expiration
- Session storage
- API connectivity

---

# 14. Emergency Procedures

Examples:

- Complete service outage
- Database failure
- Security incident
- Infrastructure failure

General response:

1. Protect data.
2. Contain the issue.
3. Restore service safely.
4. Notify stakeholders.
5. Conduct post-incident review.

---

# 15. Recovery Procedures

Recovery checklist:

- [ ] Root cause identified
- [ ] Services restored
- [ ] Health checks passed
- [ ] Database verified
- [ ] Authentication verified
- [ ] Monitoring active
- [ ] Logs reviewed
- [ ] Incident documented

---

# 16. Maintenance Windows

Before maintenance:

- Notify users
- Verify backups
- Prepare rollback plan

During maintenance:

- Monitor logs
- Validate changes
- Record actions taken

After maintenance:

- Run health checks
- Verify critical workflows
- Close maintenance window

---

# 17. Operational Checklists

## Daily

- [ ] Health checks
- [ ] Logs reviewed
- [ ] Backups verified
- [ ] Monitoring healthy

## Weekly

- [ ] Dependency review
- [ ] Disk usage review
- [ ] Database maintenance
- [ ] Performance review

## Monthly

- [ ] Security review
- [ ] Backup restore test
- [ ] Documentation review
- [ ] Dependency updates

---

# 18. Contacts & Escalation

Document:

- Operations Team
- Development Team
- Database Administrator
- Infrastructure Team
- Security Team

Example escalation flow:

```text
Operations Engineer

↓

Senior Engineer

↓

Technical Lead

↓

Engineering Manager

↓

Executive Stakeholders (if required)
```

---

# Operational Principles

The RMSM platform should always prioritize:

- Availability
- Data Integrity
- Security
- Recoverability
- Observability
- Controlled Change Management

All operational changes should be documented, validated, and, where appropriate, performed during planned maintenance windows.

---

# Related Documents

- ARCHITECTURE.md
- DEPLOYMENT.md
- SECURITY.md
- API_GUIDELINES.md
- CONTRIBUTING.md

---

# Document History

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | <<Update Date>> | Initial operational runbook |