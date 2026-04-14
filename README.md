# Radar Resilient Information Hub

Radar Resilient Information Hub is a cybersecurity and digital public infrastructure study focused on maintaining the integrity and accessibility of verified information during network volatility. The project is designed as a high-availability communication node and governance-aware community platform, with emphasis on data sovereignty and resilient African cyberspace outcomes.

## Why this project exists

In high-risk and low-stability environments, information failure is a security failure. During connectivity disruptions, censorship pressure, or rapid misinformation events, communities need systems that:

- remain available under unstable network conditions,
- preserve integrity of shared information,
- provide accountable moderation,
- and reduce dependence on centralized trust bottlenecks.

Radar is my applied systems response to that problem.

## Research framing

This project is positioned as a practical case study at the intersection of:

- cybersecurity engineering,
- digital public infrastructure,
- and data sovereignty in African contexts.

The work aligns with CMU-Africa style research themes around secure systems, trustworthy computing, and resilience under real-world constraints.

## Current implementation status

The repository currently implements:

- guest onboarding with JWT issuance,
- real-time room messaging over Socket.IO,
- private room password gating,
- moderator-aware delete permissions,
- message edit and reaction flows,
- browser-side media controls (mic/camera/screen share),
- and a community room interaction model.

The backend now also includes:

- persistent room/message state recovery across restarts,
- append-only hash-chained audit logging for moderation and policy events,
- and an audit integrity health endpoint at `/api/system/audit-health`.

This README intentionally distinguishes implemented behavior from planned extensions to keep claims auditable.

## System goals

Radar is being refined against three measurable goals:

1. Availability: maintain functional communication during churn and packet degradation.
2. Integrity: prevent or detect unauthorized modification/moderation actions.
3. Accountability: produce a transparent, reviewable moderation and governance trail.

## Architecture and security artifacts

The formal artifacts supporting admissions review are in [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md):

- threat model scope and assumptions,
- trust boundaries and adversary profiles,
- risk mapping and mitigations,
- architecture diagram (Mermaid).

Evaluation planning and benchmark criteria are in [docs/TEST_MATRIX.md](docs/TEST_MATRIX.md).

## Evaluation strategy

The evaluation package is designed to demonstrate engineering rigor, not only feature completion:

- functional verification (auth, room controls, moderation permissions),
- resilience experiments (network disruption, disconnect/reconnect, room churn),
- security abuse tests (token misuse, unauthorized actions, replay-like behavior),
- and evidence capture (logs, metrics, reproducible scripts).

### Reproducible resilience benchmark

From the `backend` folder:

```bash
npm run benchmark:resilience:quick
```

or full-duration run:

```bash
npm run benchmark:resilience
```

The script emits JSON summary metrics including:

- delivery success rate,
- p95 and p99 socket message latency,
- reconnect p95 under churn,
- and run metadata for traceability.

## Roadmap to research-grade maturity

1. Harden transport and access controls for production deployment.
2. Add persistent, integrity-preserving event logging.
3. Add fault-injection test harness and baseline metrics.
4. Add reproducible benchmark reports and deployment profile.
5. Validate claims with automated CI tests and documented limitations.

## Local setup

1. Clone repository.

```bash
git clone https://github.com/Swaph/Radar-Activism-Hub.git
cd Radar-Activism-Hub
```

2. Install backend dependencies.

```bash
cd backend
npm install
```

3. Install frontend dependencies and run app.

```bash
cd ../frontend
npm install
npm start
```

4. In a separate terminal, start backend.

```bash
cd ../backend
node server.js
```

## Evidence package checklist for admissions submission

- Updated technical README with explicit claims and limits.
- Threat model and architecture documentation.
- Test matrix with pass/fail criteria and benchmark targets.
- Short demo showing failure scenario and graceful recovery.
- Results summary mapping evidence to stated cybersecurity and DPI goals.

## License

MIT License.

